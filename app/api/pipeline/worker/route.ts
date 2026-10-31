// app/api/pipeline/worker/route.ts
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
    }).catch((err) => console.error('[Worker Auto-dispatch failed]:', err.message));
  };

  try {
    // ------------------------------------------------------------------------
    // Phase 1: リサーチ & プラットフォーム戦術の並列実行
    // ------------------------------------------------------------------------
    if (cycle.status === 'initialized') {
      console.log('▶ [Phase 1] 全リサーチ & 戦術分析を開始します...');
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

      // A. アービトラージ候補抽出（各価格帯の本命1件をメイン登録）
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
                gate1_status: 'pending',
                is_selected: false,
              });
            }
          }
        }
      };

      // B. トレンド候補抽出（仮説ごとのRank銘柄を登録）
      const extractTrendItems = (report: any, region: string) => {
        if (!report?.hypotheses) return;
        for (const hypo of report.hypotheses) {
          for (const item of hypo.items || []) {
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
              raw_payload: { ...item, reportSummary: report.summary, hypothesis: hypo },
              gate1_status: 'pending',
              is_selected: false,
            });
          }
        }
      };

      extractArbitrageItems(sayaUS, 'us');
      extractArbitrageItems(sayaEU, 'eu');
      extractArbitrageItems(sayaAsia, 'asia');

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

      // 🌟 Phase 2（Gate 1 監査）へステータス更新
      await supabase.from('ai_pipeline_cycles').update({ status: 'gate1_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 1 完了] 全リサーチ完了。ステータスを gate1_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'research_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 2: Gate 1 (商材・数値) 監査（リサーチ直後の全候補を一斉審査）
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate1_auditing') {
      console.log('▶ [Phase 2] Gate 1 数値・規約監査（全候補対象）を開始します...');
      const { data: allItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate1Audit((allItems as any) || [], cycle.category);

      for (const res of audit.results) {
        await supabase
          .from('ai_research_items')
          .update({
            gate1_status: res.passed ? 'passed' : 'rejected',
            gate1_checks: res.checks,
            gate1_feedback: res.feedback,
          })
          .eq('id', res.itemId);
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'curating' }).eq('id', cycleId);
      console.log('✔ [Phase 2 完了] 全候補の監査完了。ステータスを curating に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 3: キュレーター選定（Gate 1合格品から7日分スロットを厳選）
    // ------------------------------------------------------------------------
    if (cycle.status === 'curating') {
      console.log('▶ [Phase 3] キュレーター選定を開始します...');
      
      // 🌟 Gate 1 に合格した完全安全な候補のみをチーフAIに渡す
      const { data: passedCandidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('gate1_status', 'passed');

      const selected = await runCuratorSelection((passedCandidates as any) || []);

      await supabase
        .from('ai_research_items')
        .update({ is_selected: false })
        .eq('cycle_id', cycleId);

      for (const item of selected) {
        await supabase
          .from('ai_research_items')
          .update({
            is_selected: true,
            is_mvp: item.isMvp,
            assigned_day: item.day,
            curator_rationale: item.rationale,
          })
          .eq('id', item.itemId);
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'generating_content' }).eq('id', cycleId);
      console.log('✔ [Phase 3 完了] ステータスを generating_content に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
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
            post_type: 'carousel',
            day_of_week: day,
            content_payload: snsPosts,
            status: 'draft',
            gate2_status: 'pending',
          },
          {
            cycle_id: cycleId,
            research_item_id: item?.id,
            platform: 'x',
            post_type: 'thread',
            day_of_week: day,
            content_payload: xPosts,
            status: 'draft',
            gate2_status: 'pending',
          }
        );
      }

      deliverableRows.push({
        cycle_id: cycleId,
        research_item_id: approvedItems?.[0]?.id,
        platform: 'discord',
        post_type: 'wholesale_offer',
        day_of_week: 'Weekly',
        content_payload: salesDM,
        status: 'draft',
        gate2_status: 'pending',
      });

      // 🌟 再実行時の重複蓄積防止
      await supabase
        .from('ai_content_deliverables')
        .delete()
        .eq('cycle_id', cycleId);

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
      return NextResponse.json({ success: true, step: 'pipeline_completed', finalStatus });
    }

    return NextResponse.json({ success: true, status: cycle.status });
  } catch (error: any) {
    console.error('[Worker Fatal Error]:', error);
    await supabase.from('ai_pipeline_cycles').update({ status: 'failed' }).eq('id', cycleId);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}