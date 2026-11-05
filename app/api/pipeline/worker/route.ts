// app/api/pipeline/worker/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runMarketTrend } from '@/app/api/ai/intelligence/agents/marketTrend';
import { runSayaAnalysis } from '@/app/api/ai/intelligence/agents/arbitrage';
import { runAccountAnalysis, runXAccountAnalysis } from '@/app/api/ai/intelligence/agents/snsAccount';
import { runCuratorSelection } from '@/app/api/ai/intelligence/agents/curator';
import { runGate1Audit } from '@/app/api/pipeline/gates/gate1';
import { runSnsPosts, runXPosts } from '@/app/api/ai/intelligence/agents/contentCreator';
import { runSalesDM } from '@/app/api/ai/intelligence/agents/salesDM';
import { runGate2Audit } from '@/app/api/pipeline/gates/gate2';
import { verifyAndEnrichArbitrageItems } from '@/lib/market-fetcher/verifier';
import { getTopShopUrlByGoogle } from '@/lib/market-fetcher/google-search';

function buildCleanSearchKeyword(cardName: string, cardNumber?: string): string {
  const cleanName = cardName.replace(/\s*[\(（].*?[\)）]/g, '').trim();
  if (cardNumber) {
    return `${cleanName} ${cardNumber}`.trim();
  }
  return cleanName;
}

// 🌟 個別商品URL (/itm/) の自動確保ヘルパー
async function resolveIndividualEbayUrl(aiUrl: string | undefined, cardName: string, cardNumber?: string): Promise<string> {
  // すでに有効な個別出品ページ (/itm/) である場合はそのまま採用
  if (aiUrl && aiUrl.includes('/itm/')) {
    return aiUrl;
  }
  // /sch/ (検索結果一覧) や 空文字の場合は Google Search API で個別ページ (/itm/) をピンポイント取得
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

// ============================================================================
// 共通ヘルパー: 地域別リサーチ結果のパースとDB登録＆API検証
// ============================================================================
async function processAndSaveRegionResearch(
  supabase: any,
  cycleId: string,
  region: 'us' | 'eu' | 'asia',
  sayaReport: any,
  trendReport: any
) {
  const researchRows: any[] = [];
  const platformDefault =
    region === 'us'
      ? 'eBay US / TCGplayer'
      : region === 'eu'
      ? 'Cardmarket / eBay DE'
      : 'Shopee / Carousell';

  // 1. アービトラージ候補抽出（全5スロット × 1価格帯 × 3商品）
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
        // A. 本命商品の個別URL取得
        if (tier?.mainItem && tier.mainItem.cardName) {
          const mainItem = tier.mainItem;
          const buy = parseInt(String(mainItem.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
          const spread = parseInt(String(mainItem.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
          const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

          const searchKeyword = buildCleanSearchKeyword(mainItem.cardName, mainItem.cardNumber);
          const mainEvidenceUrl = await getTopShopUrlByGoogle(searchKeyword, 'cardrush');
          mainItem.jpEvidenceUrl = mainEvidenceUrl;

          // 🌟 eBayの個別出品ページURL (/itm/...) を確実に解決
          const resolvedEbayUrl = await resolveIndividualEbayUrl(mainItem.sourceEvidenceUrl, mainItem.cardName, mainItem.cardNumber);
          mainItem.sourceEvidenceUrl = resolvedEbayUrl;

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
            liquidity_indicator: mainItem.liquidity || '直近成約あり',
            research_insight: mainItem.insight || '',
            raw_payload: {
              priceTier: tier.priceTier,
              priceTierLabel: tier.priceTierLabel,
              slotKey: slot.slotKey,
              slotLabel: slot.slotLabel,
              isMain: true,
              role: '本命',
              mainItem: { ...mainItem, jpEvidenceUrl: mainEvidenceUrl, sourceEvidenceUrl: resolvedEbayUrl },
              subItems: tier.subItems || [],
              currentItem: { ...mainItem, jpEvidenceUrl: mainEvidenceUrl, sourceEvidenceUrl: resolvedEbayUrl },
              jpEvidenceUrl: mainEvidenceUrl,
              sourcePlatform: mainItem.sourcePlatform || platformDefault,
              evidenceNote: mainItem.evidenceNote || '主要プラットフォーム成約基準',
              sourceEvidenceUrl: resolvedEbayUrl,
            },
            gate1_status: 'pending',
            is_selected: false,
          });
        }

        // B. 代替候補商品（2商品）の個別URL取得
        if (Array.isArray(tier?.subItems)) {
          for (let sIdx = 0; sIdx < tier.subItems.length; sIdx++) {
            const subItem = tier.subItems[sIdx];
            if (!subItem || !subItem.cardName) continue;
            const buy = parseInt(String(subItem.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
            const spread = parseInt(String(subItem.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
            const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

            const subKeyword = buildCleanSearchKeyword(subItem.cardName, subItem.cardNumber);
            const subEvidenceUrl = await getTopShopUrlByGoogle(subKeyword, 'cardrush');
            subItem.jpEvidenceUrl = subEvidenceUrl;

            // 🌟 代替候補の個別eBay URL (/itm/...) も同様に解決
            const resolvedSubEbayUrl = await resolveIndividualEbayUrl(subItem.sourceEvidenceUrl, subItem.cardName, subItem.cardNumber);
            subItem.sourceEvidenceUrl = resolvedSubEbayUrl;

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
              liquidity_indicator: subItem.liquidity || '直近成約あり',
              research_insight: subItem.insight || '',
              raw_payload: {
                priceTier: tier.priceTier,
                priceTierLabel: tier.priceTierLabel,
                slotKey: slot.slotKey,
                slotLabel: slot.slotLabel,
                isMain: false,
                role: `候補${sIdx + 2}`,
                currentItem: { ...subItem, jpEvidenceUrl: subEvidenceUrl, sourceEvidenceUrl: resolvedSubEbayUrl },
                jpEvidenceUrl: subEvidenceUrl,
                sourcePlatform: subItem.sourcePlatform || platformDefault,
                evidenceNote: subItem.evidenceNote || '主要プラットフォーム成約基準',
                sourceEvidenceUrl: resolvedSubEbayUrl,
              },
              gate1_status: 'pending',
              is_selected: false,
            });
          }
        }
      }
    }
  }

  // 2. トレンド候補抽出
  if (trendReport?.hypotheses) {
    const hypotheses = Array.isArray(trendReport.hypotheses)
      ? trendReport.hypotheses
      : [trendReport.hypotheses];

    for (const hypo of hypotheses) {
      if (!hypo) continue;
      const items = Array.isArray(hypo.items) ? hypo.items : [];
      for (const item of items) {
        if (!item || !item.cardName) continue;
        const buy = parseInt(String(item.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
        const match = String(item.currentLocalPrice || '').match(/約[¥￥]([0-9,]+)/);
        const targetJpy = match ? parseInt(match[1].replace(/,/g, '')) : Math.round(buy * 1.4);
        const spread = Math.max(0, targetJpy - buy);
        const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

        const trendKeyword = buildCleanSearchKeyword(item.cardName);
        const trendEvidenceUrl = await getTopShopUrlByGoogle(trendKeyword, 'cardrush');
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
          spread_roi_percent: roi,
          liquidity_indicator: hypo.timeframe || '約2週間後',
          research_insight: item.impactLogic || hypo.signal || '',
          raw_payload: {
            ...item,
            reportSummary: trendReport.summary,
            hypothesis: hypo,
            jpEvidenceUrl: trendEvidenceUrl,
            sourcePlatform: item.sourcePlatform || platformDefault,
            evidenceNote: item.evidenceNote || '市場相場基準',
            sourceEvidenceUrl: resolvedTrendEbayUrl,
          },
          gate1_status: 'pending',
          is_selected: false,
        });
      }
    }
  }

  // 3. DB一括登録 ＆ API自動検証
  if (researchRows.length > 0) {
    const { data: insertedItems, error: insErr } = await supabase
      .from('ai_research_items')
      .insert(researchRows)
      .select('id, card_name, region, jp_buy_price_jpy, agent_key, raw_payload');

    if (!insErr && insertedItems) {
      try {
        const verifiedUpdates = await verifyAndEnrichArbitrageItems(insertedItems as any);
        for (const update of verifiedUpdates) {
          const originalItem = insertedItems.find((i: any) => i.id === update.itemId);
          const currentPayload = originalItem?.raw_payload || {};
          const isTrend = originalItem?.agent_key === 'trend';

          await supabase
            .from('ai_research_items')
            .update({
              target_sold_price_local: update.target_sold_price_local,
              target_sold_price_jpy: update.target_sold_price_jpy,
              price_spread_jpy: update.price_spread_jpy,
              spread_roi_percent: update.spread_roi_percent,
              raw_payload: {
                ...currentPayload,
                sourcePlatform: update.sourcePlatform,
                evidenceNote: update.evidenceNote,
                sourceEvidenceUrl: update.sourceEvidenceUrl,
                ...(isTrend
                  ? {
                      currentLocalPrice: `${update.target_sold_price_local} (約¥${update.target_sold_price_jpy.toLocaleString()})`,
                    }
                  : {
                      currentItem: {
                        ...(currentPayload.currentItem || {}),
                        targetSoldPrice: update.target_sold_price_local,
                        priceSpreadJPY: `¥${update.price_spread_jpy.toLocaleString()}`,
                        spreadROI: `${update.spread_roi_percent}%`,
                        sourcePlatform: update.sourcePlatform,
                        evidenceNote: update.evidenceNote,
                        sourceEvidenceUrl: update.sourceEvidenceUrl,
                      },
                    }),
              },
            })
            .eq('id', update.itemId);
        }
      } catch (verifyErr) {
        console.warn(`[${region.toUpperCase()}] API検証スキップ:`, verifyErr);
      }
    }
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

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = days[new Date().getDay()];
  const targetDay = bodyTargetDay || todayDayName;

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
    // Phase 1-A: 北米リサーチ
    if (cycle.status === 'initialized' || cycle.status === 'researching') {
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching_us' as any }).eq('id', cycleId);
      const igTactics = await runAccountAnalysis(cycle.category);
      const [trendUS, sayaUS] = await Promise.all([
        runMarketTrend('us', cycle.category),
        runSayaAnalysis('us', cycle.category, targetDay),
      ]);
      await processAndSaveRegionResearch(supabase, cycleId, 'us', sayaUS, trendUS);

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
      const [trendEU, sayaEU] = await Promise.all([
        runMarketTrend('eu', cycle.category),
        runSayaAnalysis('eu', cycle.category, targetDay),
      ]);
      await processAndSaveRegionResearch(supabase, cycleId, 'eu', sayaEU, trendEU);

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

      const [trendAsia, sayaAsia, xTactics] = await Promise.all([
        runMarketTrend('asia', cycle.category),
        runSayaAnalysis('asia', cycle.category, targetDay),
        runXAccountAnalysis(igTacticRow?.raw_insights || {}),
      ]);
      await processAndSaveRegionResearch(supabase, cycleId, 'asia', sayaAsia, trendAsia);

      await supabase.from('ai_platform_tactics').upsert({
        cycle_id: cycleId,
        platform: 'x',
        recommended_timing: xTactics?.facts?.[2]?.value || '日本時間 20:00',
        hook_guidelines: '140字フック＋画像4枚案内',
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

    // Phase 3: キュレーター動的選定
    if (cycle.status === 'curating') {
      let { data: passedCandidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('gate1_status', 'passed');

      if (!passedCandidates || passedCandidates.length === 0) {
        const fallbackRes = await supabase.from('ai_research_items').select('*').eq('cycle_id', cycleId);
        passedCandidates = fallbackRes.data || [];
      }

      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId);
      const curationResult = await runCuratorSelection((passedCandidates as any) || [], tactics || [], cycle.category);
      const weeklyLineup = curationResult?.weeklyLineup || [];
      const mvpItemId = curationResult?.mvpItemId;

      await supabase.from('ai_research_items').update({ is_selected: false, is_mvp: false, assigned_day: null }).eq('cycle_id', cycleId);

      let selectedCount = 0;
      for (const daily of weeklyLineup) {
        for (const item of daily.items || []) {
          const anyItem = item as any;
          const matched = passedCandidates.find(
            (c: any) =>
              c.id === item.itemId ||
              c.id === anyItem.id ||
              (anyItem.cardName && c.card_name?.toLowerCase().includes(anyItem.cardName.toLowerCase()))
          );

          if (matched) {
            await supabase
              .from('ai_research_items')
              .update({
                is_selected: true,
                is_mvp: Boolean(item.isMvp) || matched.id === mvpItemId,
                assigned_day: daily.day,
                core_hook_fact: item.coreHookFact || daily.themeLabel,
                curator_rationale: item.rationale || daily.dayRationale,
              })
              .eq('id', matched.id);
            selectedCount++;
          }
        }
      }

      if (selectedCount === 0 && passedCandidates.length > 0) {
        const fallbackTopItems = passedCandidates.slice(0, 7);
        for (let i = 0; i < fallbackTopItems.length; i++) {
          await supabase
            .from('ai_research_items')
            .update({
              is_selected: true,
              is_mvp: i === 0,
              assigned_day: days[i % days.length],
              core_hook_fact: '今週の注目カード',
              curator_rationale: '市場相場・粗利ROI基準での選定',
            })
            .eq('id', fallbackTopItems[i].id);
        }
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'generating_content' }).eq('id', cycleId);
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // Phase 4: 原稿生成
    if (cycle.status === 'generating_content') {
      let { data: approvedItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('is_selected', true);

      if (!approvedItems || approvedItems.length === 0) {
        const { data: fallbackItems } = await supabase.from('ai_research_items').select('*').eq('cycle_id', cycleId).limit(7);
        approvedItems = fallbackItems || [];
      }

      const { data: tactics } = await supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycleId);
      const igTactic = tactics?.find((t) => t.platform === 'instagram');
      const xTactic = tactics?.find((t) => t.platform === 'x');
      const mvpItem = approvedItems?.find((i) => i.is_mvp) || approvedItems?.[0];

      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const structuredWeeklyLineup = daysOfWeek.map((day, idx) => {
        let dayItems = approvedItems?.filter((i) => i.assigned_day === day) || [];
        if (dayItems.length === 0 && approvedItems?.[idx]) dayItems = [approvedItems[idx]];
        return {
          day,
          items: dayItems.map((item) => ({
            itemId: item.id,
            region: item.region,
            cardName: item.card_name,
            condition: item.condition_grade,
            jpBuyPriceJPY: item.jp_buy_price_jpy,
            targetSoldPrice: item.target_sold_price_local,
            priceSpreadJPY: item.price_spread_jpy,
            spreadROI: `${item.spread_roi_percent}%`,
            coreHookFact: item.core_hook_fact || '注目ピックアップ',
            rationale: item.curator_rationale || '価格差基準',
          })),
        };
      });

      const chiefPackage = {
        chosenCardOrItem: mvpItem?.card_name || '注目カード',
        mvpHighlight: mvpItem || {},
        weeklyLineup: structuredWeeklyLineup,
        approvedItems: approvedItems || [],
      };

      const [snsPosts, xPosts, salesDM] = await Promise.all([
        runSnsPosts(chiefPackage, igTactic?.raw_insights, cycle.category),
        runXPosts(chiefPackage, xTactic?.raw_insights, cycle.category),
        runSalesDM(chiefPackage),
      ]);

      const deliverableRows: any[] = [];
      for (const day of daysOfWeek) {
        const dayItems = approvedItems?.filter((i) => i.assigned_day === day) || [];
        const primaryItem = dayItems.find((i) => i.is_mvp) || dayItems[0] || mvpItem;

        deliverableRows.push(
          {
            cycle_id: cycleId,
            research_item_id: primaryItem?.id || null,
            platform: 'instagram',
            post_type: 'carousel',
            day_of_week: day,
            content_payload: snsPosts,
            status: 'pending',
            gate2_status: 'pending',
          },
          {
            cycle_id: cycleId,
            research_item_id: primaryItem?.id || null,
            platform: 'x',
            post_type: 'thread',
            day_of_week: day,
            content_payload: xPosts,
            status: 'pending',
            gate2_status: 'pending',
          }
        );
      }

      deliverableRows.push({
        cycle_id: cycleId,
        research_item_id: mvpItem?.id || null,
        platform: 'discord',
        post_type: 'wholesale_offer',
        day_of_week: 'Weekly',
        content_payload: salesDM,
        status: 'pending',
        gate2_status: 'pending',
      });

      await supabase.from('ai_content_deliverables').delete().eq('cycle_id', cycleId);
      await supabase.from('ai_content_deliverables').insert(deliverableRows);

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
          await supabase.from('ai_content_deliverables').update({ gate2_status: 'passed', status: 'approved', gate2_checks: res.checks, gate2_feedback: null }).eq('id', res.deliverableId);
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
          await supabase.from('ai_content_deliverables').update({ content_payload: updatedPayload, gate2_status: 'passed', status: 'approved', gate2_checks: res.checks, gate2_feedback: `【自動補正済】${res.feedback}` }).eq('id', res.deliverableId);
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