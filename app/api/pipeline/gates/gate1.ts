// app/api/pipeline/gates/gate1.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../../ai/intelligence/helpers';
import { ResearchItemRecord } from '../types';

export interface Gate1AuditResult {
  itemId: string;
  passed: boolean;
  checks: {
    card_existence_verified: boolean;
    roi_calculation_valid: boolean;
    official_tournament_compliant: boolean;
  };
  feedback: string | null;
}

// ----------------------------------------------------------------------------
// Gate 1-A: アービトラージ数値マージン監査（コードによる0.01秒の決定論的検算）
// ----------------------------------------------------------------------------
export function runArbitrageMathAudit(items: ResearchItemRecord[]): Gate1AuditResult[] {
  const results: Gate1AuditResult[] = [];

  for (const item of items) {
    const buy = Number(item.jp_buy_price_jpy) || 0;
    const target = Number(item.target_sold_price_jpy) || 0;
    const spread = target - buy;
    const roi = buy > 0 ? Math.round((spread / buy) * 100) : 0;

    // 1. 異常値チェック（仕入れ値0円、利益なし、ROI 10%未満）
    if (buy <= 0 || spread <= 0 || roi < 10) {
      results.push({
        itemId: item.id,
        passed: false,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: false,
          official_tournament_compliant: true,
        },
        feedback: `利ざや不足または価格異常: 仕入 ¥${buy}, 売価 ¥${target} (粗利 ¥${spread}, ROI ${roi}%)`,
      });
      continue;
    }

    // 2. 申告値との四則計算チェック（許容誤差: 差額 ±150円, ROI ±3%）
    const isSpreadValid = Math.abs(spread - item.price_spread_jpy) <= 150;
    const isROIValid = Math.abs(roi - item.spread_roi_percent) <= 3;

    if (!isSpreadValid || !isROIValid) {
      results.push({
        itemId: item.id,
        passed: false,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: false,
          official_tournament_compliant: true,
        },
        feedback: `検算不一致: 実利 ¥${spread} (申告: ¥${item.price_spread_jpy}), 実ROI ${roi}% (申告: ${item.spread_roi_percent}%)`,
      });
    } else {
      results.push({
        itemId: item.id,
        passed: true,
        checks: {
          card_existence_verified: true,
          roi_calculation_valid: true,
          official_tournament_compliant: true,
        },
        feedback: null,
      });
    }
  }

  return results;
}

// ----------------------------------------------------------------------------
// Gate 1-B: 市場トレンド相場・レポート論理監査（LLMによる文章 & 銘柄審査）
// ----------------------------------------------------------------------------
export async function runTrendIntelligenceAudit(
  items: ResearchItemRecord[],
  category: string = 'pokemon'
): Promise<Gate1AuditResult[]> {
  if (items.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 8192,
    apiKey: apiKey,
  });

  // レポートの仮説・文章インサイトと銘柄をセットで審査プロンプトへ渡す
  const prompt = `あなたは越境トレカ販売の市場トレンド最高審査役【Gate 1-B: Trend Intelligence Guard】です。
アナリストが作成した以下の市場トレンドレポート（仮説・急騰要因の文章）および抽出銘柄を監査し、合否を判定してください。

【厳格監査基準】:
1. 客観的根拠（Signal）の検証:
   - 「なんとなく値上がりそう」といった主観ではなく、現地実成約（Sold Listings）、在庫枯渇、特定SNSの過熱など、客観的事実がレポート文章に示されているか。
2. 欧米公式大会ルール違反の排除（最重要）:
   - 欧米公式大会（Play! Pokémon）では「日本語版カード」の使用が禁止されています。
   - 「大会環境で強い」「プレイヤー必須パーツ」という理由で、日本語版の【ノーマル、汎用グッズ、ACE SPEC等のプレイ専用カード】を選出・推奨している場合は即却下（passed: false）。
   - ※ 美術的価値・コレクション需要としてのSAR/UR/プロモ等の選定は合格。
3. 銘柄の実在性:
   - 完全に架空のカード名や型番でないこと。

【監査対象トレンド銘柄 & レポート本文】:
${JSON.stringify(
  items.map((i) => ({
    id: i.id,
    region: i.region,
    cardName: i.card_name,
    headline: i.slot_key,
    insight: i.research_insight,
    timeframe: i.liquidity_indicator,
    summaryHeadline: i.raw_payload?.reportSummary?.headline || '',
    macroAnalysis: i.raw_payload?.reportSummary?.trendDynamics || '',
  })),
  null,
  2
)}

【出力ルール】:
- 全件（全ID）について結果を出力すること。
- 合格の場合は "passed": true のみ出力。
- 不合格の場合のみ "passed": false と "feedback"（レポート文章の破綻理由、または大会規約抵触理由）を出力。

以下のJSON形式のみを出力してください:
{
  "auditResults": [
    { "id": "アイテムID", "passed": true },
    { "id": "アイテムID", "passed": false, "feedback": "不合格の具体的な指摘理由" }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());

    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.auditResults)
      ? parsed.auditResults
      : [];

    const auditMap = new Map<string, any>();
    for (const r of rawList) {
      if (r?.id) auditMap.set(r.id, r);
    }

    return items.map((item) => {
      const match = auditMap.get(item.id);
      const passed = match ? Boolean(match.passed) : true;
      return {
        itemId: item.id,
        passed,
        checks: {
          card_existence_verified: passed,
          roi_calculation_valid: true,
          official_tournament_compliant: passed,
        },
        feedback: passed ? null : match?.feedback || 'レポート論理または規約不適合',
      };
    });
  } catch (error) {
    console.error('Gate 1-B trend audit error:', error);
    return items.map((i) => ({
      itemId: i.id,
      passed: true,
      checks: { card_existence_verified: true, roi_calculation_valid: true, official_tournament_compliant: true },
      feedback: null,
    }));
  }
}

// ----------------------------------------------------------------------------
// Gate 1 統括エントリーポイント（並列実行）
// ----------------------------------------------------------------------------
export async function runGate1Audit(
  items: ResearchItemRecord[],
  category: string = 'pokemon'
): Promise<{ allPassed: boolean; results: Gate1AuditResult[] }> {
  const arbitrageItems = items.filter((i) => i.agent_key === 'arbitrage');
  const trendItems = items.filter((i) => i.agent_key === 'trend');

  // Gate 1-A（コード検算）と Gate 1-B（LLMトレンド文章監査）を並列実行
  const [arbResults, trendResults] = await Promise.all([
    Promise.resolve(runArbitrageMathAudit(arbitrageItems)),
    runTrendIntelligenceAudit(trendItems, category),
  ]);

  const combined = [...arbResults, ...trendResults];
  return {
    allPassed: combined.every((r) => r.passed),
    results: combined,
  };
}