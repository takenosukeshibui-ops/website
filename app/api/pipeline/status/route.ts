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

    // 1. 履歴一覧返却
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

    // 2. 特定サイクルの全データ取得
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

    // 3. サヤ取りレポート復元（重複排除・1スロット1カードに正確に再構築）
    const buildProfitableCards = (regionKey: 'us' | 'eu' | 'asia') => {
      const items = researchItems.filter((i) => i.agent_key === 'arbitrage' && i.region === regionKey);
      if (items.length === 0) return null;

      const slotMap: Record<string, any> = {};
      let exchangeRateObj: any = null;

      for (const item of items) {
        const slotKey = item.slot_key;
        if (!slotMap[slotKey]) {
          slotMap[slotKey] = {
            slotKey: slotKey,
            slotLabel: item.raw_payload?.slotLabel || slotKey,
            tiers: [],
          };
        }

        if (item.raw_payload?.exchangeRate && !exchangeRateObj) {
          exchangeRateObj = item.raw_payload.exchangeRate;
        }

        // 🌟 重複排除: 本命アイテム（isMain === true）を親tierとして登録
        const isMain = Boolean(item.raw_payload?.isMain || item.raw_payload?.role === '本命');
        if (isMain) {
          const mainItemData = item.raw_payload?.mainItem || item.raw_payload?.currentItem || {
            cardName: item.card_name,
            conditionGrade: item.condition_grade,
            jpBuyPriceJPY: `¥${item.jp_buy_price_jpy.toLocaleString()}`,
            targetSoldPrice: item.target_sold_price_local,
            priceSpreadJPY: `¥${item.price_spread_jpy.toLocaleString()}`,
            spreadROI: `${item.spread_roi_percent}%`,
            liquidity: item.liquidity_indicator,
            insight: item.research_insight,
            jpEvidenceUrl: item.raw_payload?.jpEvidenceUrl,
          };

          // 該当スロットの代替候補（subItems）を抽出してバインド
          const subItemsData = items
            .filter((sub) => sub.slot_key === slotKey && !sub.raw_payload?.isMain && sub.raw_payload?.role !== '本命')
            .map((sub) => ({
              cardName: sub.card_name,
              conditionGrade: sub.condition_grade,
              jpBuyPriceJPY: `¥${sub.jp_buy_price_jpy.toLocaleString()}`,
              targetSoldPrice: sub.target_sold_price_local,
              priceSpreadJPY: `¥${sub.price_spread_jpy.toLocaleString()}`,
              spreadROI: `${sub.spread_roi_percent}%`,
              liquidity: sub.liquidity_indicator,
              insight: sub.research_insight,
              jpEvidenceUrl: sub.raw_payload?.jpEvidenceUrl,
            }));

          slotMap[slotKey].tiers = [
            {
              priceTier: item.price_tier,
              priceTierLabel: item.raw_payload?.priceTierLabel || '本日の指定価格帯',
              mainItem: mainItemData,
              subItems: subItemsData,
            },
          ];
        }
      }

      return {
        title: `【${regionKey.toUpperCase()}】アービトラージレポート`,
        claim: `${regionKey.toUpperCase()}市場向け輸入調達レポート（全5スロット網羅）`,
        exchangeRate: exchangeRateObj,
        slots: Object.values(slotMap),
      };
    };

    // 4. トレンドレポート復元
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
          hypoMap[headline].items.push({
            cardName: item.card_name,
            condition: item.condition_grade,
            jpBuyPriceJPY: `¥${item.jp_buy_price_jpy.toLocaleString()}`,
            currentLocalPrice: item.target_sold_price_local,
            impactLogic: item.research_insight,
            jpEvidenceUrl: item.raw_payload?.jpEvidenceUrl,
          });
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

    const mvpItem = researchItems.find((i) => i.is_mvp);

    const formattedData = {
      cycleId: cycle.id,
      pipelineStatus: cycle.status,
      category: cycle.category,
      targetWeek: cycle.target_week,
      trendInsights: {
        us: buildTrendInsights('us'),
        eu: buildTrendInsights('eu'),
        asia: buildTrendInsights('asia'),
      },
      profitableCards: {
        us: buildProfitableCards('us'),
        eu: buildProfitableCards('eu'),
        asia: buildProfitableCards('asia'),
      },
      accountInsights: igTactic?.raw_insights || null,
      xAccountInsights: xTactic?.raw_insights || null,
      chiefPackage: {
        chosenCardOrItem: mvpItem?.card_name || '選定完了',
        mvpHighlight: mvpItem
          ? {
              cardName: mvpItem.card_name,
              region: mvpItem.region,
              slotKey: mvpItem.slot_key,
              hookFact: mvpItem.core_hook_fact || `${mvpItem.card_name} (粗利: ¥${mvpItem.price_spread_jpy})`,
              selectionReason: mvpItem.curator_rationale || '流動性と粗利マージンを総合勘案して選定',
            }
          : null,
      },
      snsPosts: igDeliverable?.content_payload || null,
      xPosts: xDeliverable?.content_payload || null,
      salesDM: discordDeliverable?.content_payload || null,
      gate1Audits: researchItems
        .filter((i) => i.gate1_status !== 'pending')
        .map((i) => ({
          id: i.id,
          agentKey: i.agent_key,
          card: i.card_name,
          slot: i.slot_key,
          region: i.region,
          priceTier: i.price_tier,
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