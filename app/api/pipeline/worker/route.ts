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
    // Phase 1: 全リサーチ & プラットフォーム戦術（RSI示唆含む）の並列実行
    // ------------------------------------------------------------------------
    if (cycle.status === 'initialized') {
      console.log('▶ [Phase 1] 全リサーチ & 戦術分析を開始します...');
      await supabase.from('ai_pipeline_cycles').update({ status: 'researching' }).eq('id', cycleId);

      // まずIGアナリストを実行し、そのインサイトをXアナリストへ共有
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

      // A. アービトラージ候補抽出（本命 ＋ 代替候補をフラットに全展開）
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

      // B. トレンド候補抽出（仮説ごとの銘柄 & シグナル）
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

      if (researchRows.length > 0) {
        await supabase.from('ai_research_items').insert(researchRows);
      }

      // SNSアナリストの出力（curatorDirectives を含む raw_insights）を保存
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
      console.log('✔ [Phase 1 完了] 全リサーチ & 戦術分析完了。ステータスを gate1_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'research_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 2: Gate 1 (数値検算 ＆ トレンド論理) 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate1_auditing') {
      console.log('▶ [Phase 2] Gate 1-A (数値検算) & Gate 1-B (トレンド文章論理) 監査を開始します...');
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
      console.log('✔ [Phase 2 完了] Gate 1 監査完了。ステータスを curating に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 3: チーフ・キュレーター動的選定（RSI示唆 ＆ 3地域トリオ編成）
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

      // Phase 1 で保存された SNS戦術（curatorDirectives）を取得
      const { data: tactics } = await supabase
        .from('ai_platform_tactics')
        .select('*')
        .eq('cycle_id', cycleId);

      // キュレーター実行（候補銘柄 ＋ SNSアナリスト示唆 を注入）
      const curationResult = await runCuratorSelection(
        (passedCandidates as any) || [],
        tactics || [],
        cycle.category
      );

      const weeklyLineup = curationResult?.weeklyLineup || [];
      const mvpItemId = curationResult?.mvpItemId;

      // 🌟 curationResult の編成方針（strategyBlueprint）を ai_platform_tactics に保存
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

      // 一旦全商品の選定フラグをリセット
      await supabase
        .from('ai_research_items')
        .update({ is_selected: false, is_mvp: false, assigned_day: null })
        .eq('cycle_id', cycleId);

      // キュレーターが選んだ全商品（7日分 × 3商品トリオ ＋ トレンド/的中）をDBに反映
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
      console.log('✔ [Phase 3 完了] 7日分動的ポートフォリオ選定完了。ステータスを generating_content に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 4: 原稿生成（weeklyLineup に完全追従した IG / X / Discord執筆）
    // ------------------------------------------------------------------------
    if (cycle.status === 'generating_content') {
      console.log('▶ [Phase 4] 動的週間編成に沿った SNS原稿 ＆ Discordオファー制作を開始します...');
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

      // 各曜日の3地域トリオ・商材データを構造化した chiefPackage を構築
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
            research_item_id: primaryItem?.id,
            platform: 'instagram',
            post_type: 'carousel',
            day_of_week: day,
            content_payload: snsPosts,
            status: 'draft',
            gate2_status: 'pending',
          },
          {
            cycle_id: cycleId,
            research_item_id: primaryItem?.id,
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
        research_item_id: mvpItem?.id,
        platform: 'discord',
        post_type: 'wholesale_offer',
        day_of_week: 'Weekly',
        content_payload: salesDM,
        status: 'draft',
        gate2_status: 'pending',
      });

      await supabase
        .from('ai_content_deliverables')
        .delete()
        .eq('cycle_id', cycleId);

      await supabase.from('ai_content_deliverables').insert(deliverableRows);
      await supabase.from('ai_pipeline_cycles').update({ status: 'gate2_auditing' }).eq('id', cycleId);
      console.log('✔ [Phase 4 完了] 全原稿生成完了。ステータスを gate2_auditing に更新しました');
      dispatchNext();
      return NextResponse.json({ success: true, step: 'content_generation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 5: Gate 2 (表現・規約・撒き餌) 監査 ＆ 自動自己修正ループ
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate2_auditing') {
      console.log('▶ [Phase 5] Gate 2 表現・撒き餌原則監査を開始します...');
      const { data: deliverables } = await supabase
        .from('ai_content_deliverables')
        .select('*')
        .eq('cycle_id', cycleId);

      const audit = await runGate2Audit(deliverables || []);
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
          // 2回未満の差し戻しなら自動修正ループをトリガー
          if (currentRetry < 2) {
            hasRetryTarget = true;
            console.log(
              `⚠️ 原稿ID ${res.deliverableId} (${current?.platform}) に修正要請が出たため自動自己修正を実行します (試行: ${currentRetry + 1}回目)`
            );

            let updatedPayload = current?.content_payload;

            // Xの140文字超過時の自動安全トリミング
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
            // 2回修正しても通らなかった場合は人間にエスカレーション
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

      const allApproved = finalDeliverables?.every((d) => d.gate2_status === 'passed');
      const finalStatus = allApproved ? 'ready_to_publish' : 'partially_failed';

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