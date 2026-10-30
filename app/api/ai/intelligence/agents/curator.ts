import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName } from '@/app/api/ai/intelligence/helpers';

export async function runCuratorSelection(researchCandidates: any[], category: string = 'pokemon') {
  const categoryName = getCategoryName(category);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 4096,
    apiKey: apiKey,
  });

  const prompt = `あなたは越境【${categoryName}】事業の【AIキュレーター（旧チーフマネージャー）】です。
あなたの役割は、提出されたリサーチ候補銘柄から【7日分の週間スロット（月〜日）】および【看板MVP】を選定し、
「なぜ今この銘柄なのか（Why）」と「無料SNSで開示する客観的数字（Fact）」のみを定義することです。
※SNSの詳細な投稿指示やスライド割付けは各クリエイターが自律して行うため、あなたが作成する必要はありません。

【提出されたリサーチ候補】:
${JSON.stringify(researchCandidates, null, 2)}

【週間スロット構成原則】:
- Monday: Flagship_GlobalCatalog (看板MVPを中心とした3地域横断)
- Tuesday: Vintage_Focus (旧裏〜PCG、DP〜XY)
- Wednesday: Promo_Focus (日本限定プロモ、ポケセン限定品)
- Thursday: Modern_Meta_Focus (最新弾先行、最高レアSAR鑑賞需要)
- Friday: Graded_Sealed_Focus (PSA10鑑定品、未開封BOX)
- Saturday: Hit_Proof_SocialProof (過去予測の急騰的中実績)
- Sunday: Weekly_Summary_CTA (週間利益ランキング＆総括)

以下のJSONのみを出力してください:
{
  "winningRegion": "global",
  "mvpCandidateId": "最も数字・利ざやインパクトが大きいリサーチ候補のID",
  "calendarSelections": [
    {
      "dayOfWeek": "Monday",
      "selectedResearchItemId": "候補アイテムのID",
      "postType": "Flagship_GlobalCatalog",
      "coreHookFact": "提示する確定価格差（例: 国内¥18,000 → 米国成約$340 / 差額+¥32,000）",
      "curatorRationale": "今週のMVPとして選定した戦略的理由"
    },
    { "dayOfWeek": "Tuesday", "selectedResearchItemId": "候補ID", "postType": "Vintage_Focus", "coreHookFact": "事実数値", "curatorRationale": "選定理由" },
    { "dayOfWeek": "Wednesday", "selectedResearchItemId": "候補ID", "postType": "Promo_Focus", "coreHookFact": "事実数値", "curatorRationale": "選定理由" },
    { "dayOfWeek": "Thursday", "selectedResearchItemId": "候補ID", "postType": "Modern_Meta_Focus", "coreHookFact": "事実数値", "curatorRationale": "選定理由" },
    { "dayOfWeek": "Friday", "selectedResearchItemId": "候補ID", "postType": "Graded_Sealed_Focus", "coreHookFact": "事実数値", "curatorRationale": "選定理由" },
    { "dayOfWeek": "Saturday", "selectedResearchItemId": "候補ID", "postType": "Hit_Proof_SocialProof", "coreHookFact": "事実数値", "curatorRationale": "選定理由" },
    { "dayOfWeek": "Sunday", "selectedResearchItemId": "候補ID", "postType": "Weekly_Summary_CTA", "coreHookFact": "事実数値", "curatorRationale": "選定理由" }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}