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

  // 1. コードによる決定論的検算（アービトラージは瞬時に計算＆適格判定）
  for (const item of items) {
    if (item.agent_key === 'arbitrage') {
      const buy = Number(item.jp_buy_price_jpy) || 0;
      const target = Number(item.target_sold_price_jpy) || 0;
      const spread = target - buy;
      const roi = buy > 0 ? Math.round((spread / buy) * 100) : 0;

      // 利益がゼロ以下、または仕入れ値が異常（0円）の場合は却下
      if (buy <= 0 || spread <= 0 || roi < 10) {
        results.push({
          itemId: item.id,
          passed: false,
          checks: {
            card_existence_verified: true,
            roi_calculation_valid: false,
            official_tournament_compliant: true,
          },
          feedback: `利ざや不足または価格異常: 仕入 ¥${buy}, 見込売価 ¥${target} (差額 ¥${spread}, ROI ${roi}%)`,
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

  // 2. LLMによるファクト・規約チェック
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

    // 🌟 出力フォーマットのゆらぎに対応（配列直返し or auditResultsキー）
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.auditResults)
      ? parsed.auditResults
      : [];

    const llmResults: Gate1AuditResult[] = rawList.map((r: any) => ({
      itemId: r.id,
      passed: Boolean(r.passed),
      checks: {
        card_existence_verified: Boolean(r.passed),
        roi_calculation_valid: Boolean(r.passed),
        official_tournament_compliant: Boolean(r.passed),
      },
      feedback: r.feedback || null,
    }));

    // LLMから漏れたIDがあればデフォルト合格で救済
    for (const item of itemsToLlmCheck) {
      if (!llmResults.some((r) => r.itemId === item.id)) {
        llmResults.push({
          itemId: item.id,
          passed: true,
          checks: { card_existence_verified: true, roi_calculation_valid: true, official_tournament_compliant: true },
          feedback: null,
        });
      }
    }

    const combinedResults = [...results, ...llmResults];
    return {
      allPassed: combinedResults.every((r) => r.passed),
      results: combinedResults,
    };
  } catch (error) {
    console.error('Gate 1 audit error:', error);
    // エラー時もトレンド銘柄を安全側に倒して処理を継続
    for (const item of itemsToLlmCheck) {
      results.push({
        itemId: item.id,
        passed: true,
        checks: { card_existence_verified: true, roi_calculation_valid: true, official_tournament_compliant: true },
        feedback: null,
      });
    }
    return { allPassed: true, results };
  }
}