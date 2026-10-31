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
  const { cycleId, action } = await req.json().catch(() => ({}));

  if (!cycleId) {
    return NextResponse.json({ success: false, error: 'cycleId is required' }, { status: 400 });
  }

  // 手動停止シグナル
  if (action === 'stop') {
    await supabase
      .from('ai_pipeline_cycles')
      .update({ status: 'partially_failed' })
      .eq('id', cycleId);
    console.log(`🛑 [Worker Stopped] Cycle ${cycleId} がユーザーにより手動停止されました。`);
    return NextResponse.json({ success: true, message: 'Pipeline forcibly stopped' });
  }

  const { data: cycle, error: cycleErr } = await supabase
    .from('ai_pipeline_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  if (cycleErr || !cycle) {
    return NextResponse.json({ success: false, error: 'Cycle not found' }, { status: 404 });
  }

  // 終了状態の場合は二重実行を防止
  if (['ready_to_publish', 'completed'].includes(cycle.status)) {
    return NextResponse.json({ success: true, message: 'Already completed' });
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
    // Phase 1: リサーチ & プラットフォーム分析
    // ------------------------------------------------------------------------
    if (cycle.status === 'initialized') {
      console.log('▶ [Phase 1] 全リサーチ & 戦術分析を開始します...');
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching' }).eq('id', cycleId);

      const igTactics = await runAccountAnalysis(cycle.category);

      const [trendUS, trendEU, trendAsia, sayaUS, sayaEU, sayaAsia, xTactics] =
        await Promise.all([
          runMarketTrend('us', cycle.category),
          runMarketTrend('eu', cycle.category),
          runMarketTrend('asia', cycle.category),
          runSayaAnalysis('us', cycle.category),
          runSayaAnalysis('eu', cycle.category),
          runSayaAnalysis('asia', cycle.category),
          runXAccountAnalysis(igTactics?.raw_insights || igTactics),
        ]);

      const researchRows: any[] = [];

      const extractArbitrageItems = (report: any, region: string) => {
        if (!report?.slots || !Array.isArray(report.slots)) return;
        for (const slot of report.slots) {
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
                raw_payload: { ...tier, reportSummary: report.summary, currentItem: item },
                gate1_status: 'pending',
                is_selected: false,
              });
            }
          }
        }
      };

      const extractTrendItems = (report: any, region: string) => {
        if (!report?.hypotheses) return;
        const hypotheses = Array.isArray(report.hypotheses)
          ? report.hypotheses
          : [report.hypotheses];

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

      // 重複登録防止のため既存の候補をクリアしてからインサート
      await supabase.from('ai_research_items').delete().eq('cycle_id', cycleId);
      if (researchRows.length > 0) {
        const { error: insErr } = await supabase.from('ai_research_items').insert(researchRows);
        if (insErr) throw insErr;
      }

      await supabase.from('ai_platform_tactics').delete().eq('cycle_id', cycleId);
      await supabase.from('ai_platform_tactics').insert([
        {
          cycle_id: cycleId,
          platform: 'instagram',
          recommended_timing: igTactics?.facts?.[1]?.value || '日本時間 21:00',
          hook_guidelines: igTactics?.soWhat || '3秒フック',
          structure_blueprint: igTactics?.curatorDirectives || igTactics?.facts || {},
          raw_insights: igTactics || {},
        },
        {
          cycle_id: cycleId,
          platform: 'x',
          recommended_timing: xTactics?.facts?.[2]?.value || '日本時間 20:00',
          hook_guidelines: '140字フック＋画像4枚案内',
          structure_blueprint: xTactics?.curatorDirectives || xTactics?.facts || {},
          raw_insights: xTactics || {},
        },
      ]);

      await supabase.from('ai_pipeline_cycles').update({ status: 'gate1_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 1 完了] ステータスを gate1_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'research_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 2: Gate 1 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate1_auditing') {
      console.log('▶ [Phase 2] Gate 1 監査を開始します...');
      const { data: allItems } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate1Audit((allItems as any) || [], cycle.category);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      for (const res of auditResults) {
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
      console.log('✔ [Phase 2 完了] ステータスを curating に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 3: キュレーター動的選定
    // ------------------------------------------------------------------------
    if (cycle.status === 'curating') {
      console.log('▶ [Phase 3] キュレーター動的編成を開始します...');

      let { data: passedCandidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId)
        .eq('gate1_status', 'passed');

      if (!passedCandidates || passedCandidates.length === 0) {
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

      if (curationResult?.strategyBlueprint) {
        await supabase.from('ai_platform_tactics').insert({
          cycle_id: cycleId,
          platform: 'chief',
          recommended_timing: 'Weekly',
          hook_guidelines: curationResult.strategyBlueprint.headline,
          structure_blueprint: curationResult.strategyBlueprint,
          raw_insights: curationResult.strategyBlueprint,
        });
      }

      await supabase
        .from('ai_research_items')
        .update({ is_selected: false, is_mvp: false, assigned_day: null })
        .eq('cycle_id', cycleId);

      for (const daily of weeklyLineup) {
        for (const item of daily.items || []) {
          if (!item?.itemId) continue;
          await supabase
            .from('ai_research_items')
            .update({
              is_selected: true,
              is_mvp: Boolean(item.isMvp) || item.itemId === mvpItemId,
              assigned_day: daily.day,
              core_hook_fact: item.coreHookFact || daily.themeLabel,
              curator_rationale: item.rationale || daily.dayRationale,
            })
            .eq('id', item.itemId);
        }
      }

      await supabase.from('ai_pipeline_cycles').update({ status: 'generating_content' }).eq('id', cycleId);
      console.log('✔ [Phase 3 完了] ステータスを generating_content に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 4: 原稿生成（二重起動防止ロック付き）
    // ------------------------------------------------------------------------
    if (cycle.status === 'generating_content') {
      console.log('▶ [Phase 4] SNS原稿 ＆ Discordオファー制作を開始します...');

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

      const mvpItem = approvedItems?.find((i) => i.is_mvp) || approvedItems?.[0];

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const structuredWeeklyLineup = days.map((day) => {
        const dayItems = approvedItems?.filter((i) => i.assigned_day === day) || [];
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
            coreHookFact: item.core_hook_fact,
            rationale: item.curator_rationale,
          })),
        };
      });

      const chiefPackage = {
        chosenCardOrItem: mvpItem?.card_name,
        mvpHighlight: mvpItem,
        weeklyLineup: structuredWeeklyLineup,
        approvedItems,
      };

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
            content_payload: snsPosts || {},
            status: 'drafting',
            gate2_status: 'pending',
          },
          {
            cycle_id: cycleId,
            research_item_id: primaryItem?.id || null,
            platform: 'x',
            post_type: 'thread',
            day_of_week: day,
            content_payload: xPosts || {},
            status: 'drafting',
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
        content_payload: salesDM || {},
        status: 'drafting',
        gate2_status: 'pending',
      });

      // 🌟 30件重複を完全に排除：既存レコードを削除してから厳密に15件のみインサート
      await supabase.from('ai_content_deliverables').delete().eq('cycle_id', cycleId);
      const { error: insErr } = await supabase.from('ai_content_deliverables').insert(deliverableRows);
      if (insErr) throw insErr;

      await supabase.from('ai_pipeline_cycles').update({ status: 'gate2_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 4 完了] 全15件の原稿を生成完了。ステータスを gate2_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'content_generation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 5: Gate 2 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate2_auditing') {
      console.log('▶ [Phase 5] Gate 2 表現・撒き餌原則監査を開始します...');
      const { data: deliverables, error: delErr } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      if (delErr || !deliverables || deliverables.length === 0) {
        await supabase.from('ai_pipeline_cycles').update({ status: 'partially_failed' }).eq('id', cycleId);
        return NextResponse.json({ success: false, error: 'No deliverables found to audit' }, { status: 500 });
      }

      const audit = await runGate2Audit(deliverables);
      const auditResults = Array.isArray(audit?.results) ? audit.results : [];

      let hasRetryTarget = false;

      for (const res of auditResults) {
        const current = deliverables?.find((d) => d.id === res.deliverableId);
        const currentRetry = current?.retry_count || 0;

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
          if (currentRetry < 2) {
            hasRetryTarget = true;
            let updatedPayload = current?.content_payload;

            if (res.feedback?.includes('140文字')) {
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
                gate2_status: 'pending',
                gate2_feedback: res.feedback,
                retry_count: currentRetry + 1,
              })
              .eq('id', res.deliverableId);
          } else {
            await supabase
              .from('ai_content_deliverables')
              .update({
                gate2_status: 'rejected',
                gate2_feedback: res.feedback,
                status: 'rejected',
                retry_count: currentRetry + 1,
              })
              .eq('id', res.deliverableId);
          }
        }
      }

      if (hasRetryTarget) {
        dispatchNext();
        return NextResponse.json({ success: true, step: 'gate2_retrying' });
      }

      const { data: finalDeliverables } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      const allApproved =
        finalDeliverables &&
        finalDeliverables.length > 0 &&
        finalDeliverables.every((d) => d.gate2_status === 'passed');

      const finalStatus = allApproved ? 'ready_to_publish' : 'partially_failed';

      await supabase.from('ai_pipeline_cycles').update({ status: finalStatus }).eq('id', cycleId);
      console.log(`✔ [全フェーズ完了] 最終ステータス: ${finalStatus}`);
      return NextResponse.json({ success: true, step: 'pipeline_completed', finalStatus });
    }

    return NextResponse.json({ success: true, status: cycle.status });
  } catch (error: any) {
    console.error('[Worker Fatal Error]:', error);
    await supabase.from('ai_pipeline_cycles').update({ status: 'partially_failed' }).eq('id', cycleId);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}