import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export async function runSalesDM(chiefPackage: any) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたはVIPコミュニティ（Discord）専任の担当AIです。
チーフマネージャーからの指示書:
${JSON.stringify(chiefPackage)}

以下のJSON形式のみを出力してください:
{
  "targetSegment": "選定地域（${chiefPackage?.winningRegion || '海外'}）の大口セラー/コレクター",
  "offerSummary": "オファー概要（ロット確保・即時直送手配）",
  "discordMessage": "Discord大口バイヤー向けチャンネル投稿文全文（商条件・決済方法・直送メリットを明記）",
  "commercialTerms": {
    "minimumOrderQty": "最低ロット条件",
    "shippingMethod": "FedEx Priority / EMS 追跡付き直送",
    "paymentMethod": "PayPal / Wise送金"
  },
  "negotiationTip": "価格・数量交渉に対する事前対策ガイダンス"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}