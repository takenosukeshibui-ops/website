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

export async function runGate1Audit(
  items: ResearchItemRecord[],
  category: string = 'pokemon'
): Promise<{ allPassed: boolean; results: Gate1AuditResult[] }> {
  const results: Gate1AuditResult[] = [];
  const itemsToLlmCheck: ResearchItemRecord[] = [];

  // 1. コードによる決定論的検算（アービトラージはLLMを使わず瞬時に正確に判定）
  for (const item of items) {
    if (item.agent_key === 'arbitrage') {
      const expectedSpread = item.target_sold_price_jpy - item.jp_buy_price_jpy;
      const expectedROI = Math.round((expectedSpread / item.jp_buy_price_jpy) * 100);

      const isSpreadValid = Math.abs(expectedSpread - item.price_spread_jpy) <= 150;
      const isROIValid = Math.abs(expectedROI - item.spread_roi_percent) <= 3;

      if (!isSpreadValid || !isROIValid) {
        results.push({
          itemId: item.id,
          passed: false,
          checks: {
            card_existence_verified: false,
            roi_calculation_valid: false,
            official_tournament_compliant: false,
          },
          feedback: `検算不一致: 実際の差額は ¥${expectedSpread} (申告: ¥${item.price_spread_jpy}), 実際のROIは ${expectedROI}% (申告: ${item.spread_roi_percent}%)`,
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
    } else {
      // トレンド銘柄はLLMによる規約・実在性審査へ回す
      itemsToLlmCheck.push(item);
    }
  }

  if (itemsToLlmCheck.length === 0) {
    return { allPassed: results.every((r) => r.passed), results };
  }

  // 2. LLMによるファクト・規約チェック（文字数を浪費しないコンパクト出力）
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 8192,
    apiKey: apiKey,
  });

  const prompt = `あなたは越境トレカ販売の【Gate 1: Fact & Rule Checker】です。
以下の候補銘柄リストを監査し、合否を判定してください。

【厳格監査基準】:
1. 存在確認: 完全に架空のカード名でないこと。
2. 欧米公式大会ルール違反の排除: 欧米の公式大会では「日本語版カード」の使用が禁止されています。「大会で強いから」という理由でノーマル、汎用グッズ、ACE SPEC等のプレイ専用カードを選定している場合は即却下（passed: false）。※コレクション目的のSAR/UR等は合格。

【監査対象銘柄】:
${JSON.stringify(
  itemsToLlmCheck.map((i) => ({
    id: i.id,
    cardName: i.card_name,
    insight: i.research_insight || '',
  })),
  null,
  2
)}

【出力ルール】:
- 全件（全ID）について結果を出力すること。
- 合格の場合は "passed": true のみ出力。
- 不合格の場合のみ "passed": false と "feedback"（不合格理由）を出力。

以下のJSON形式のみを出力してください:
{
  "auditResults": [
    { "id": "アイテムID", "passed": true },
    { "id": "アイテムID", "passed": false, "feedback": "不合格の理由" }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());

    const llmResults: Gate1AuditResult[] = (parsed?.auditResults || []).map((r: any) => ({
      itemId: r.id,
      passed: Boolean(r.passed),
      checks: {
        card_existence_verified: Boolean(r.passed),
        roi_calculation_valid: Boolean(r.passed),
        official_tournament_compliant: Boolean(r.passed),
      },
      feedback: r.feedback || null,
    }));

    const combinedResults = [...results, ...llmResults];
    return {
      allPassed: combinedResults.every((r) => r.passed),
      results: combinedResults,
    };
  } catch (error) {
    console.error('Gate 1 audit error:', error);
    return { allPassed: false, results };
  }
}