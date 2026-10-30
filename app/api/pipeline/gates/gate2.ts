import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../../ai/intelligence/helpers';
import { DeliverableRecord } from '../types';

const SOURCING_SECRETS_BLACKLIST = [
  'メルカリ', 'ヤフオク', 'スニダン', 'ブックオフ', '晴れる屋', 'カードラッシュ',
  '駿河屋', '秋葉原', '店頭仕入れ', 'カドショ巡回', 'フリマ仕入れ', '店舗名'
];

export interface Gate2AuditResult {
  deliverableId: string;
  platform: string;
  passed: boolean;
  checks: {
    secrets_leaked: boolean;
    platform_rule_compliant: boolean;
    dual_funnel_cta_valid: boolean;
  };
  feedback: string | null;
  requiresRegeneration: boolean;
}

export async function runGate2Audit(
  deliverables: DeliverableRecord[]
): Promise<{ allPassed: boolean; results: Gate2AuditResult[] }> {
  const staticFailures: Gate2AuditResult[] = [];
  const passedStatic: DeliverableRecord[] = [];

  // 1. コードによる静的規約・文字数・禁止ワード判定
  for (const deliv of deliverables) {
    const rawPayload = JSON.stringify(deliv.content_payload || {});
    let issue: string | null = null;

    // A. 機密仕入れ先キーワード漏洩チェック
    for (const kw of SOURCING_SECRETS_BLACKLIST) {
      if (rawPayload.includes(kw)) {
        issue = `機密仕入れ先ワード「${kw}」が含まれています。無料SNS上で具体的な調達先を開示してはいけません。`;
        break;
      }
    }

    // B. Xのアルゴリズム規約チェック（1ポスト目140字・外部URL禁止）
    if (!issue && deliv.platform === 'x') {
      const mainPost =
        deliv.content_payload.mainPost ||
        deliv.content_payload.dailyThreads?.[0]?.mainPost ||
        '';
      if (mainPost.length > 140) {
        issue = `Xの1ポスト目が140文字を超過しています（現在: ${mainPost.length}文字）。`;
      } else if (/https?:\/\/[^\s]+/.test(mainPost)) {
        issue = 'Xの1ポスト目に外部リンクが含まれています（表示制限ペナルティの対象）。';
      }
    }

    if (issue) {
      staticFailures.push({
        deliverableId: deliv.id,
        platform: deliv.platform,
        passed: false,
        checks: {
          secrets_leaked: true,
          platform_rule_compliant: false,
          dual_funnel_cta_valid: false,
        },
        feedback: issue,
        requiresRegeneration: true,
      });
    } else {
      passedStatic.push(deliv);
    }
  }

  if (passedStatic.length === 0) {
    return { allPassed: false, results: staticFailures };
  }

  // 2. LLMによる文脈・撒き餌原則・2股CTA監査
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 2048,
    apiKey: apiKey,
  });

  const prompt = `あなたは越境トレカ販売事業の最高表現・コンプライアンス監査役【Gate 2: Compliance Guard】です。
生成された以下の原稿リストを監査し、合否を判定してください。

【厳格監査基準】:
1. 「答えを教えない撒き餌（Hook & Hold）」原則:
   - 無料SNS（IG/X）本文に記載可能なのは「客観的な確定価格差」「海外成約相場」「急騰事実」（Fact / Result）のみ。
   - 高騰の詳細理由（Reason）や、日本国内での具体的な仕入れルート（Action）を本文でネタバレしている場合は即却下。
2. 2股CTA（Dual Funnel）の完備:
   - IG/Xの誘導部で「理由・シグナルはVIP Discordへ」「直送代行は自社サイトへ」の2分岐が提示されているか。
3. Discord営業文（B2Bオファー）:
   - 海外バイヤー向け英語ベースで、MOQ（最低ロット数）、配送手段（FedEx等）、決済手段（Wise/PayPal）が網羅されているか。

【監査対象原稿】:
${JSON.stringify(
  passedStatic.map((d) => ({
    id: d.id,
    platform: d.platform,
    postType: d.post_type,
    payload: d.content_payload,
  })),
  null,
  2
)}

以下のJSON形式のみを出力してください:
{
  "auditResults": [
    {
      "id": "原稿ID",
      "checks": {
        "secrets_leaked": false,
        "platform_rule_compliant": true,
        "dual_funnel_cta_valid": true
      },
      "passed": true,
      "feedback": "不合格の場合は再生成プロンプトに注入すべき修正指示。合格ならnull",
      "requiresRegeneration": false
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());

    const llmResults: Gate2AuditResult[] = (parsed?.auditResults || []).map((r: any) => ({
      deliverableId: r.id,
      platform: passedStatic.find((p) => p.id === r.id)?.platform || '',
      passed: Boolean(r.passed),
      checks: r.checks,
      feedback: r.feedback || null,
      requiresRegeneration: !r.passed,
    }));

    const combinedResults = [...staticFailures, ...llmResults];
    return {
      allPassed: combinedResults.every((r) => r.passed),
      results: combinedResults,
    };
  } catch (error) {
    console.error('Gate 2 audit error:', error);
    return { allPassed: false, results: staticFailures };
  }
}