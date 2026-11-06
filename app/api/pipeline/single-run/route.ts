// app/api/pipeline/single-run/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runSayaAnalysis } from '@/app/api/ai/intelligence/agents/arbitrage';
import { runMarketTrend } from '@/app/api/ai/intelligence/agents/marketTrend';
import { runAccountAnalysis, runXAccountAnalysis } from '@/app/api/ai/intelligence/agents/snsAccount';
import { runCuratorSelection } from '@/app/api/ai/intelligence/agents/curator';
import { runSnsPosts, runXPosts } from '@/app/api/ai/intelligence/agents/contentCreator';
import { runSalesDM } from '@/app/api/ai/intelligence/agents/salesDM';
import { getTopShopUrlByGoogle } from '@/lib/market-fetcher/google-search';

function buildCleanSearchKeyword(cardName: string, cardNumber?: string): string {
  const cleanName = cardName.replace(/\s*[\(（].*?[\)）]/g, '').trim();
  if (cardNumber) return `${cleanName} ${cardNumber}`.trim();
  return cleanName;
}

function getTargetShop(shopName?: string): 'cardrush' | 'hareruya2' | 'torecacamp' {
  if (shopName?.includes('晴れる屋')) return 'hareruya2';
  if (shopName?.includes('キャンプ')) return 'torecacamp';
  return 'cardrush';
}

async function resolveIndividualEbayUrl(aiUrl: string | undefined, cardName: string, cardNumber?: string): Promise<string> {
  if (aiUrl && aiUrl.includes('/itm/')) {
    return aiUrl;
  }
  const kw = buildCleanSearchKeyword(cardName, cardNumber);
  try {
    const itemUrl = await getTopShopUrlByGoogle(`site:ebay.com/itm/ ${kw}`);
    if (itemUrl && itemUrl.includes('/itm/')) {
      return itemUrl;
    }
  } catch (err) {
    console.warn(`[eBay Resolver] 個別URL取得フォールバック:`, err);
  }
  return aiUrl || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(kw)}&LH_Sold=1&LH_Complete=1`;
}

export async function POST(req: Request) {
  try {
    const { cycleId, action, region, category } = await req.json();
    if (!cycleId || !action) {
      return NextResponse.json({ success: false, error: 'cycleId and action are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const effectiveCategory = category || 'pokemon';

    console.log(`\n==============================================`);
    console.log(`🎯 [Single AI Run] Action: ${action} | Region: ${region || 'none'} | Cycle: ${cycleId}`);
    console.log(`==============================================\n`);

    // ------------------------------------------------------------------------
    // 1. アービトラージアナリスト単独再実行 (US / EU / ASIA)
    // ------------------------------------------------------------------------
    if (action === 'arbitrage' && region) {
      const sayaReport = await runSayaAnalysis(region, effectiveCategory);
      
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
          // 🌟 安全ガード: slot が null または tiers がない場合はスキップ
          if (!slot || !slot.tiers) continue;

          let tiers: any[] = [];
          if (Array.isArray(slot.tiers)) {
            tiers = slot.tiers;
          } else if (typeof slot.tiers === 'object') {
            tiers = Object.values(slot.tiers);
          }

          for (const tier of tiers) {
            if (!tier) continue;

            // 本命
            if (tier.mainItem && tier.mainItem.cardName) {
              const main = tier.mainItem;
              const buy = parseInt(String(main.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
              const spread = parseInt(String(main.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
              const kw = buildCleanSearchKeyword(main.cardName, main.cardNumber);
              const targetShop = getTargetShop(main.jpShopName);
              const url = await getTopShopUrlByGoogle(kw, targetShop);
              const resolvedEbayUrl = await resolveIndividualEbayUrl(main.sourceEvidenceUrl, main.cardName, main.cardNumber);
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
                    jpShopName: main.jpShopName || '国内大手',
                    jpEvidenceUrl: url,
                    sourceEvidenceUrl: resolvedEbayUrl,
                    salesVolume7d: main.salesVolume7d || '',
                    salesVolume30d: main.salesVolume30d || '',
                  },
                  subItems: tier.subItems || [],
                  currentItem: {
                    ...main,
                    jpShopName: main.jpShopName || '国内大手',
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

            // 代替候補
            if (Array.isArray(tier.subItems)) {
              for (let sIdx = 0; sIdx < tier.subItems.length; sIdx++) {
                const sub = tier.subItems[sIdx];
                if (!sub || !sub.cardName) continue;
                const buy = parseInt(String(sub.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
                const spread = parseInt(String(sub.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
                const kw = buildCleanSearchKeyword(sub.cardName, sub.cardNumber);
                const subTargetShop = getTargetShop(sub.jpShopName);
                const url = await getTopShopUrlByGoogle(kw, subTargetShop);
                const resolvedSubEbayUrl = await resolveIndividualEbayUrl(sub.sourceEvidenceUrl, sub.cardName, sub.cardNumber);
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
                      jpShopName: sub.jpShopName || '国内大手',
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
    // 2. 市場トレンドアナリスト単独再実行 (US / EU / ASIA)
    // ------------------------------------------------------------------------
    if (action === 'trend' && region) {
      const trendReport = await runMarketTrend(region, effectiveCategory);
      await supabase
        .from('ai_research_items')
        .delete()
        .eq('cycle_id', cycleId)
        .eq('agent_key', 'trend')
        .eq('region', region);

      const researchRows: any[] = [];
      for (const hypo of trendReport?.hypotheses || []) {
        if (!hypo) continue;
        for (const item of hypo.items || []) {
          if (!item) continue;
          const buy = parseInt(String(item.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
          const match = String(item.currentLocalPrice || '').match(/約[¥￥]([0-9,]+)/);
          const targetJpy = match ? parseInt(match[1].replace(/,/g, '')) : Math.round(buy * 1.4);
          const spread = Math.max(0, targetJpy - buy);
          const url = await getTopShopUrlByGoogle(buildCleanSearchKeyword(item.cardName), 'cardrush');
          const resolvedTrendEbayUrl = await resolveIndividualEbayUrl(item.sourceEvidenceUrl, item.cardName);

          researchRows.push({
            cycle_id: cycleId,
            agent_key: 'trend',
            region,
            slot_key: hypo.headline || 'トレンド先行シグナル',
            price_tier: 'middle',
            card_name: item.cardName,
            condition_grade: item.condition || 'Raw NM',
            jp_buy_price_jpy: buy,
            target_sold_price_local: item.currentLocalPrice || '$0',
            target_sold_price_jpy: targetJpy,
            price_spread_jpy: spread,
            spread_roi_percent: buy > 0 ? Math.round((spread / buy) * 100) : 30,
            liquidity_indicator: hypo.timeframe || '約2週間後',
            research_insight: item.impactLogic || '',
            raw_payload: {
              ...item,
              reportSummary: trendReport?.summary,
              hypothesis: hypo,
              jpEvidenceUrl: url,
              sourceEvidenceUrl: resolvedTrendEbayUrl,
            },
            gate1_status: 'passed',
            is_selected: false,
          });
        }
      }

      if (researchRows.length > 0) {
        await supabase.from('ai_research_items').insert(researchRows);
      }
      return NextResponse.json({ success: true, message: `市場トレンド (${region.toUpperCase()}) を単独更新しました` });
    }

    // ------------------------------------------------------------------------
    // 3. Instagramアナリスト単独再実行
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
    // 4. Xアナリスト単独再実行
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
    // 5. チーフマネージャー（キュレーター選定）単独再実行
    // ------------------------------------------------------------------------
    if (action === 'chief') {
      const { data: candidates } = await supabase.from('ai_research_items').select('*').eq('cycle_id', cycleId);
      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId);
      const curationResult = await runCuratorSelection(candidates || [], tactics || [], effectiveCategory);

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
              assigned_day: daily.day,
              core_hook_fact: item.coreHookFact || daily.themeLabel,
              curator_rationale: item.rationale || daily.dayRationale,
            }).eq('id', matched.id);
          }
        }
      }
      return NextResponse.json({ success: true, message: 'チーフキュレーターの選定を単独更新しました' });
    }

    // ------------------------------------------------------------------------
    // 6. Instagramクリエイター（原稿）単独再生成
    // ------------------------------------------------------------------------
    if (action === 'sns') {
      const { data: items } = await supabase.from('ai_research_items').select('*').eq('cycle_id', cycleId).eq('is_selected', true);
      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId).eq('platform', 'instagram').single();
      const mvp = items?.find((i) => i.is_mvp) || items?.[0];
      const chiefPackage = { chosenCardOrItem: mvp?.card_name, mvpHighlight: mvp, approvedItems: items || [] };

      const snsPosts = await runSnsPosts(chiefPackage, tactics?.raw_insights, effectiveCategory);
      await supabase.from('ai_content_deliverables').update({ content_payload: snsPosts }).eq('cycle_id', cycleId).eq('platform', 'instagram');
      return NextResponse.json({ success: true, message: 'Instagram投稿原稿を単独再生成しました' });
    }

    // ------------------------------------------------------------------------
    // 7. Xクリエイター（スレッド）単独再生成
    // ------------------------------------------------------------------------
    if (action === 'x_posts' || action === 'x') {
      const { data: items } = await supabase.from('ai_research_items').select('*').eq('cycle_id', cycleId).eq('is_selected', true);
      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId).eq('platform', 'x').single();
      const mvp = items?.find((i) => i.is_mvp) || items?.[0];
      const chiefPackage = { chosenCardOrItem: mvp?.card_name, mvpHighlight: mvp, approvedItems: items || [] };

      const xPosts = await runXPosts(chiefPackage, tactics?.raw_insights, effectiveCategory);
      await supabase.from('ai_content_deliverables').update({ content_payload: xPosts }).eq('cycle_id', cycleId).eq('platform', 'x');
      return NextResponse.json({ success: true, message: 'Xスレッド原稿を単独再生成しました' });
    }

    // ------------------------------------------------------------------------
    // 8. コミュニティ営業 (Discord) 単独再生成
    // ------------------------------------------------------------------------
    if (action === 'sales') {
      const { data: items } = await supabase.from('ai_research_items').select('*').eq('cycle_id', cycleId).eq('is_selected', true);
      const mvp = items?.find((i) => i.is_mvp) || items?.[0];
      const chiefPackage = { chosenCardOrItem: mvp?.card_name, mvpHighlight: mvp, approvedItems: items || [] };

      const salesDM = await runSalesDM(chiefPackage);
      await supabase.from('ai_content_deliverables').update({ content_payload: salesDM }).eq('cycle_id', cycleId).eq('platform', 'discord');
      return NextResponse.json({ success: true, message: 'Discordオファーを単独再生成しました' });
    }

    return NextResponse.json({ success: false, error: '対応していないアクションです' }, { status: 400 });
  } catch (error: any) {
    console.error('[Single Run Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}