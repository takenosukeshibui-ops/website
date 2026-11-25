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
  contentType: 'arbitrage';
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

  const filteredCandidates = researchCandidates.filter((c) => c.agent_key === 'arbitrage');

  const igTactic = platformTactics?.find((t) => t.platform === 'instagram');
  const xTactic = platformTactics?.find((t) => t.platform === 'x');
  const curatorDirectives = {
    instagram: igTactic?.raw_insights?.curatorDirectives || null,
    x: xTactic?.raw_insights?.curatorDirectives || null,
  };

  const candidatesSummary = filteredCandidates.map((c) => ({
    id: c.id,
    agentKey: c.agent_key,
    region: c.region,
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
SNSアナリストからのプラットフォーム反響示唆（RSI）と、Gate 1を通過した合格銘柄リストを精査し、**火曜日〜土曜日（Tuesday〜Saturday）の5日間**の【アービトラージ週間コンテンツ・ポートフォリオ】を編成してください。
**火曜〜土曜の5日間すべて contentType: "arbitrage" のアービトラージ投稿のみ**で構成してください。

【SNSアナリストからの直近スロット傾斜示唆（RSI）】:
${JSON.stringify(curatorDirectives, null, 2)}

【Gate 1 合格商材リスト】:
${JSON.stringify(candidatesSummary, null, 2)}

■ 編成ルール:
1. 対象曜日の厳守（火曜〜土曜の5日分）:
   - weeklyLineup には "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" の5日分のみを含めてください。
   - 各日の contentType は必ず "arbitrage" としてください。
   - SNSアナリストの slotWeights 指示で特定スロット（例: modern_meta）が "high" に指定されている場合は、5日間の枠内でそのスロットを多めに配分し、"low" のスロットを減枠・集約してください。
2. 【3地域トリオ】編成:
   - 各日の items には、合格候補から最大3商品（北米 us / 欧州 eu / アジア asia からバランスよく配置）を選出してください。
   - 担当スロット（例: modern_metaの日ならmodern_meta）の合格銘柄から優先して選定してください。
3. 看板MVP（全体で1商品のみ）:
   - 火曜〜土曜に選ばれた全商材の中から、今週最も相場の歪みが大きく、SNSのフック力と実利を兼ね備えた【看板MVP（mvpItemId）】を1商品だけ指定してください。
4. データの整合性:
   - itemId は必ず上記【Gate 1 合格商材リスト】に実在する id をそのまま指定してください。架空のIDや未登録カードの生成は厳禁です。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "strategyBlueprint": {
    "headline": "火〜土5日間のアービトラージ編成方針",
    "adaptationRationale": "SNSアナリストの指示からなぜこのスロット比率に調整したのかの根拠",
    "slotDistribution": {
      "modern_meta": 2,
      "promos_exclusive": 1,
      "neo_vintage": 1,
      "graded_sealed": 1
    }
  },
  "mvpItemId": "合格リストに実在するMVPアイテムのID",
  "weeklyLineup": [
    {
      "day": "Tuesday",
      "contentType": "arbitrage",
      "slotKey": "modern_meta",
      "themeLabel": "現行モダン・高需要枠（世界3市場アービトラージ比較）",
      "dayRationale": "選定理由",
      "items": [
        {
          "itemId": "US候補のID",
          "region": "us",
          "role": "北米注目枠",
          "isMvp": false,
          "coreHookFact": "国内¥X,XXX ➔ 北米成約$XX (粗利+¥X,XXX)",
          "rationale": "選定理由"
        }
      ]
    },
    { "day": "Wednesday", "contentType": "arbitrage", "slotKey": "arbitrage_slot", "themeLabel": "水曜アービトラージ枠", "dayRationale": "選定理由", "items": [] },
    { "day": "Thursday", "contentType": "arbitrage", "slotKey": "arbitrage_slot", "themeLabel": "木曜アービトラージ枠", "dayRationale": "選定理由", "items": [] },
    { "day": "Friday", "contentType": "arbitrage", "slotKey": "arbitrage_slot", "themeLabel": "金曜アービトラージ枠", "dayRationale": "選定理由", "items": [] },
    { "day": "Saturday", "contentType": "arbitrage", "slotKey": "arbitrage_slot", "themeLabel": "土曜アービトラージ枠", "dayRationale": "選定理由", "items": [] }
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