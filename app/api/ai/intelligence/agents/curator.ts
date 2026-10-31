// app/api/ai/intelligence/agents/curator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName, getAgentRules } from '../helpers';

export interface CuratorItemSelection {
  itemId: string;
  region: 'us' | 'eu' | 'asia';
  role: string;
  isMvp: boolean;
  coreHookFact: string;
  rationale: string;
}

export interface CuratorDailyLineup {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  contentType: 'arbitrage' | 'market_trend' | 'trend_track_record';
  slotKey: string;
  themeLabel: string;
  items: CuratorItemSelection[];
  dayRationale: string;
}

export interface CuratorStrategyBlueprint {
  headline: string;
  adaptationRationale: string;
  slotDistribution: Record<string, number>;
}

export interface CuratorResponse {
  strategyBlueprint: CuratorStrategyBlueprint;
  mvpItemId: string;
  weeklyLineup: CuratorDailyLineup[];
}

export async function runCuratorSelection(
  researchCandidates: any[],
  platformTactics?: any[],
  category: string = 'pokemon'
): Promise<CuratorResponse | null> {
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('chief');
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.15,
    maxOutputTokens: 8192,
    apiKey,
  });

  // SNSアナリスト（IG / X）からの示唆を抽出
  const igTactic = platformTactics?.find((t) => t.platform === 'instagram');
  const xTactic = platformTactics?.find((t) => t.platform === 'x');
  const curatorDirectives = {
    instagram: igTactic?.raw_insights?.curatorDirectives || null,
    x: xTactic?.raw_insights?.curatorDirectives || null,
  };

  // トークン節約のため候補データを要約
  const candidatesSummary = researchCandidates.map((c) => ({
    id: c.id,
    agentKey: c.agent_key, // 'arbitrage' | 'trend'
    region: c.region,       // 'us' | 'eu' | 'asia'
    slotKey: c.slot_key,
    priceTier: c.price_tier || null,
    cardName: c.card_name,
    condition: c.condition_grade,
    buyJPY: c.jp_buy_price_jpy,
    sellTarget: c.target_sold_price_local,
    spreadJPY: c.price_spread_jpy,
    roi: c.spread_roi_percent ? `${c.spread_roi_percent}%` : null,
    liquidity: c.liquidity_indicator,
    insight: c.research_insight,
  }));

  const prompt = `あなたは越境【${categoryName}】事業の最高編成責任者【チーフ・キュレーター】です。
SNSアナリストからのプラットフォーム反響示唆（RSI）と、Gate 1を通過した合格銘柄リストを精査し、今週1週間（月曜日〜日曜日）の【最適週間コンテンツ・ポートフォリオ】を編成してください。

【SNSアナリストからの直近スロット傾斜示唆（RSI）】:
${JSON.stringify(curatorDirectives, null, 2)}

【Gate 1 合格商材リスト（全候補）】:
${JSON.stringify(candidatesSummary, null, 2)}

■ 編成ルール（動的自己適応 / RSI）:
1. 週間スロットの動的配分:
   - 基本構成は「先行トレンド予測 1日」「的中実績（答え合わせ）1日」「アービトラージ 5日」です。
   - ただし、SNSアナリストの slotWeights 指示で特定スロット（例: modern_meta）が "high" に指定されている場合は、そのスロットを週2〜3日に増枠し、"low" のスロットを減枠・集約するなど柔軟に比率を傾斜配分してください。
   - トレンド予測の配置曜日は、アナリスト推奨（recommendedTrendDay）を最優先で考慮してください。
2. アービトラージ日の【3地域トリオ】厳格編成:
   - アービトラージを配信する日は、必ず【北米（us）1商品、欧州（eu）1商品、アジア（asia）1商品】の計3商品をセットで選出してください（items配列に3件配置）。
   - 3商品とも、その日の担当スロット（例: modern_metaの日なら3商品すべてmodern_meta）から選定すること。
3. トレンド予測日 & 的中実績日の編成:
   - 先行トレンド予測（market_trend）の日は、agentKey: "trend" の合格銘柄から最もシグナルが強い銘柄を選出してください。
   - 的中実績（trend_track_record）の日は、過去予測から実際に価格が跳ねた実績証明に最も適した銘柄を1件選出してください。
4. 看板MVP（全体で1商品のみ）:
   - 7日間に選ばれた全商材の中から、今週最も相場の歪みが大きく、SNSのフック力と実利を兼ね備えた【看板MVP（mvpItemId）】を1商品だけ指定してください。
5. データの整合性:
   - itemId は必ず上記【Gate 1 合格商材リスト】に実在する id をそのまま指定してください。架空のIDや未登録カードの生成は厳禁です。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "strategyBlueprint": {
    "headline": "今週の週間編成方針（データに基づく核心）",
    "adaptationRationale": "SNSアナリストの指示からなぜこの曜日順・スロット比率に調整したのかの根拠",
    "slotDistribution": {
      "modern_meta": 2,
      "market_trend": 1,
      "promos_exclusive": 1,
      "neo_vintage": 1,
      "trend_track_record": 1,
      "high_end_sealed": 1
    }
  },
  "mvpItemId": "合格リストに実在するMVPアイテムのID",
  "weeklyLineup": [
    {
      "day": "Monday",
      "contentType": "market_trend",
      "slotKey": "market_trend",
      "themeLabel": "海外先行トレンド急騰予測",
      "dayRationale": "週初めの保存数獲得を狙い月曜へ前倒し配置",
      "items": [
        {
          "itemId": "合格リストのID",
          "region": "us",
          "role": "先行シグナル注目株",
          "isMvp": false,
          "coreHookFact": "事実数値（例: 海外在庫枯渇による先行急騰シグナル）",
          "rationale": "選定理由"
        }
      ]
    },
    {
      "day": "Tuesday",
      "contentType": "arbitrage",
      "slotKey": "modern_meta",
      "themeLabel": "現行モダン・高需要枠（世界3市場比較）",
      "dayRationale": "保存率No.1スロットにつき週前半の主軸として配置",
      "items": [
        {
          "itemId": "US候補のID",
          "region": "us",
          "role": "北米注目枠",
          "isMvp": false,
          "coreHookFact": "国内¥X,XXX ➔ 北米成約$XX (粗利+¥X,XXX)",
          "rationale": "選定理由"
        },
        {
          "itemId": "EU候補のID",
          "region": "eu",
          "role": "欧州注目枠",
          "isMvp": false,
          "coreHookFact": "国内¥X,XXX ➔ 欧州成約€XX (粗利+¥X,XXX)",
          "rationale": "選定理由"
        },
        {
          "itemId": "ASIA候補のID",
          "region": "asia",
          "role": "アジア注目枠",
          "isMvp": false,
          "coreHookFact": "国内¥X,XXX ➔ アジア成約SGD XX (粗利+¥X,XXX)",
          "rationale": "選定理由"
        }
      ]
    }
    // ... 水曜から日曜まで計7日分
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
  } catch (error) {
    console.error('[Curator] Selection failed:', error);
    return null;
  }
}