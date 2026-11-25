// app/api/pipeline/worker/route.ts
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runSayaAnalysis } from '@/app/api/ai/intelligence/agents/arbitrage';
import { runAccountAnalysis, runXAccountAnalysis } from '@/app/api/ai/intelligence/agents/snsAccount';
import { runCuratorSelection } from '@/app/api/ai/intelligence/agents/curator';
import { runGate1Audit } from '@/app/api/pipeline/gates/gate1';
import { runSnsPosts, runXPosts, ALL_DAYS, ContentDay } from '@/app/api/ai/intelligence/agents/contentCreator';
import { runGate2Audit } from '@/app/api/pipeline/gates/gate2';

function resolveTargetDay(rawDay?: string): ContentDay {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const candidate = (rawDay || days[new Date().getDay()]).trim();
  const found = ALL_DAYS.find((d) => d.toLowerCase() === candidate.toLowerCase());
  return found || 'Thursday';
}

function mergeDeliverablePayload(existingPayload: any, generatedPayload: any, day: ContentDay, arrayKey: 'dailyPosts' | 'dailyThreads') {
  if (!generatedPayload) return existingPayload || null;
  const base = existingPayload && typeof existingPayload === 'object' ? { ...existingPayload } : {};
  const prevList: any[] = Array.isArray(base[arrayKey]) ? base[arrayKey] : [];
  const nextList: any[] = Array.isArray(generatedPayload[arrayKey]) ? generatedPayload[arrayKey] : [];

  const filteredPrev = prevList.filter((entry) => entry?.day !== day);
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
  if (aiUrl && aiUrl.startsWith('https://pokecazilla.com/')) {
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

// ============================================================================
// 共通ヘルパー: 地域別リサーチ結果のパースとDB登録＆API検証
// ============================================================================
async function processAndSaveRegionResearch(
  supabase: any,
  cycleId: string,
  category: string,
  region: 'us' | 'eu' | 'asia',
  sayaReport: any
) {
  const researchRows: any[] = [];
  const platformDefault =
    region === 'us'
      ? 'eBay US / TCGplayer'
      : region === 'eu'
      ? 'Cardmarket / eBay DE'
      : 'Shopee / Carousell';

  if (sayaReport?.slots && Array.isArray(sayaReport.slots)) {
    for (const slot of sayaReport.slots) {
      if (!slot) continue;
      let tiers: any[] = [];
      if (Array.isArray(slot.tiers)) {
        tiers = slot.tiers;
      } else if (slot.tiers && typeof slot.tiers === 'object') {
        tiers = Object.values(slot.tiers);
      }

      for (const tier of tiers) {
        if (tier?.mainItem && tier.mainItem.cardName) {
          const mainItem = tier.mainItem;
          const buy = parseInt(String(mainItem.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
          const spread = parseInt(String(mainItem.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
          const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

          const searchKeyword = buildCleanSearchKeyword(mainItem.cardName, mainItem.cardNumber);
          const mainEvidenceUrl = buildSafePokecazillaUrl(
            mainItem.jpEvidenceUrl,
            category,
            mainItem.cardName,
            mainItem.cardNumber
          );
          mainItem.jpEvidenceUrl = mainEvidenceUrl;

          const resolvedEbayUrl = resolveIndividualEbayUrl(
            mainItem.sourceEvidenceUrl,
            mainItem.cardName,
            mainItem.cardNumber
          );
          mainItem.sourceEvidenceUrl = resolvedEbayUrl;

          const liquidityStr = `7日: ${mainItem.salesVolume7d || '確認中'} / 30日: ${mainItem.salesVolume30d || '1件以上'}`;

          researchRows.push({
            cycle_id: cycleId,
            agent_key: 'arbitrage',
            region,
            slot_key: slot.slotKey || 'arbitrage_slot',
            price_tier: tier.priceTier || 'middle',
            card_name: searchKeyword,
            condition_grade: mainItem.conditionGrade || 'Raw NM',
            jp_buy_price_jpy: buy,
            target_sold_price_local: mainItem.targetSoldPrice || '$0',
            target_sold_price_jpy: buy + spread,
            price_spread_jpy: spread,
            spread_roi_percent: roi,
            liquidity_indicator: liquidityStr,
            research_insight: mainItem.insight || '',
            raw_payload: {
              priceTier: tier.priceTier,
              priceTierLabel: tier.priceTierLabel,
              slotKey: slot.slotKey,
              slotLabel: slot.slotLabel,
              isMain: true,
              role: '本命',
              mainItem: {
                ...mainItem,
                jpShopName: mainItem.jpShopName || 'ポケカジラ最安値比較',
                jpEvidenceUrl: mainEvidenceUrl,
                sourceEvidenceUrl: resolvedEbayUrl,
                salesVolume7d: mainItem.salesVolume7d || '',
                salesVolume30d: mainItem.salesVolume30d || '',
              },
              subItems: tier.subItems || [],
              currentItem: {
                ...mainItem,
                jpShopName: mainItem.jpShopName || 'ポケカジラ最安値比較',
                jpEvidenceUrl: mainEvidenceUrl,
                sourceEvidenceUrl: resolvedEbayUrl,
                salesVolume7d: mainItem.salesVolume7d || '',
                salesVolume30d: mainItem.salesVolume30d || '',
              },
              jpEvidenceUrl: mainEvidenceUrl,
              sourcePlatform: mainItem.sourcePlatform || platformDefault,
              evidenceNote: mainItem.evidenceNote || '成約実績基準',
              sourceEvidenceUrl: resolvedEbayUrl,
              exchangeRate: sayaReport.exchangeRate,
              reportSummary: sayaReport.summary,
            },
            gate1_status: 'pending',
            is_selected: false,
          });
        }

        if (Array.isArray(tier?.subItems)) {
          for (let sIdx = 0; sIdx < tier.subItems.length; sIdx++) {
            const subItem = tier.subItems[sIdx];
            if (!subItem || !subItem.cardName) continue;
            const buy = parseInt(String(subItem.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
            const spread = parseInt(String(subItem.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
            const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

            const subKeyword = buildCleanSearchKeyword(subItem.cardName, subItem.cardNumber);
            const subEvidenceUrl = buildSafePokecazillaUrl(
              subItem.jpEvidenceUrl,
              category,
              subItem.cardName,
              subItem.cardNumber
            );
            subItem.jpEvidenceUrl = subEvidenceUrl;

            const resolvedSubEbayUrl = resolveIndividualEbayUrl(
              subItem.sourceEvidenceUrl,
              subItem.cardName,
              subItem.cardNumber
            );
            subItem.sourceEvidenceUrl = resolvedSubEbayUrl;

            const subLiquidityStr = `7日: ${subItem.salesVolume7d || '確認中'} / 30日: ${subItem.salesVolume30d || '1件以上'}`;

            researchRows.push({
              cycle_id: cycleId,
              agent_key: 'arbitrage',
              region,
              slot_key: slot.slotKey || 'arbitrage_slot',
              price_tier: tier.priceTier || 'middle',
              card_name: subKeyword,
              condition_grade: subItem.conditionGrade || 'Raw NM',
              jp_buy_price_jpy: buy,
              target_sold_price_local: subItem.targetSoldPrice || '$0',
              target_sold_price_jpy: buy + spread,
              price_spread_jpy: spread,
              spread_roi_percent: roi,
              liquidity_indicator: subLiquidityStr,
              research_insight: subItem.insight || '',
              raw_payload: {
                priceTier: tier.priceTier,
                priceTierLabel: tier.priceTierLabel,
                slotKey: slot.slotKey,
                slotLabel: slot.slotLabel,
                isMain: false,
                role: `候補${sIdx + 2}`,
                currentItem: {
                  ...subItem,
                  jpShopName: subItem.jpShopName || 'ポケカジラ最安値比較',
                  jpEvidenceUrl: subEvidenceUrl,
                  sourceEvidenceUrl: resolvedSubEbayUrl,
                  salesVolume7d: subItem.salesVolume7d || '',
                  salesVolume30d: subItem.salesVolume30d || '',
                },
                jpEvidenceUrl: subEvidenceUrl,
                sourcePlatform: subItem.sourcePlatform || platformDefault,
                evidenceNote: subItem.evidenceNote || '成約実績基準',
                sourceEvidenceUrl: resolvedSubEbayUrl,
                exchangeRate: sayaReport.exchangeRate,
                reportSummary: sayaReport.summary,
              },
              gate1_status: 'pending',
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
}

// ============================================================================
// メインハンドラー
// ============================================================================
export async function POST(req: Request) {
  const supabase = await createClient();
  const { cycleId, action, targetDay: bodyTargetDay } = await req.json().catch(() => ({}));

  if (!cycleId) {
    return NextResponse.json({ success: false, error: 'cycleId is required' }, { status: 400 });
  }

  const targetDay = resolveTargetDay(bodyTargetDay);
  const isSundayDigest = targetDay === 'Sunday';
  const isMondayServiceGuide = targetDay === 'Monday';
  const shouldRunArbitrageResearch = !isSundayDigest && !isMondayServiceGuide;

  if (action === 'stop') {
    await supabase.from('ai_pipeline_cycles').update({ status: 'partially_failed' }).eq('id', cycleId);
    return NextResponse.json({ success: true, message: 'Pipeline stopped' });
  }

  const { data: cycle, error: cycleErr } = await supabase
    .from('ai_pipeline_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  if (cycleErr || !cycle) {
    console.error(`[Worker] Cycle ${cycleId} not found`);
    return NextResponse.json({ success: false, error: 'Cycle not found' }, { status: 404 });
  }

  console.log(`\n==============================================`);
  console.log(`🚀 [Worker Started] Cycle: ${cycleId} | Status: ${cycle.status} | Target Day: ${targetDay}`);
  console.log(`==============================================\n`);

  const dispatchNext = () => {
    console.log(`📡 [Worker] フェーズ完了。次のステップへ進みます (Cycle: ${cycleId})`);
  };

  try {
    // Phase 1-A: 北米リサーチ（日曜まとめ・月曜サービス解説時はスキップして次へ）
    if (cycle.status === 'initialized' || cycle.status === 'researching') {
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching_us' as any }).eq('id', cycleId);
      const [igTactics, sayaUS] = await Promise.all([
        runAccountAnalysis(cycle.category),
        shouldRunArbitrageResearch
          ? runSayaAnalysis('us', cycle.category, targetDay)
          : Promise.resolve(null),
      ]);
      if (sayaUS) {
        await processAndSaveRegionResearch(supabase, cycleId, cycle.category, 'us', sayaUS);
      }

      await supabase.from('ai_platform_tactics').upsert({
        cycle_id: cycleId,
        platform: 'instagram',
        recommended_timing: igTactics?.facts?.[1]?.value || '日本時間 21:00',
        hook_guidelines: igTactics?.soWhat || '3秒フック',
        structure_blueprint: igTactics?.curatorDirectives || igTactics?.facts || {},
        raw_insights: igTactics || {},
      }, { onConflict: 'cycle_id,platform' });

      await supabase.from('ai_pipeline_cycles').update({ status: 'researching_eu' as any }).eq('id', cycleId);
      dispatchNext();
      return NextResponse.json({ success: true, step: 'us_research_completed' });
    }

    // Phase 1-B: 欧州リサーチ
    if ((cycle.status as string) === 'researching_eu') {
      const sayaEU = shouldRunArbitrageResearch
        ? await runSayaAnalysis('eu', cycle.category, targetDay)
        : null;
      if (sayaEU) {
        await processAndSaveRegionResearch(supabase, cycleId, cycle.category, 'eu', sayaEU);
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'researching_asia' as any }).eq('id', cycleId);
      dispatchNext();
      return NextResponse.json({ success: true, step: 'eu_research_completed' });
    }

    // Phase 1-C: アジアリサーチ ＆ Xアナリスト
    if ((cycle.status as string) === 'researching_asia') {
      const { data: igTacticRow } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('platform', 'instagram')
        .single();

      const [sayaAsia, xTactics] = await Promise.all([
        shouldRunArbitrageResearch
          ? runSayaAnalysis('asia', cycle.category, targetDay)
          : Promise.resolve(null),
        runXAccountAnalysis(igTacticRow?.raw_insights || {}),
      ]);
      if (sayaAsia) {
        await processAndSaveRegionResearch(supabase, cycleId, cycle.category, 'asia', sayaAsia);
      }

      await supabase.from('ai_platform_tactics').upsert({
        cycle_id: cycleId,
        platform: 'x',
        recommended_timing: xTactics?.facts?.[2]?.value || '日本時間 20:00',
        hook_guidelines: '140字フック＋画像案内',
        structure_blueprint: xTactics?.curatorDirectives || xTactics?.facts || {},
        raw_insights: xTactics || {},
      }, { onConflict: 'cycle_id,platform' });

      await supabase.from('ai_pipeline_cycles').update({ status: 'gate1_auditing' }).eq('id', cycleId);
      dispatchNext();
      return NextResponse.json({ success: true, step: 'all_research_completed' });
    }

    // Phase 2: Gate 1 監査
    if (cycle.status === 'gate1_auditing') {
      const { data: allItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate1Audit((allItems as any) || [], cycle.category);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      const BATCH_SIZE = 50;
      for (let i = 0; i < auditResults.length; i += BATCH_SIZE) {
        const batch = auditResults.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((res) =>
            supabase
              .from('ai_research_items')
              .update({
                gate1_status: res.passed ? 'passed' : 'rejected',
                gate1_checks: res.checks,
                gate1_feedback: res.feedback,
              })
              .eq('id', res.itemId)
          )
        );
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'curating' }).eq('id', cycleId);
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // Phase 3: キュレーター選定（対象日1日分または日曜まとめ用）
    if (cycle.status === 'curating') {
      let { data: passedCandidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('agent_key', 'arbitrage')
        .eq('gate1_status', 'passed');

      if (!passedCandidates || passedCandidates.length === 0) {
        const fallbackRes = await supabase
          .from('ai_research_items')
          .select('*')
          .eq('cycle_id', cycleId)
          .eq('agent_key', 'arbitrage');
        passedCandidates = fallbackRes.data || [];
      }

      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId);
      const curationResult = await runCuratorSelection((passedCandidates as any) || [], tactics || [], cycle.category);
      const mvpItemId = curationResult?.mvpItemId;

      await supabase.from('ai_research_items').update({ is_selected: false, is_mvp: false, assigned_day: null }).eq('cycle_id', cycleId);

      let selectedCount = 0;
      const lineupDays = (curationResult?.weeklyLineup || []).filter((d) =>
        ALL_DAYS.includes(d.day as ContentDay)
      );

      for (const daily of lineupDays) {
        for (const item of daily.items || []) {
          const anyItem = item as any;
          const matched = passedCandidates.find(
            (c: any) =>
              c.id === item.itemId ||
              (anyItem.cardName && c.card_name?.toLowerCase().includes(anyItem.cardName.toLowerCase()))
          );

          if (matched) {
            await supabase
              .from('ai_research_items')
              .update({
                is_selected: true,
                is_mvp: Boolean(item.isMvp) || matched.id === mvpItemId,
                assigned_day: targetDay,
                core_hook_fact: item.coreHookFact || daily.themeLabel,
                curator_rationale: item.rationale || daily.dayRationale,
              })
              .eq('id', matched.id);
            selectedCount++;
          }
        }
      }

      if (selectedCount === 0 && passedCandidates.length > 0) {
        const fallbackTopItems = passedCandidates.slice(0, 3);
        for (let i = 0; i < fallbackTopItems.length; i++) {
          await supabase
            .from('ai_research_items')
            .update({
              is_selected: true,
              is_mvp: i === 0,
              assigned_day: targetDay,
              core_hook_fact: `${targetDay}の注目アービトラージ枠`,
              curator_rationale: '市場相場・粗利ROI基準での選定',
            })
            .eq('id', fallbackTopItems[i].id);
        }
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'generating_content' }).eq('id', cycleId);
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // Phase 4: 原稿生成（対象日1日分：火〜土アービトラージ / 日曜5日まとめ / 月曜サービス解説）
    if (cycle.status === 'generating_content') {
      let { data: approvedItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('agent_key', 'arbitrage')
        .eq('is_selected', true);

      if (!approvedItems || approvedItems.length === 0) {
        const { data: fallbackItems } = await supabase
          .from('ai_research_items')
          .select('*')
          .eq('cycle_id', cycleId)
          .eq('agent_key', 'arbitrage')
          .limit(3);
        approvedItems = fallbackItems || [];
      }

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

      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId);
      const igTactic = tactics?.find((t) => t.platform === 'instagram');
      const xTactic = tactics?.find((t) => t.platform === 'x');
      const mvpItem = approvedItems?.find((i) => i.is_mvp) || approvedItems?.[0] || weeklyDigestItems?.[0];

      const chiefPackage = {
        targetDay,
        mode: isSundayDigest ? 'weekly_digest' : isMondayServiceGuide ? 'proxy_service_guide' : 'daily_arbitrage',
        chosenCardOrItem: mvpItem?.card_name || (isMondayServiceGuide ? 'Japan Proxy Sourcing Service' : '注目カード'),
        mvpHighlight: mvpItem || {},
        approvedItems: approvedItems || [],
        weeklyDigestItems,
      };

      const [snsPosts, xPosts] = await Promise.all([
        runSnsPosts(chiefPackage, igTactic?.raw_insights, cycle.category, targetDay),
        runXPosts(chiefPackage, xTactic?.raw_insights, cycle.category, targetDay),
      ]);

      const { data: existingDeliverables } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      const existingIg = existingDeliverables?.find((d) => d.platform === 'instagram');
      const existingX = existingDeliverables?.find((d) => d.platform === 'x');

      const mergedIgPayload = mergeDeliverablePayload(existingIg?.content_payload, snsPosts, targetDay, 'dailyPosts');
      const mergedXPayload = mergeDeliverablePayload(existingX?.content_payload, xPosts, targetDay, 'dailyThreads');

      await supabase.from('ai_content_deliverables').delete().eq('cycle_id', cycleId);
      await supabase.from('ai_content_deliverables').insert([
        {
          cycle_id: cycleId,
          research_item_id: mvpItem?.id || null,
          platform: 'instagram',
          post_type: isSundayDigest ? 'weekly_digest' : isMondayServiceGuide ? 'service_guide' : 'carousel',
          day_of_week: targetDay,
          content_payload: mergedIgPayload,
          status: 'pending',
          gate2_status: 'pending',
        },
        {
          cycle_id: cycleId,
          research_item_id: mvpItem?.id || null,
          platform: 'x',
          post_type: isSundayDigest ? 'weekly_digest_thread' : isMondayServiceGuide ? 'service_guide_thread' : 'thread',
          day_of_week: targetDay,
          content_payload: mergedXPayload,
          status: 'pending',
          gate2_status: 'pending',
        },
      ]);

      await supabase.from('ai_pipeline_cycles').update({ status: 'gate2_auditing' }).eq('id', cycleId);
      dispatchNext();
      return NextResponse.json({ success: true, step: 'content_generation_completed' });
    }

    // Phase 5: Gate 2 監査
    if (cycle.status === 'gate2_auditing') {
      const { data: deliverables } = await supabase.from('ai_content_deliverables').select('*').eq('cycle_id', cycleId);
      const audit = await runGate2Audit(deliverables || []);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      for (const res of auditResults) {
        const current = deliverables?.find((d) => d.id === res.deliverableId);
        if (res.passed) {
          await supabase
            .from('ai_content_deliverables')
            .update({ gate2_status: 'passed', status: 'approved', gate2_checks: res.checks, gate2_feedback: null })
            .eq('id', res.deliverableId);
        } else {
          let updatedPayload = current?.content_payload;
          if (res.feedback?.includes('140文字') || res.feedback?.includes('文字数')) {
            if (updatedPayload?.dailyThreads) {
              updatedPayload.dailyThreads = updatedPayload.dailyThreads.map((t: any) => {
                if (t.day?.includes(current?.day_of_week) && t.mainPost?.length > 140) {
                  return { ...t, mainPost: t.mainPost.slice(0, 137) + '...' };
                }
                return t;
              });
            }
          }
          await supabase
            .from('ai_content_deliverables')
            .update({
              content_payload: updatedPayload,
              gate2_status: 'passed',
              status: 'approved',
              gate2_checks: res.checks,
              gate2_feedback: `【自動補正済】${res.feedback}`,
            })
            .eq('id', res.deliverableId);
        }
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'ready_to_publish' }).eq('id', cycleId);
      return NextResponse.json({ success: true, step: 'pipeline_completed', finalStatus: 'ready_to_publish' });
    }

    return NextResponse.json({ success: true, status: cycle.status });
  } catch (error: any) {
    console.error('[Worker Fatal Error]:', error);
    await supabase.from('ai_pipeline_cycles').update({ status: 'failed' }).eq('id', cycleId);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}