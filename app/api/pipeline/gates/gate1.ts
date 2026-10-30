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
  suggestedAction: 'pass' | 'swap_with_backup';
}

export async function runGate1Audit(
  items: ResearchItemRecord[],
  category: string = 'pokemon'
): Promise<{ allPassed: boolean; results: Gate1AuditResult[] }> {
  const mathCheckedResults: Gate1AuditResult[] = [];
  const itemsToLlmCheck: ResearchItemRecord[] = [];

  // 1. コードによる決定論的検算（四則演算・マージン・ROI）
  for (const item of items) {
    const expectedSpread = item.target_sold_price_jpy - item.jp_buy_price_jpy;
    const expectedROI = Math.round((expectedSpread / item.jp_buy_price_jpy) * 100);

    const isSpreadValid = Math.abs(expectedSpread - item.price_spread_jpy) <= 150;
    const isROIValid = Math.abs(expectedROI - item.spread_roi_percent) <= 3;

    if (!isSpreadValid || !isROIValid) {
      mathCheckedResults.push({
        itemId: item.id,
        passed: false,
        checks: {
          card_existence_verified: false,
          roi_calculation_valid: false,
          official_tournament_compliant: false,
        },
        feedback: `検算不一致: 計算差額 ¥${expectedSpread} (申告: ¥${item.price_spread_jpy}), ROI ${expectedROI}% (申告: ${item.spread_roi_percent}%)`,
        suggestedAction: 'swap_with_backup',
      });
    } else {
      itemsToLlmCheck.push(item);
    }
  }

  if (itemsToLlmCheck.length === 0) {
    return { allPassed: false, results: mathCheckedResults };
  }

  // 2. LLMによるファクト・規約チェック
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 2048,
    apiKey: apiKey,
  });

  const prompt = `あなたは越境トレカ事業における最高商材監査役【Gate 1: Product Inspector】です。
キュレーターが選定した以下の【${category}】商材リストを冷徹に監査してください。

【厳格監査基準】:
1. 実在性・型番:
   - 架空カードや存在しないレアリティの組み合わせは即却下。
2. 欧米公式大会（Play! Pokémon等）レギュレーションの厳守:
   - 欧米公式大会では日本語版カードの使用は全面禁止されています。
   - 「大会で強い」という理由による日本語版の【ノーマルカード、汎用グッズ、ACE SPEC、低レアリティパーツ】の選定は【完全禁止】です。
   - 採用可能なのは【最高レア鑑賞用（SAR/UR/CHR/AR）】【日本限定プロモ】【絶版ヴィンテージシングル】【高額PSA10】のみです。
3. 状態グレードの一致:
   - 日本国内仕入れ想定と海外現地販売相場の状態（例: Raw NM同士、PSA10同士）が一致しているか。

【監査対象リスト】:
${JSON.stringify(
  itemsToLlmCheck.map((i) => ({
    id: i.id,
    cardName: i.card_name,
    conditionGrade: i.condition_grade,
    slotKey: i.slot_key,
    jpBuyPrice: i.jp_buy_price_jpy,
    targetPriceJPY: i.target_sold_price_jpy,
    rationale: i.curator_rationale,
  })),
  null,
  2
)}

以下のJSON形式のみを出力してください:
{
  "auditResults": [
    {
      "id": "商材のID",
      "checks": {
        "card_existence_verified": true,
        "roi_calculation_valid": true,
        "official_tournament_compliant": true
      },
      "passed": true,
      "feedback": "不合格理由（合格ならnull）",
      "suggestedAction": "pass または swap_with_backup"
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());
    const llmResults: Gate1AuditResult[] = (parsed?.auditResults || []).map((r: any) => ({
      itemId: r.id,
      passed: Boolean(r.passed),
      checks: r.checks,
      feedback: r.feedback || null,
      suggestedAction: r.passed ? 'pass' : 'swap_with_backup',
    }));

    const combinedResults = [...mathCheckedResults, ...llmResults];
    return {
      allPassed: combinedResults.every((r) => r.passed),
      results: combinedResults,
    };
  } catch (error: any) {
    console.error('Gate 1 audit error:', error);
    return {
      allPassed: false,
      results: mathCheckedResults,
    };
  }
}