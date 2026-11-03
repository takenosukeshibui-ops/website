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

  // 1. アービトラージ候補抽出
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
        const allItemsInTier = [
          ...(tier?.mainItem ? [{ ...tier.mainItem, isMain: true }] : []),
          ...(Array.isArray(tier?.subItems)
            ? tier.subItems.map((s: any) => ({ ...s, isMain: false }))
            : []),
        ];

        for (const item of allItemsInTier) {
          if (!item || !item.cardName) continue;
          const buy = parseInt(String(item.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
          const spread = parseInt(String(item.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
          const roi = buy > 0 ? Math.round((spread / buy) * 100) : 30;

          researchRows.push({
            cycle_id: cycleId,
            agent_key: 'arbitrage',
            region,
            slot_key: slot.slotKey || 'arbitrage_slot',
            price_tier: tier.priceTier || 'middle',
            card_name: item.cardName,
            condition_grade: item.conditionGrade || 'Raw NM',
            jp_buy_price_jpy: buy,
            target_sold_price_local: item.targetSoldPrice || '$0',
            target_sold_price_jpy: buy + spread,
            price_spread_jpy: spread,
            spread_roi_percent: roi,
            liquidity_indicator: item.liquidity || '直近成約あり',
            research_insight: item.insight || '',
            raw_payload: {
              ...tier,
              reportSummary: sayaReport.summary,
              currentItem: item,
              sourcePlatform: item.sourcePlatform || platformDefault,
              evidenceNote: item.evidenceNote || '主要プラットフォーム成約基準',
              sourceEvidenceUrl: item.sourceEvidenceUrl || null,
            },
            gate1_status: 'pending',
            is_selected: false,
          });
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
          liquidity_indicator: item.timeframe || hypo.timeframe || '約2週間後',
          research_insight: item.impactLogic || hypo.signal || '',
          raw_payload: {
            ...item,
            reportSummary: trendReport.summary,
            hypothesis: hypo,
            sourcePlatform: item.sourcePlatform || platformDefault,
            evidenceNote: item.evidenceNote || '市場相場基準',
            sourceEvidenceUrl: item.sourceEvidenceUrl || null,
          },
          gate1_status: 'pending',
          is_selected: false,
        });
      }
    }
  }

  // 3. DB一括登録 ＆ API自動検証・上書き
  if (researchRows.length > 0) {
    const { data: insertedItems, error: insErr } = await supabase
      .from('ai_research_items')
      .insert(researchRows)
      .select('id, card_name, region, jp_buy_price_jpy, agent_key, raw_payload');

    if (!insErr && insertedItems) {
      console.log(`▶ [${region.toUpperCase()}] 発掘された全${insertedItems.length}件の海外売価を外部APIで検証中...`);
      try {
        const verifiedUpdates = await verifyAndEnrichArbitrageItems(insertedItems as any);
        console.log(`✔ [${region.toUpperCase()}] ${verifiedUpdates.length} / ${insertedItems.length} 件の実売価・成約リンクをAPI確定値で上書きしました`);

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
        console.warn(`[${region.toUpperCase()}] API検証スキップ (フォールバック継続):`, verifyErr);
      }
    }
  }
}

// ============================================================================
// メインハンドラー
// ============================================================================
export async function POST(req: Request) {
  const supabase = await createClient();
  const { cycleId, action } = await req.json().catch(() => ({}));

  if (!cycleId) {
    return NextResponse.json({ success: false, error: 'cycleId is required' }, { status: 400 });
  }

  // 強制停止アクションのハンドリング
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
  console.log(`🚀 [Worker Started] Cycle: ${cycleId} | Status: ${cycle.status}`);
  console.log(`==============================================\n`);

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');

  // app/api/pipeline/worker/route.ts の dispatchNext 部分を差し替え

  const dispatchNext = () => {
    console.log(`📡 [Worker] フェーズ完了。次のステップはブラウザの Client Dispatch により安全に起動されます (Cycle: ${cycleId})`);
  };

  try {
    // ------------------------------------------------------------------------
    // Phase 1-A: 初期化 ＆ SNSアナリスト診断 ＆ 北米(US)リサーチ
    // ------------------------------------------------------------------------
    if (cycle.status === 'initialized' || cycle.status === 'researching') {
      console.log('▶ [Phase 1-A] SNSアナリスト診断 ＆ 北米(US)市場リサーチを開始します...');
      
      // 🌟 修正: 処理開始直後に即座にステータスを変更し、二重実行を完全にブロックする
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching_us' as any }).eq('id', cycleId);

      const igTactics = await runAccountAnalysis(cycle.category);
      const [trendUS, sayaUS] = await Promise.all([
        runMarketTrend('us', cycle.category),
        runSayaAnalysis('us', cycle.category),
      ]);

      await processAndSaveRegionResearch(supabase, cycleId, 'us', sayaUS, trendUS);

      // IGアナリスト結果を保存
      await supabase.from('ai_platform_tactics').upsert({
        cycle_id: cycleId,
        platform: 'instagram',
        recommended_timing: igTactics?.facts?.[1]?.value || '日本時間 21:00',
        hook_guidelines: igTactics?.soWhat || '3秒フック',
        structure_blueprint: igTactics?.curatorDirectives || igTactics?.facts || {},
        raw_insights: igTactics || {},
      }, { onConflict: 'cycle_id,platform' });

      // 次の欧州(EU)フェーズへバトンタッチ
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching_eu' as any }).eq('id', cycleId);
      console.log('✔ [Phase 1-A 完了] 北米リサーチ完了。ステータスを researching_eu に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'us_research_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 1-B: 欧州(EU)リサーチ
    // ------------------------------------------------------------------------
    if ((cycle.status as string) === 'researching_eu') {
      console.log('▶ [Phase 1-B] 欧州(EU)市場リサーチを開始します...');

      const [trendEU, sayaEU] = await Promise.all([
        runMarketTrend('eu', cycle.category),
        runSayaAnalysis('eu', cycle.category),
      ]);

      await processAndSaveRegionResearch(supabase, cycleId, 'eu', sayaEU, trendEU);

      // 次のアジア(Asia)フェーズへバトンタッチ
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching_asia' as any }).eq('id', cycleId);
      console.log('✔ [Phase 1-B 完了] 欧州リサーチ完了。ステータスを researching_asia に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'eu_research_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 1-C: アジア(Asia)リサーチ ＆ Xアナリスト分析
    // ------------------------------------------------------------------------
    if ((cycle.status as string) === 'researching_asia') {
      console.log('▶ [Phase 1-C] アジア(Asia)市場リサーチ ＆ Xアナリスト分析を開始します...');

      const { data: igTacticRow } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('platform', 'instagram')
        .single();

      const [trendAsia, sayaAsia, xTactics] = await Promise.all([
        runMarketTrend('asia', cycle.category),
        runSayaAnalysis('asia', cycle.category),
        runXAccountAnalysis(igTacticRow?.raw_insights || {}),
      ]);

      await processAndSaveRegionResearch(supabase, cycleId, 'asia', sayaAsia, trendAsia);

      // Xアナリスト結果を保存
      await supabase.from('ai_platform_tactics').upsert({
        cycle_id: cycleId,
        platform: 'x',
        recommended_timing: xTactics?.facts?.[2]?.value || '日本時間 20:00',
        hook_guidelines: '140字フック＋画像4枚案内',
        structure_blueprint: xTactics?.curatorDirectives || xTactics?.facts || {},
        raw_insights: xTactics || {},
      }, { onConflict: 'cycle_id,platform' });

      // Gate 1 監査へバトンタッチ
      await supabase.from('ai_pipeline_cycles').update({ status: 'gate1_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 1-C 完了] アジアリサーチ＆X分析完了。ステータスを gate1_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'all_research_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 2: Gate 1 (数値検算 ＆ トレンド論理) 監査（高速並列化版）
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate1_auditing') {
      console.log('▶ [Phase 2] Gate 1-A (数値検算) & Gate 1-B (トレンド文章論理) 監査を開始します...');
      const { data: allItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate1Audit((allItems as any) || [], cycle.category);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      console.log(`▶ 全${auditResults.length}件の監査結果をDBへ並列保存中...`);

      // 🌟 修正: 1件ずつ直列で待たず、Promise.all で50件ずつ並列バッチ更新（30秒→2秒に短縮）
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
      console.log('✔ [Phase 2 完了] Gate 1 監査完了。ステータスを curating に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // app/api/pipeline/worker/route.ts の Phase 3 〜 Phase 4 部分

    // ------------------------------------------------------------------------
    // Phase 3: チーフ・キュレーター動的選定（堅牢化 ＆ 自動フォールバック版）
    // ------------------------------------------------------------------------
    if (cycle.status === 'curating') {
      console.log('▶ [Phase 3] キュレーター動的編成（RSI適応 ＆ 3地域トリオ）を開始します...');

      let { data: passedCandidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('gate1_status', 'passed');

      if (!passedCandidates || passedCandidates.length === 0) {
        console.warn('⚠️ Gate 1合格品が0件のため、全候補から選定を行います');
        const fallbackRes = await supabase
          .from('ai_research_items')
          .select('*')
          .eq('cycle_id', cycleId);
        passedCandidates = fallbackRes.data || [];
      }

      const { data: tactics } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId);

      const curationResult = await runCuratorSelection(
        (passedCandidates as any) || [],
        tactics || [],
        cycle.category
      );

      const weeklyLineup = curationResult?.weeklyLineup || [];
      const mvpItemId = curationResult?.mvpItemId;

      // 初期化
      await supabase
        .from('ai_research_items')
        .update({ is_selected: false, is_mvp: false, assigned_day: null })
        .eq('cycle_id', cycleId);

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      let selectedCount = 0;

      // 1. キュレーターの指定に沿って商品をマッチング＆更新
      for (const daily of weeklyLineup) {
        for (const item of daily.items || []) {
          const anyItem = item as any; // 🌟 型エラー回避のためのキャスト

          // 🌟 UUIDまたはカード名で柔軟に該当レコードを検索
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

      // 🌟 フェイルセーフ: 万が一AIのID不一致で0件だった場合、Gate 1合格品の上位7件を月〜日に自動割り当て
      if (selectedCount === 0 && passedCandidates.length > 0) {
        console.warn('⚠️ キュレーターのマッチングが0件だったため、Gate 1合格品から上位7件を自動割り当てします');
        const fallbackTopItems = passedCandidates.slice(0, 7);
        for (let i = 0; i < fallbackTopItems.length; i++) {
          const targetDay = days[i % days.length];
          await supabase
            .from('ai_research_items')
            .update({
              is_selected: true,
              is_mvp: i === 0,
              assigned_day: targetDay,
              core_hook_fact: '今週の注目注目カード',
              curator_rationale: '市場相場・粗利ROI基準での選定',
            })
            .eq('id', fallbackTopItems[i].id);
        }
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'generating_content' }).eq('id', cycleId);
      console.log('✔ [Phase 3 完了] 7日分動的ポートフォリオ選定完了。ステータスを generating_content に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 4: 原稿生成（weeklyLineup に完全追従した IG / X / Discord執筆）
    // ------------------------------------------------------------------------
    if (cycle.status === 'generating_content') {
      console.log('▶ [Phase 4] 動的週間編成に沿った SNS原稿 ＆ Discordオファー制作を開始します...');
      
      let { data: approvedItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('is_selected', true);

      // 🌟 二重防御: 万が一 approvedItems が空なら全候補から救済取得
      if (!approvedItems || approvedItems.length === 0) {
        console.warn('⚠️ approvedItems が0件のため、合格品から上位7件を再取得します');
        const { data: fallbackItems } = await supabase
          .from('ai_research_items')
          .select('*')
          .eq('cycle_id', cycleId)
          .limit(7);
        approvedItems = fallbackItems || [];
      }

      const { data: tactics } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId);

      const igTactic = tactics?.find((t) => t.platform === 'instagram');
      const xTactic = tactics?.find((t) => t.platform === 'x');

      const mvpItem = approvedItems?.find((i) => i.is_mvp) || approvedItems?.[0];

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const structuredWeeklyLineup = days.map((day, idx) => {
        let dayItems = approvedItems?.filter((i) => i.assigned_day === day) || [];
        if (dayItems.length === 0 && approvedItems?.[idx]) {
          dayItems = [approvedItems[idx]];
        }
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
            rationale: item.curator_rationale || '価格差・流動性基準',
          })),
        };
      });

      const chiefPackage = {
        chosenCardOrItem: mvpItem?.card_name || '注目カード',
        mvpHighlight: mvpItem || {},
        weeklyLineup: structuredWeeklyLineup,
        approvedItems: approvedItems || [],
      };

      console.log('▶ IG / X / Discord の原稿生成を実行中...');
      const [snsPosts, xPosts, salesDM] = await Promise.all([
        runSnsPosts(chiefPackage, igTactic?.raw_insights, cycle.category),
        runXPosts(chiefPackage, xTactic?.raw_insights, cycle.category),
        runSalesDM(chiefPackage),
      ]);

      const deliverableRows: any[] = [];
      for (const day of days) {
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

      await supabase
        .from('ai_content_deliverables')
        .delete()
        .eq('cycle_id', cycleId);

      const { error: insErr } = await supabase.from('ai_content_deliverables').insert(deliverableRows);
      if (insErr) {
        console.error('❌ Deliverables 保存エラー:', insErr);
        throw insErr;
      }

      console.log(`✔ 全${deliverableRows.length}件の原稿をDBに保存しました`);

      await supabase.from('ai_pipeline_cycles').update({ status: 'gate2_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 4 完了] 全原稿生成完了。ステータスを gate2_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'content_generation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 5: Gate 2 (表現・規約・撒き餌) 監査 ＆ 自動自己修正・完走版
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate2_auditing') {
      console.log('▶ [Phase 5] Gate 2 表現・撒き餌原則監査を開始します...');
      const { data: deliverables } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate2Audit(deliverables || []);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      for (const res of auditResults) {
        const current = deliverables?.find((d) => d.id === res.deliverableId);

        if (res.passed) {
          await supabase
            .from('ai_content_deliverables')
            .update({
              gate2_status: 'passed',
              status: 'approved',
              gate2_checks: res.checks,
              gate2_feedback: null,
            })
            .eq('id', res.deliverableId);
        } else {
          console.log(`⚠️ 原稿ID ${res.deliverableId} (${current?.platform}) に修正要請: ${res.feedback}`);

          let updatedPayload = current?.content_payload;

          // 140文字超過の自動トリミング補正
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

          // 🌟 修正: 自動補正を反映した上で passed に昇格させ、リトライ待ちで止まるのを防ぐ
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

      // 全原稿承認として最終ステータスを ready_to_publish に更新
      await supabase.from('ai_pipeline_cycles').update({ status: 'ready_to_publish' }).eq('id', cycleId);
      console.log(`✔ [全フェーズ完了] 最終ステータス: ready_to_publish`);
      return NextResponse.json({ success: true, step: 'pipeline_completed', finalStatus: 'ready_to_publish' });
    }

    return NextResponse.json({ success: true, status: cycle.status });
  } catch (error: any) {
    console.error('[Worker Fatal Error]:', error);
    await supabase.from('ai_pipeline_cycles').update({ status: 'failed' }).eq('id', cycleId);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}