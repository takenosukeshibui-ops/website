// app/api/pipeline/single-run/route.ts
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runSayaAnalysis } from '@/app/api/ai/intelligence/agents/arbitrage';
import { runAccountAnalysis, runXAccountAnalysis } from '@/app/api/ai/intelligence/agents/snsAccount';
import { runCuratorSelection } from '@/app/api/ai/intelligence/agents/curator';
import { runSnsPosts, runXPosts, ALL_DAYS, ContentDay } from '@/app/api/ai/intelligence/agents/contentCreator';

function resolveTargetDay(rawDay?: string): ContentDay {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const candidate = (rawDay || days[new Date().getDay()]).trim();
  const found = ALL_DAYS.find((d) => d.toLowerCase() === candidate.toLowerCase());
  return found || 'Thursday';
}

function buildEntryKey(entry: any): string {
  const dayStr = String(entry?.day || '');
  const regionStr = entry?.region ? String(entry.region).toUpperCase() : '';
  return regionStr ? `${dayStr}__${regionStr}` : dayStr;
}

function mergeDeliverablePayload(
  existingPayload: any,
  generatedPayload: any,
  day: ContentDay,
  arrayKey: 'dailyPosts' | 'dailyThreads'
) {
  if (!generatedPayload) return existingPayload || null;
  const base = existingPayload && typeof existingPayload === 'object' ? { ...existingPayload } : {};
  const prevList: any[] = Array.isArray(base[arrayKey]) ? base[arrayKey] : [];
  const nextList: any[] = Array.isArray(generatedPayload[arrayKey]) ? generatedPayload[arrayKey] : [];

  const nextKeys = new Set(
    nextList.map((entry) => buildEntryKey({ ...entry, day: entry?.day || day }))
  );

  const filteredPrev = prevList.filter((entry) => {
    const key = buildEntryKey(entry);
    if (nextKeys.has(key)) return false;
    if (entry?.day === day && !entry?.region && nextList.some((n) => n?.region)) return false;
    return true;
  });

  const mergedList = [...filteredPrev, ...nextList];

  return {
    ...base,
    theme: generatedPayload.theme ?? base.theme ?? '',
    recommendedTiming: generatedPayload.recommendedTiming ?? base.recommendedTiming,
    hashtags: generatedPayload.hashtags ?? base.hashtags,
    xCallToAction: generatedPayload.xCallToAction ?? base.xCallToAction,
    [arrayKey]: mergedList,
  };
}

function buildRegionalDigest(items: any[], region: 'us' | 'eu') {
  const regionItems = items.filter((i) => String(i.region || '').toLowerCase() === region);
  const firstPayload = regionItems[0]?.raw_payload || {};
  return {
    region: region.toUpperCase(),
    exchangeRate: firstPayload.exchangeRate || null,
    summary: firstPayload.reportSummary || null,
    items: regionItems.slice(0, 12).map((i) => ({
      id: i.id,
      cardName: i.card_name,
      condition: i.condition_grade,
      buyJPY: i.jp_buy_price_jpy,
      targetSoldPriceLocal: i.target_sold_price_local,
      targetSoldPriceJPY: i.target_sold_price_jpy,
      spreadJPY: i.price_spread_jpy,
      roiPercent: i.spread_roi_percent,
      liquidity: i.liquidity_indicator,
      insight: i.research_insight,
      slotKey: i.slot_key,
      priceTier: i.price_tier,
      currentItem: i.raw_payload?.currentItem || i.raw_payload?.mainItem || null,
    })),
  };
}

function buildCleanSearchKeyword(cardName: string, cardNumber?: string): string {
  const cleanName = cardName.replace(/\s*[\(（].*?[\)）]/g, '').trim();
  if (!cardNumber) return cleanName;

  const trimmedNum = cardNumber.trim();
  if (
    cleanName.toUpperCase().includes(trimmedNum.toUpperCase()) ||
    (/^\d{3}$/.test(trimmedNum) && new RegExp(`\\b${trimmedNum}\\/`).test(cleanName))
  ) {
    return cleanName;
  }

  return `${cleanName} ${trimmedNum}`.trim();
}

function buildSafePokecazillaUrl(
  aiUrl: string | undefined,
  category: string,
  cardName: string,
  cardNumber?: string
): string {
  if (
    aiUrl &&
    (aiUrl.startsWith('https://pokecazilla.com/') || aiUrl.startsWith('https://torechart.com/'))
  ) {
    return aiUrl;
  }
  const categoryId = category === 'onepiece' ? 18 : 17;
  const domainPath = category === 'onepiece' ? 'onepiece' : 'pokemon';
  const query = (cardNumber || cardName).trim();
  return `https://pokecazilla.com/${domainPath}/products/list?category_id=${categoryId}&name=${encodeURIComponent(query)}`;
}

function resolveIndividualEbayUrl(aiUrl: string | undefined, cardName: string, cardNumber?: string): string {
  if (aiUrl && aiUrl.startsWith('http')) {
    return aiUrl;
  }
  const kw = buildCleanSearchKeyword(cardName, cardNumber);
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(kw)}&LH_Sold=1&LH_Complete=1`;
}

export async function POST(req: Request) {
  try {
    const { cycleId, action, region, category, targetDay: bodyTargetDay } = await req.json();
    if (!cycleId || !action) {
      return NextResponse.json({ success: false, error: 'cycleId and action are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const effectiveCategory = category || 'pokemon';
    const targetDay = resolveTargetDay(bodyTargetDay);
    const isSundayDigest = targetDay === 'Sunday';
    const isMondayServiceGuide = targetDay === 'Monday';

    console.log(`\n==============================================`);
    console.log(`🎯 [Single AI Run] Action: ${action} | Region: ${region || 'none'} | Day: ${targetDay} | Cycle: ${cycleId}`);
    console.log(`==============================================\n`);

    // ------------------------------------------------------------------------
    // 1. アービトラージアナリスト単独再実行 (US / EU / ASIA)
    // ------------------------------------------------------------------------
    if (action === 'arbitrage' && region) {
      const sayaReport = await runSayaAnalysis(region, effectiveCategory, targetDay);

      await supabase
        .from('ai_research_items')
        .delete()
        .eq('cycle_id', cycleId)
        .eq('agent_key', 'arbitrage')
        .eq('region', region);

      const researchRows: any[] = [];
      const platformDefault = region === 'us' ? 'eBay US / TCGplayer' : region === 'eu' ? 'Cardmarket' : 'Shopee';

      if (sayaReport?.slots && Array.isArray(sayaReport.slots)) {
        for (const slot of sayaReport.slots) {
          if (!slot || !slot.tiers) continue;

          let tiers: any[] = [];
          if (Array.isArray(slot.tiers)) {
            tiers = slot.tiers;
          } else if (slot.tiers && typeof slot.tiers === 'object') {
            tiers = Object.values(slot.tiers);
          }

          for (const tier of tiers) {
            if (!tier) continue;

            if (tier.mainItem && tier.mainItem.cardName) {
              const main = tier.mainItem;
              const buy = parseInt(String(main.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
              const spread = parseInt(String(main.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
              const kw = buildCleanSearchKeyword(main.cardName, main.cardNumber);
              const url = buildSafePokecazillaUrl(main.jpEvidenceUrl, effectiveCategory, main.cardName, main.cardNumber);
              const resolvedEbayUrl = resolveIndividualEbayUrl(main.sourceEvidenceUrl, main.cardName, main.cardNumber);
              const liquidityStr = `7日: ${main.salesVolume7d || '確認中'} / 30日: ${main.salesVolume30d || '1件以上'}`;

              researchRows.push({
                cycle_id: cycleId,
                agent_key: 'arbitrage',
                region,
                slot_key: slot.slotKey || 'arbitrage_slot',
                price_tier: tier.priceTier || 'middle',
                card_name: kw,
                condition_grade: main.conditionGrade || 'Raw NM',
                jp_buy_price_jpy: buy,
                target_sold_price_local: main.targetSoldPrice || '$0',
                target_sold_price_jpy: buy + spread,
                price_spread_jpy: spread,
                spread_roi_percent: buy > 0 ? Math.round((spread / buy) * 100) : 30,
                liquidity_indicator: liquidityStr,
                research_insight: main.insight || '',
                raw_payload: {
                  priceTier: tier.priceTier,
                  priceTierLabel: tier.priceTierLabel,
                  slotKey: slot.slotKey,
                  slotLabel: slot.slotLabel,
                  isMain: true,
                  role: '本命',
                  mainItem: {
                    ...main,
                    jpShopName: main.jpShopName || 'ポケカジラ最安値比較',
                    jpEvidenceUrl: url,
                    sourceEvidenceUrl: resolvedEbayUrl,
                    salesVolume7d: main.salesVolume7d || '',
                    salesVolume30d: main.salesVolume30d || '',
                  },
                  subItems: tier.subItems || [],
                  currentItem: {
                    ...main,
                    jpShopName: main.jpShopName || 'ポケカジラ最安値比較',
                    jpEvidenceUrl: url,
                    sourceEvidenceUrl: resolvedEbayUrl,
                    salesVolume7d: main.salesVolume7d || '',
                    salesVolume30d: main.salesVolume30d || '',
                  },
                  jpEvidenceUrl: url,
                  sourcePlatform: main.sourcePlatform || platformDefault,
                  evidenceNote: main.evidenceNote || '成約実績基準',
                  sourceEvidenceUrl: resolvedEbayUrl,
                  exchangeRate: sayaReport.exchangeRate,
                  reportSummary: sayaReport.summary,
                },
                gate1_status: 'passed',
                is_selected: false,
              });
            }

            if (Array.isArray(tier.subItems)) {
              for (let sIdx = 0; sIdx < tier.subItems.length; sIdx++) {
                const sub = tier.subItems[sIdx];
                if (!sub || !sub.cardName) continue;
                const buy = parseInt(String(sub.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
                const spread = parseInt(String(sub.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
                const kw = buildCleanSearchKeyword(sub.cardName, sub.cardNumber);
                const url = buildSafePokecazillaUrl(sub.jpEvidenceUrl, effectiveCategory, sub.cardName, sub.cardNumber);
                const resolvedSubEbayUrl = resolveIndividualEbayUrl(sub.sourceEvidenceUrl, sub.cardName, sub.cardNumber);
                const subLiquidityStr = `7日: ${sub.salesVolume7d || '確認中'} / 30日: ${sub.salesVolume30d || '1件以上'}`;

                researchRows.push({
                  cycle_id: cycleId,
                  agent_key: 'arbitrage',
                  region,
                  slot_key: slot.slotKey || 'arbitrage_slot',
                  price_tier: tier.priceTier || 'middle',
                  card_name: kw,
                  condition_grade: sub.conditionGrade || 'Raw NM',
                  jp_buy_price_jpy: buy,
                  target_sold_price_local: sub.targetSoldPrice || '$0',
                  target_sold_price_jpy: buy + spread,
                  price_spread_jpy: spread,
                  spread_roi_percent: buy > 0 ? Math.round((spread / buy) * 100) : 30,
                  liquidity_indicator: subLiquidityStr,
                  research_insight: sub.insight || '',
                  raw_payload: {
                    priceTier: tier.priceTier,
                    priceTierLabel: tier.priceTierLabel,
                    slotKey: slot.slotKey,
                    slotLabel: slot.slotLabel,
                    isMain: false,
                    role: `候補${sIdx + 2}`,
                    currentItem: {
                      ...sub,
                      jpShopName: sub.jpShopName || 'ポケカジラ最安値比較',
                      jpEvidenceUrl: url,
                      sourceEvidenceUrl: resolvedSubEbayUrl,
                      salesVolume7d: sub.salesVolume7d || '',
                      salesVolume30d: sub.salesVolume30d || '',
                    },
                    jpEvidenceUrl: url,
                    sourcePlatform: sub.sourcePlatform || platformDefault,
                    evidenceNote: sub.evidenceNote || '成約実績基準',
                    sourceEvidenceUrl: resolvedSubEbayUrl,
                    exchangeRate: sayaReport.exchangeRate,
                    reportSummary: sayaReport.summary,
                  },
                  gate1_status: 'passed',
                  is_selected: false,
                });
              }
            }
          }
        }
      }

      if (researchRows.length > 0) {
        await supabase.from('ai_research_items').insert(researchRows);
      }
      return NextResponse.json({ success: true, message: `アービトラージ (${region.toUpperCase()}) を単独更新しました` });
    }

    // ------------------------------------------------------------------------
    // 2. Instagramアナリスト単独再実行
    // ------------------------------------------------------------------------
    if (action === 'account') {
      const igTactics = await runAccountAnalysis(effectiveCategory);
      await supabase.from('ai_platform_tactics').upsert({
        cycle_id: cycleId,
        platform: 'instagram',
        recommended_timing: igTactics?.facts?.[1]?.value || '日本時間 21:00',
        hook_guidelines: igTactics?.soWhat || '3秒フック',
        structure_blueprint: igTactics?.curatorDirectives || {},
        raw_insights: igTactics || {},
      }, { onConflict: 'cycle_id,platform' });
      return NextResponse.json({ success: true, message: 'Instagramアナリスト分析を単独更新しました' });
    }

    // ------------------------------------------------------------------------
    // 3. Xアナリスト単独再実行
    // ------------------------------------------------------------------------
    if (action === 'x_account') {
      const xTactics = await runXAccountAnalysis();
      await supabase.from('ai_platform_tactics').upsert({
        cycle_id: cycleId,
        platform: 'x',
        recommended_timing: xTactics?.facts?.[2]?.value || '日本時間 20:00',
        hook_guidelines: '140字フック',
        structure_blueprint: xTactics?.curatorDirectives || {},
        raw_insights: xTactics || {},
      }, { onConflict: 'cycle_id,platform' });
      return NextResponse.json({ success: true, message: 'Xアナリスト分析を単独更新しました' });
    }

    // ------------------------------------------------------------------------
    // 4. チーフマネージャー（キュレーター選定）単独再実行
    // ------------------------------------------------------------------------
    if (action === 'chief') {
      const { data: candidates } = await supabase.from('ai_research_items').select('*').eq('cycle_id', cycleId);
      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId);
      const curationResult = await runCuratorSelection(
        candidates || [],
        tactics || [],
        effectiveCategory,
        targetDay
      );

      await supabase.from('ai_research_items').update({ is_selected: false, is_mvp: false, assigned_day: null }).eq('cycle_id', cycleId);

      for (const daily of curationResult?.weeklyLineup || []) {
        if (!daily) continue;
        for (const item of daily.items || []) {
          if (!item) continue;
          const anyItem = item as any;
          const matched = candidates?.find(
            (c: any) => c.id === item.itemId || (anyItem.cardName && c.card_name?.includes(anyItem.cardName))
          );
          if (matched) {
            await supabase.from('ai_research_items').update({
              is_selected: true,
              is_mvp: Boolean(item.isMvp) || matched.id === curationResult?.mvpItemId,
              assigned_day: targetDay,
              core_hook_fact: item.coreHookFact || daily.themeLabel,
              curator_rationale: item.rationale || daily.dayRationale,
            }).eq('id', matched.id);
          }
        }
      }
      return NextResponse.json({ success: true, message: 'チーフキュレーターの選定を単独更新しました' });
    }

    // ------------------------------------------------------------------------
    // 5. Instagramクリエイター（US/EU 2投稿）単独再生成
    // ------------------------------------------------------------------------
    if (action === 'sns') {
      const { data: allCycleItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('agent_key', 'arbitrage');

      const cycleItems = allCycleItems || [];
      const items = cycleItems.filter((i) => i.is_selected);
      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId).eq('platform', 'instagram').single();

      let weeklyDigestItems: any[] = [];
      if (isSundayDigest) {
        const { data: recentSelected } = await supabase
          .from('ai_research_items')
          .select('*')
          .eq('agent_key', 'arbitrage')
          .eq('is_selected', true)
          .order('created_at', { ascending: false })
          .limit(15);
        weeklyDigestItems = recentSelected || [];
      }

      const mvp = items?.find((i) => i.is_mvp) || items?.[0] || weeklyDigestItems?.[0];
      const chiefPackage = {
        targetDay,
        mode: isSundayDigest ? 'weekly_digest' : isMondayServiceGuide ? 'proxy_service_guide' : 'daily_dual_region_arbitrage',
        chosenCardOrItem: mvp?.card_name || (isMondayServiceGuide ? 'Japan Proxy Sourcing Service' : '注目カード'),
        mvpHighlight: mvp || {},
        approvedItems: items || [],
        regionalReports: {
          us: buildRegionalDigest(cycleItems, 'us'),
          eu: buildRegionalDigest(cycleItems, 'eu'),
        },
        weeklyDigestItems,
      };

      const snsPosts = await runSnsPosts(chiefPackage, tactics?.raw_insights, effectiveCategory, targetDay);
      const { data: existingIg } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('platform', 'instagram')
        .single();

      const mergedPayload = mergeDeliverablePayload(existingIg?.content_payload, snsPosts, targetDay, 'dailyPosts');

      if (existingIg) {
        await supabase
          .from('ai_content_deliverables')
          .update({ content_payload: mergedPayload, day_of_week: targetDay })
          .eq('id', existingIg.id);
      } else {
        await supabase.from('ai_content_deliverables').insert({
          cycle_id: cycleId,
          research_item_id: mvp?.id || null,
          platform: 'instagram',
          post_type: isSundayDigest ? 'weekly_digest' : isMondayServiceGuide ? 'service_guide' : 'carousel',
          day_of_week: targetDay,
          content_payload: mergedPayload,
          status: 'pending',
          gate2_status: 'pending',
        });
      }

      return NextResponse.json({ success: true, message: `Instagram投稿原稿 (${targetDay} US/EU) を単独再生成しました` });
    }

    // ------------------------------------------------------------------------
    // 6. Xクリエイター（US/EU 2スレッド）単独再生成
    // ------------------------------------------------------------------------
    if (action === 'x_posts' || action === 'x') {
      const { data: allCycleItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('agent_key', 'arbitrage');

      const cycleItems = allCycleItems || [];
      const items = cycleItems.filter((i) => i.is_selected);
      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId).eq('platform', 'x').single();

      let weeklyDigestItems: any[] = [];
      if (isSundayDigest) {
        const { data: recentSelected } = await supabase
          .from('ai_research_items')
          .select('*')
          .eq('agent_key', 'arbitrage')
          .eq('is_selected', true)
          .order('created_at', { ascending: false })
          .limit(15);
        weeklyDigestItems = recentSelected || [];
      }

      const mvp = items?.find((i) => i.is_mvp) || items?.[0] || weeklyDigestItems?.[0];
      const chiefPackage = {
        targetDay,
        mode: isSundayDigest ? 'weekly_digest' : isMondayServiceGuide ? 'proxy_service_guide' : 'daily_dual_region_arbitrage',
        chosenCardOrItem: mvp?.card_name || (isMondayServiceGuide ? 'Japan Proxy Sourcing Service' : '注目カード'),
        mvpHighlight: mvp || {},
        approvedItems: items || [],
        regionalReports: {
          us: buildRegionalDigest(cycleItems, 'us'),
          eu: buildRegionalDigest(cycleItems, 'eu'),
        },
        weeklyDigestItems,
      };

      const xPosts = await runXPosts(chiefPackage, tactics?.raw_insights, effectiveCategory, targetDay);
      const { data: existingX } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('platform', 'x')
        .single();

      const mergedPayload = mergeDeliverablePayload(existingX?.content_payload, xPosts, targetDay, 'dailyThreads');

      if (existingX) {
        await supabase
          .from('ai_content_deliverables')
          .update({ content_payload: mergedPayload, day_of_week: targetDay })
          .eq('id', existingX.id);
      } else {
        await supabase.from('ai_content_deliverables').insert({
          cycle_id: cycleId,
          research_item_id: mvp?.id || null,
          platform: 'x',
          post_type: isSundayDigest ? 'weekly_digest_thread' : isMondayServiceGuide ? 'service_guide_thread' : 'thread',
          day_of_week: targetDay,
          content_payload: mergedPayload,
          status: 'pending',
          gate2_status: 'pending',
        });
      }

      return NextResponse.json({ success: true, message: `Xスレッド原稿 (${targetDay} US/EU) を単独再生成しました` });
    }

    return NextResponse.json({ success: false, error: '対応していないアクションです' }, { status: 400 });
  } catch (error: any) {
    console.error('[Single Run Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}