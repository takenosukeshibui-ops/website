// app/api/pipeline/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('cycleId');
    const list = searchParams.get('list');
    const category = searchParams.get('category');

    const supabase = await createClient();

    // 🌟 1. 履歴セレクトボックス用の過去サイクル一覧返却
    if (list === 'true') {
      let query = supabase
        .from('ai_pipeline_cycles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (category) {
        query = query.eq('category', category);
      }

      const { data: cycles, error: listErr } = await query;
      if (listErr) throw listErr;
      return NextResponse.json({ success: true, cycles: cycles || [] });
    }

    // 🌟 2. 特定サイクル（または最新サイクル）の全データ取得
    let cycleQuery = supabase
      .from('ai_pipeline_cycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (cycleId) {
      cycleQuery = cycleQuery.eq('id', cycleId);
    } else if (category) {
      cycleQuery = cycleQuery.eq('category', category);
    }

    const { data: cycle, error: cycleErr } = await cycleQuery.limit(1).single();

    if (cycleErr || !cycle) {
      return NextResponse.json({ success: false, error: 'Cycle not found' }, { status: 404 });
    }

    const [researchRes, deliverablesRes, tacticsRes] = await Promise.all([
      supabase.from('ai_research_items').select('*').eq('cycle_id', cycle.id),
      supabase.from('ai_content_deliverables').select('*').eq('cycle_id', cycle.id),
      supabase.from('ai_platform_tactics').select('*').eq('cycle_id', cycle.id),
    ]);

    const researchItems = researchRes.data || [];
    const deliverables = deliverablesRes.data || [];
    const tactics = tacticsRes.data || [];

    const igDeliverable = deliverables.find((d) => d.platform === 'instagram');
    const xDeliverable = deliverables.find((d) => d.platform === 'x');
    const discordDeliverable = deliverables.find((d) => d.platform === 'discord');

    const igTactic = tactics.find((t) => t.platform === 'instagram');
    const xTactic = tactics.find((t) => t.platform === 'x');

    // 🌟 3. サヤ取りレポート（profitableCards）の地域別復元
    const buildProfitableCards = (regionKey: 'us' | 'eu' | 'asia') => {
      const items = researchItems.filter((i) => i.agent_key === 'arbitrage' && i.region === regionKey);
      if (items.length === 0) return null;

      const slotMap: Record<string, any> = {};
      let summaryObj: any = null;

      for (const item of items) {
        if (!slotMap[item.slot_key]) {
          slotMap[item.slot_key] = {
            slotKey: item.slot_key,
            slotLabel: item.slot_key,
            tiers: [],
          };
        }
        if (item.raw_payload) {
          slotMap[item.slot_key].tiers.push(item.raw_payload);
          if (item.raw_payload.reportSummary && !summaryObj) {
            summaryObj = item.raw_payload.reportSummary;
          }
        }
      }

      return {
        title: `【${regionKey.toUpperCase()}】アービトラージレポート`,
        claim: `${regionKey.toUpperCase()}市場向け輸入調達レポート`,
        summary: summaryObj,
        slots: Object.values(slotMap),
      };
    };

    // 🌟 4. トレンドレポート（trendInsights）の地域別復元
    const buildTrendInsights = (regionKey: 'us' | 'eu' | 'asia') => {
      const items = researchItems.filter((i) => i.agent_key === 'trend' && i.region === regionKey);
      if (items.length === 0) return null;

      const hypoMap: Record<string, any> = {};
      let summaryObj: any = null;

      for (const item of items) {
        const headline = item.slot_key;
        if (!hypoMap[headline]) {
          hypoMap[headline] = {
            headline,
            signal: item.raw_payload?.hypothesis?.signal || item.research_insight,
            timeframe: item.liquidity_indicator || '約2週間後',
            items: [],
          };
        }
        if (item.raw_payload) {
          hypoMap[headline].items.push(item.raw_payload);
          if (item.raw_payload.reportSummary && !summaryObj) {
            summaryObj = item.raw_payload.reportSummary;
          }
        }
      }

      return {
        title: `【${regionKey.toUpperCase()}】市場トレンドレポート`,
        claim: `${regionKey.toUpperCase()}市場の急騰先行シグナル`,
        createdAt: cycle.created_at,
        summary: summaryObj,
        hypotheses: Object.values(hypoMap),
      };
    };

    const profitableCards = {
      us: buildProfitableCards('us'),
      eu: buildProfitableCards('eu'),
      asia: buildProfitableCards('asia'),
    };

    const trendInsights = {
      us: buildTrendInsights('us'),
      eu: buildTrendInsights('eu'),
      asia: buildTrendInsights('asia'),
    };

    const formattedData = {
      cycleId: cycle.id,
      pipelineStatus: cycle.status,
      category: cycle.category,
      targetWeek: cycle.target_week,
      trendInsights,
      profitableCards,
      accountInsights: igTactic?.raw_insights || null,
      xAccountInsights: xTactic?.raw_insights || null,
      chiefPackage: {
        chosenCardOrItem: researchItems.find((i) => i.is_mvp)?.card_name || '選定完了',
        mvpHighlight: researchItems.find((i) => i.is_mvp) || null,
        approvedItems: researchItems.filter((i) => i.is_selected),
        contentCalendar: researchItems
          .filter((i) => i.is_selected)
          .map((i) => ({
            dayOfWeek: i.assigned_day,
            dayLabelJa: i.assigned_day,
            postType: i.slot_key,
            selectedCardOrTopic: i.card_name,
            hookFact: i.core_hook_fact || `${i.card_name} (粗利: ¥${i.price_spread_jpy})`,
            hiddenActionReason: i.curator_rationale || '非公開',
            directiveForCreator: {
              instagramAngle: 'カルーセル解説',
              xTwitterAngle: '140字フック＋スレッド',
              discordOfferAngle: '大口卸オファー',
            },
          })),
      },
      snsPosts: igDeliverable?.content_payload || null,
      xPosts: xDeliverable?.content_payload || null,
      salesDM: discordDeliverable?.content_payload || null,
      gate1Audits: researchItems
        .filter((i) => i.is_selected)
        .map((i) => ({
          id: i.id,
          card: i.card_name,
          slot: i.slot_key,
          region: i.region,
          status: i.gate1_status,
          checks: i.gate1_checks,
          feedback: i.gate1_feedback,
        })),
      gate2Audits: deliverables.map((d) => ({
        id: d.id,
        platform: d.platform,
        day: d.day_of_week,
        status: d.gate2_status,
        checks: d.gate2_checks,
        feedback: d.gate2_feedback,
      })),
    };

    return NextResponse.json({ success: true, cycle, data: formattedData });
  } catch (error: any) {
    console.error('Status fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}