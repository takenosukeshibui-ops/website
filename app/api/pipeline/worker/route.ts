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
  const { cycleId } = await req.json();

  if (!cycleId) {
    return NextResponse.json({ success: false, error: 'cycleId is required' }, { status: 400 });
  }

  const { data: cycle } = await supabase
    .from('ai_pipeline_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  if (!cycle) {
    return NextResponse.json({ success: false, error: 'Cycle not found' }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const dispatchNext = () => {
    fetch(`${baseUrl}/api/pipeline/worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId }),
    }).catch(console.error);
  };

  try {
    // ------------------------------------------------------------------------
    // Phase 1: リサーチ & プラットフォーム戦術の並列実行
    // ------------------------------------------------------------------------
    if (cycle.status === 'initialized') {
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

      // リサーチ候補を ai_research_items に INSERT
      const researchRows: any[] = [];
      const extractItems = (report: any, agentKey: string, region: string) => {
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
                agent_key: agentKey,
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
                raw_payload: tier,
              });
            }
          }
        }
      };

      extractItems(sayaUS, 'arbitrage', 'us');
      extractItems(sayaEU, 'arbitrage', 'eu');
      extractItems(sayaAsia, 'arbitrage', 'asia');

      if (researchRows.length > 0) {
        await supabase.from('ai_research_items').insert(researchRows);
      }

      // 戦術レギュレーションを ai_platform_tactics に INSERT
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
      dispatchNext();
      return NextResponse.json({ success: true, step: 'researching_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 2: キュレーター選定
    // ------------------------------------------------------------------------
    if (cycle.status === 'curating') {
      const { data: candidates } = await supabase
        .from('ai_research_items')
        .select('*')
        .eq('cycle_id', cycleId);

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
      dispatchNext();
      return NextResponse.json({ success: true, step: 'curation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 3: Gate 1 (商材・数値) 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate1_auditing') {
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
          // 不合格品はリジェクトし、raw_payload の代替候補（subItems）から次点を昇格[cite: 1, 2]
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
      dispatchNext();
      return NextResponse.json({ success: true, step: 'gate1_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 4: 原稿生成（IG / X / Discord営業の並列実行）
    // ------------------------------------------------------------------------
    if (cycle.status === 'generating_content') {
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
      dispatchNext();
      return NextResponse.json({ success: true, step: 'content_generation_completed' });
    }

    // ------------------------------------------------------------------------
    // Phase 5: Gate 2 (表現・規約) 監査
    // ------------------------------------------------------------------------
    if (cycle.status === 'gate2_auditing') {
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
      return NextResponse.json({ success: true, status: finalStatus });
    }

    return NextResponse.json({ success: true, status: cycle.status });
  } catch (err: any) {
    console.error('Pipeline worker error:', err);
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