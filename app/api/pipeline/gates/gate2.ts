// app/api/pipeline/gates/gate2.ts
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
  reason?: string | null;
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
    let instruction: string | null = null;

    // A. 機密仕入れ先キーワード漏洩チェック
    for (const kw of SOURCING_SECRETS_BLACKLIST) {
      if (rawPayload.includes(kw)) {
        issue = `機密仕入れ先ワード「${kw}」が含まれています。`;
        instruction = `具体的な調達先名や国内店舗名を完全に削除し、客観的な価格差の数値のみを提示してください。`;
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
        instruction = `1ポスト目の文字数を140文字以内に削り、詳細は2ポスト目以降のスレッドに回してください。`;
      } else if (/https?:\/\/[^\s]+/.test(mainPost)) {
        issue = `Xの1ポスト目に外部リンクURLが含まれています。`;
        instruction = `1ポスト目のURLを削除し、スレッド末尾またはリプライ欄にリンクを配置してください。`;
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
        reason: issue,
        feedback: instruction ? `【不合格理由】${issue} 【修正指示】${instruction}` : issue,
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
    maxOutputTokens: 8192,
    apiKey: apiKey,
  });

  const prompt = `あなたは越境トレカ販売事業の最高表現・コンプライアンス監査役【Gate 2: Compliance Guard】です。
生成された以下の全原稿リストを監査し、合否を判定してください。

【厳格監査基準】:
1. 「答えを教えない撒き餌（Hook & Hold）」原則:
   - 無料SNS（IG/X）本文に記載可能なのは「客観的な確定価格差」「海外成約相場」「急騰事実」（Fact / Result）のみ。
   - 高騰の詳細理由（Reason）や、日本国内での具体的な仕入れルート（Action）を本文でネタバレしている場合は即却下（passed: false）。
2. 2股CTA（Dual Funnel）の完備:
   - IG/Xの誘導部で「理由・シグナルはVIP Discordへ」「直送代行は自社サイトへ」の2分岐が提示されているか。
3. Discord営業文（B2Bオファー）:
   - 海外バイヤー向け英語ベースで、MOQ（最低ロット数）、配送手段（FedEx等）、決済手段（Wise/PayPal）が網羅されているか。

【監査対象原稿リスト】:
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

【出力ルール（文字数浪費禁止）】:
- 全件（全ID）について結果を出力すること。
- 不要なキー（checksオブジェクトやrequiresRegeneration等）は一切出力しないこと。
- 合格の場合は "passed": true のみ出力し、"reason" や "feedback" は出力しないこと。
- 不合格の場合のみ "passed": false と "reason"（ダメだった理由）および "feedback"（再生成のための具体的な修正指示）を出力すること。

以下のJSON形式のみを出力してください:
{
  "auditResults": [
    { "id": "原稿ID", "passed": true },
    {
      "id": "原稿ID",
      "passed": false,
      "reason": "ダメだった具体的な理由（例: 本文で国内仕入れ店舗名がネタバレされている）",
      "feedback": "再生成のための具体的な修正指示（例: 店舗名を削除し、客観的な価格差のみを記載してDiscordへ誘導すること）"
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed = parseAIJson(res.content.toString());

    // 🌟 AIの出力（reason + feedback）を統合してシステム・UIへ渡す
    const llmResults: Gate2AuditResult[] = (parsed?.auditResults || []).map((r: any) => {
      const combinedFeedback = r.reason && r.feedback
        ? `【不合格理由】${r.reason} 【修正指示】${r.feedback}`
        : r.feedback || r.reason || null;

      return {
        deliverableId: r.id,
        platform: passedStatic.find((p) => p.id === r.id)?.platform || '',
        passed: Boolean(r.passed),
        checks: {
          secrets_leaked: !r.passed,
          platform_rule_compliant: Boolean(r.passed),
          dual_funnel_cta_valid: Boolean(r.passed),
        },
        reason: r.reason || null,
        feedback: combinedFeedback,
        requiresRegeneration: !r.passed,
      };
    });

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