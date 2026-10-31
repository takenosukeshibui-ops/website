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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { cycleId } = await req.json().catch(() => ({}));

  if (!cycleId) {
    return NextResponse.json({ success: false, error: 'cycleId is required' }, { status: 400 });
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

  const dispatchNext = () => {
    fetch(`${baseUrl}/api/pipeline/worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId }),
    }).catch((err) => console.warn('[Worker] dispatchNext notice:', err.message));
  };

  try {
    // ------------------------------------------------------------------------
    // Phase 1: リサーチ & プラットフォーム戦術の並列実行
    // ------------------------------------------------------------------------
    if (cycle.status === 'initialized') {
      console.log('▶ [Phase 1] リサーチ開始...');
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching' }).eq('id', cycleId);

      const [trendUS, trendEU, trendAsia, sayaUS, sayaEU, sayaAsia, igTactics, xTactics] =
        await Promise.all([
          runMarketTrend('us', cycle.category),
          runMarketTrend('eu', cycle.category),
          runMarketTrend('asia', cycle.category),
          runSayaAnalysis('us', cycle.category),
          runSayaAnalysis('eu', cycle.category),
          runSayaAnalysis('asia', cycle.category),
          runAccountAnalysis(cycle.category),
          runXAccountAnalysis(),
        ]);

      const researchRows: any[] = [];

      // A. アービトラージ（サヤ取り）アイテムの抽出
      const extractArbitrageItems = (report: any, region: string) => {
        if (!report?.slots) return;
        for (const slot of report.slots) {
          const tiers = slot.tiers || [{ mainItem: slot.items?.[0], subItems: slot.items?.slice(1) }];
          for (const tier of tiers) {
            const main = tier.mainItem;
            if (main) {
              const buy = parseInt(String(main.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
              const spread = parseInt(String(main.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
              researchRows.push({
                cycle_id: cycleId,
                agent_key: 'arbitrage',
                region,
                slot_key: slot.slotKey,
                price_tier: tier.priceTier || 'middle',
                card_name: main.cardName,
                condition_grade: main.conditionGrade || 'Raw NM',
                jp_buy_price_jpy: buy,
                target_sold_price_local: main.targetSoldPrice || '$0',
                target_sold_price_jpy: buy + spread,
                price_spread_jpy: spread,
                spread_roi_percent: parseInt(String(main.spreadROI || 0).replace(/[^0-9]/g, '')) || 30,
                liquidity_indicator: main.liquidity || '直近成約あり',
                research_insight: main.insight || '',
                raw_payload: { ...tier, reportSummary: report.summary },
              });
            }
          }
        }
      };

      extractArbitrageItems(sayaUS, 'us');
      extractArbitrageItems(sayaEU, 'eu');
      extractArbitrageItems(sayaAsia, 'asia');

      // B. 🌟 トレンドアイテム（上位5銘柄）の抽出・永続化
      const extractTrendItems = (report: any, region: string) => {
        if (!report?.hypotheses) return;
        for (const hypo of report.hypotheses) {
          for (const item of hypo.items || []) {
            const buy = parseInt(String(item.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
            researchRows.push({
              cycle_id: cycleId,
              agent_key: 'trend',
              region,
              slot_key: hypo.headline || 'trend_signal',
              price_tier: item.conviction || 'High',
              card_name: item.cardName,
              condition_grade: item.condition || 'Raw NM',
              jp_buy_price_jpy: buy,
              target_sold_price_local: item.currentLocalPrice || '$0',
              target_sold_price_jpy: buy * 1.3,
              price_spread_jpy: buy * 0.3,
              spread_roi_percent: 30,
              liquidity_indicator: item.timeframe || '約2週間後',
              research_insight: item.impactLogic || '',
              raw_payload: { ...item, reportSummary: report.summary, hypothesis: hypo },
            });
          }
        }
      };

      extractTrendItems(trendUS, 'us');
      extractTrendItems(trendEU, 'eu');
      extractTrendItems(trendAsia, 'asia');

      if (researchRows.length > 0) {
        await supabase.from('ai_research_items').insert(researchRows);
      }

      await supabase.from('ai_platform_tactics').insert([
        {
          cycle_id: cycleId,
          platform: 'instagram',
          recommended_timing: igTactics?.facts?.[1]?.value || '日本時間 21:00',
          hook_guidelines: igTactics?.soWhat || '3秒フック',
          structure_blueprint: igTactics?.facts || {},
          raw_insights: igTactics || {},
        },
        {
          cycle_id: cycleId,
          platform: 'x',
          recommended_timing: xTactics?.facts?.[2]?.value || '日本時間 20:00',
          hook_guidelines: '140字フック＋画像4枚案内',
          structure_blueprint: xTactics?.facts || {},
          raw_insights: xTactics || {},
        },
      ]);

      await supabase.from('ai_pipeline_cycles').update({ status: 'curating' }).eq('id', cycleId);
      console.log('✔ [Phase 1 完了] ステータスを curating に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'researching_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 2: キュレーター選定
    // ------------------------------------------------------------------------
    if (cycle.status === 'curating') {
      console.log('▶ [Phase 2] キュレーター選定を開始します...');
      const { data: candidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('agent_key', 'arbitrage');

      console.log(`[Phase 2] 対象候補件数: ${candidates?.length || 0}件`);
      const curation = await runCuratorSelection(candidates || [], cycle.category);

      for (const sel of curation?.calendarSelections || []) {
        await supabase
          .from('ai_research_items')
          .update({
            is_selected: true,
            assigned_day: sel.dayOfWeek,
            is_mvp: sel.selectedResearchItemId === curation?.mvpCandidateId,
            core_hook_fact: sel.coreHookFact,
            curator_rationale: sel.curatorRationale,
          })
          .eq('id', sel.selectedResearchItemId);
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'gate1_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 2 完了] ステータスを gate1_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 3: Gate 1 (商材・数値) 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate1_auditing') {
      console.log('▶ [Phase 3] Gate 1 数値監査を開始します...');
      const { data: selectedItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('is_selected', true);

      const audit = await runGate1Audit(selectedItems || [], cycle.category);

      for (const res of audit.results) {
        if (res.passed) {
          await supabase
            .from('ai_research_items')
            .update({ gate1_status: 'passed', gate1_checks: res.checks })
            .eq('id', res.itemId);
        } else {
          const { data: item } = await supabase
            .from('ai_research_items')
            .update({ gate1_status: 'rejected', gate1_feedback: res.feedback, is_selected: false })
            .eq('id', res.itemId)
            .select('*')
            .single();

          const backup = item?.raw_payload?.subItems?.[0];
          if (backup) {
            const buy = parseInt(String(backup.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 1000;
            const spread = parseInt(String(backup.priceSpreadJPY || 0).replace(/[^0-9]/g, '')) || 500;
            await supabase.from('ai_research_items').insert({
              cycle_id: cycleId,
              agent_key: item.agent_key,
              region: item.region,
              slot_key: item.slot_key,
              price_tier: item.price_tier,
              card_name: backup.cardName,
              condition_grade: backup.conditionGrade || 'Raw NM',
              jp_buy_price_jpy: buy,
              target_sold_price_local: backup.targetSoldPrice || '$0',
              target_sold_price_jpy: buy + spread,
              price_spread_jpy: spread,
              spread_roi_percent: parseInt(String(backup.spreadROI || 0).replace(/[^0-9]/g, '')) || 25,
              is_selected: true,
              assigned_day: item.assigned_day,
              curator_rationale: `Gate 1 差し戻しに伴う代替昇格: ${res.feedback}`,
            });
          }
        }
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'generating_content' }).eq('id', cycleId);
      console.log('✔ [Phase 3 完了] ステータスを generating_content に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 4: 原稿生成（IG / X / Discord営業の並列実行）
    // ------------------------------------------------------------------------
    if (cycle.status === 'generating_content') {
      console.log('▶ [Phase 4] SNS原稿 & Discord営業文の制作を開始します...');
      const { data: approvedItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('is_selected', true);

      const { data: tactics } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId);

      const igTactic = tactics?.find((t) => t.platform === 'instagram');
      const xTactic = tactics?.find((t) => t.platform === 'x');

      const chiefPackage = {
        chosenCardOrItem: approvedItems?.[0]?.card_name,
        mvpHighlight: approvedItems?.find((i) => i.is_mvp) || approvedItems?.[0],
        approvedItems,
      };

      const [snsPosts, xPosts, salesDM] = await Promise.all([
        runSnsPosts(chiefPackage, igTactic?.raw_insights, cycle.category),
        runXPosts(chiefPackage, xTactic?.raw_insights, cycle.category),
        runSalesDM(chiefPackage),
      ]);

      const deliverableRows: any[] = [];
      for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
        const item = approvedItems?.find((i) => i.assigned_day === day) || approvedItems?.[0];
        deliverableRows.push(
          {
            cycle_id: cycleId,
            research_item_id: item?.id,
            platform: 'instagram',
            day_of_week: day,
            post_type: 'Instagram_Daily',
            content_payload: snsPosts,
            status: 'pending_review',
          },
          {
            cycle_id: cycleId,
            research_item_id: item?.id,
            platform: 'x',
            day_of_week: day,
            post_type: 'X_Daily_Thread',
            content_payload: xPosts,
            status: 'pending_review',
          }
        );
      }

      deliverableRows.push({
        cycle_id: cycleId,
        research_item_id: approvedItems?.[0]?.id,
        platform: 'discord',
        day_of_week: 'Monday',
        post_type: 'Wholesale_Lot_Offer',
        content_payload: salesDM,
        status: 'pending_review',
      });

      await supabase.from('ai_content_deliverables').insert(deliverableRows);
      await supabase.from('ai_pipeline_cycles').update({ status: 'gate2_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 4 完了] ステータスを gate2_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'content_generation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 5: Gate 2 (表現・規約) 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate2_auditing') {
      console.log('▶ [Phase 5] Gate 2 表現規約監査を開始します...');
      const { data: deliverables } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate2Audit((deliverables as any) || []);

      for (const res of audit.results) {
        if (res.passed) {
          await supabase
            .from('ai_content_deliverables')
            .update({ gate2_status: 'passed', status: 'approved', gate2_checks: res.checks })
            .eq('id', res.deliverableId);
        } else {
          const current = deliverables?.find((d) => d.id === res.deliverableId);
          const nextRetry = (current?.retry_count || 0) + 1;
          await supabase
            .from('ai_content_deliverables')
            .update({
              gate2_status: 'rejected',
              gate2_feedback: res.feedback,
              status: nextRetry > 2 ? 'failed' : 'rejected',
              retry_count: nextRetry,
            })
            .eq('id', res.deliverableId);
        }
      }

      const finalStatus = audit.allPassed ? 'ready_to_publish' : 'partially_failed';
      await supabase.from('ai_pipeline_cycles').update({ status: finalStatus }).eq('id', cycleId);
      console.log(`✔ [全フェーズ完了] 最終ステータス: ${finalStatus}`);
      return NextResponse.json({ success: true, status: finalStatus });
    }

    return NextResponse.json({ success: true, status: cycle.status });
  } catch (err: any) {
    console.error('❌ [Worker Error]:', err);
    await supabase
      .from('ai_pipeline_cycles')
      .update({
        status: 'partially_failed',
        error_log: [{ error: err.message, stack: err.stack, time: new Date().toISOString() }],
      })
      .eq('id', cycleId);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}