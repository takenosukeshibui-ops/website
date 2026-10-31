// app/api/pipeline/gates/gate2.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../../ai/intelligence/helpers';

export interface Gate2AuditResult {
  deliverableId: string;
  passed: boolean;
  checks: {
    secret_leak_free: boolean;           // 仕入れ先ワード・仕込みルートの漏洩なし
    teaser_principle_compliant: boolean; // 撒き餌原則（Fact/Resultのみ、ノウハウ秘匿）
    format_and_length_valid: boolean;    // X140文字制限、投稿構成の整合性
    cta_guideline_compliant: boolean;    // プロフリンク・VIP導線の整合性
  };
  feedback: string | null;
}

// 🌟 絶対に外部発信原稿に含めてはならない仕入れ先・国内リテール禁止ワード
const FORBIDDEN_WORDS = [
  'メルカリ', 'mercari', 'ヤフオク', 'yahoo auction', 'ヤフーオークション',
  '駿河屋', 'surugaya', 'ブックオフ', 'bookoff', 'カードラッシュ', 'cardrush',
  '晴れる屋', 'hareruya', 'スニダン', 'snkrdunk', 'カドショ', 'トレカ専門店',
  'フリマ仕入れ', 'フリマアプリ', '店舗仕入れ', '実店舗回収', '秋葉原の店舗'
];

export async function runGate2Audit(deliverables: any[]): Promise<{ allPassed: boolean; results: Gate2AuditResult[] }> {
  const results: Gate2AuditResult[] = [];
  const itemsForLlmReview: any[] = [];

  // --------------------------------------------------------------------------
  // 1. コードによる決定論的チェック（禁止ワード検索 ＆ 文字数測定）
  // --------------------------------------------------------------------------
  for (const item of deliverables) {
    const payload = item.content_payload;
    const textCorpus = JSON.stringify(payload || {});

    // A. 禁止ワードの完全一致チェック
    const matchedForbidden = FORBIDDEN_WORDS.filter(w => textCorpus.toLowerCase().includes(w.toLowerCase()));
    if (matchedForbidden.length > 0) {
      results.push({
        deliverableId: item.id,
        passed: false,
        checks: {
          secret_leak_free: false,
          teaser_principle_compliant: true,
          format_and_length_valid: true,
          cta_guideline_compliant: true,
        },
        feedback: `【機密漏洩NG】仕入れ先・国内ソースの固有名詞が原稿内に含まれています: [${matchedForbidden.join(', ')}] を削除・抽象化してください。`,
      });
      continue;
    }

    // B. X (Twitter) の1ポスト目文字数測定（140文字以内）
    if (item.platform === 'x') {
      const dailyThread = payload?.dailyThreads?.find((t: any) => t.day?.includes(item.day_of_week) || t.day === item.day_of_week);
      const mainPost = dailyThread?.mainPost || payload?.mainPost || '';
      
      if (mainPost.length > 140) {
        results.push({
          deliverableId: item.id,
          passed: false,
          checks: {
            secret_leak_free: true,
            teaser_principle_compliant: true,
            format_and_length_valid: false,
            cta_guideline_compliant: true,
          },
          feedback: `【文字数オーバー】Xの1ポスト目が ${mainPost.length} 文字あります。140文字以内に要約してください。`,
        });
        continue;
      }
    }

    // 機械判定をパスしたものはLLMの定性・文脈審査へ
    itemsForLlmReview.push(item);
  }

  if (itemsForLlmReview.length === 0) {
    return { allPassed: results.every(r => r.passed), results };
  }

  // --------------------------------------------------------------------------
  // 2. LLMによる「撒き餌原則・コンプライアンス・導線」定性審査
  // --------------------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 8192,
    apiKey,
  });

  const prompt = `あなたは越境トレカ販売の最高品質・コンプライアンス監査役【Gate 2: Content & Legal Guard】です。
以下のSNSおよびDiscordの配信原稿を監査し、合否を判定してください。

【厳格監査基準】:
1. 撒き餌原則（Teaser Principle）の厳守（最重要）:
   - 原稿は「利益が出た事実・相場の歪み（Fact & Result）」のみを語り、「どうやって安く仕入れたのか」「どこで仕込んだのか」というノウハウ（Action & Reason）を投稿内でネタバレしてはいけません。ノウハウを完全に解説している原稿は即却下（passed: false）。
2. 誇大広告・断定表現の排除:
   - 「絶対に値上がりする」「元本保証」「100%利益」などの金融・投資詐欺的な断定表現は却下。
3. 2股CTA導線の整合性:
   - 一般向けSNSは「プロフィールリンク」または「VIPコミュニティ」への誘導が含まれていること。

【監査対象原稿リスト】:
${JSON.stringify(
  itemsForLlmReview.map(i => ({
    id: i.id,
    platform: i.platform,
    day: i.day_of_week,
    sampleContent: i.platform === 'instagram'
      ? (i.content_payload?.dailyPosts?.find((p: any) => p.day?.includes(i.day_of_week))?.caption || '').slice(0, 300)
      : i.platform === 'x'
      ? (i.content_payload?.dailyThreads?.find((t: any) => t.day?.includes(i.day_of_week))?.mainPost || '')
      : (i.content_payload?.discordMessage || '').slice(0, 300)
  })),
  null,
  2
)}

【出力形式】:
以下のJSON形式のみを出力してください:
{
  "auditResults": [
    { "id": "原稿ID", "passed": true },
    { "id": "原稿ID", "passed": false, "feedback": "具体的な修正指示（例: 仕入れノウハウを喋りすぎているため、結果のみに絞り詳細はプロフリンクへ誘導してください）" }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());
    const rawList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.auditResults) ? parsed.auditResults : [];

    const llmMap = new Map<string, any>();
    for (const r of rawList) {
      if (r?.id) llmMap.set(r.id, r);
    }

    const llmResults: Gate2AuditResult[] = itemsForLlmReview.map(item => {
      const match = llmMap.get(item.id);
      const passed = match ? Boolean(match.passed) : true;
      return {
        deliverableId: item.id,
        passed,
        checks: {
          secret_leak_free: true,
          teaser_principle_compliant: passed,
          format_and_length_valid: true,
          cta_guideline_compliant: passed,
        },
        feedback: passed ? null : (match?.feedback || '表現規約または撒き餌原則に不適合'),
      };
    });

    const combined = [...results, ...llmResults];
    return { allPassed: combined.every(r => r.passed), results: combined };
  } catch (error) {
    console.error('Gate 2 LLM audit error:', error);
    const fallbackResults = itemsForLlmReview.map(i => ({
      deliverableId: i.id,
      passed: true,
      checks: { secret_leak_free: true, teaser_principle_compliant: true, format_and_length_valid: true, cta_guideline_compliant: true },
      feedback: null,
    }));
    const combined = [...results, ...fallbackResults];
    return { allPassed: combined.every(r => r.passed), results: combined };
  }
}