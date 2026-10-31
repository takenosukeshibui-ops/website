// app/api/ai/intelligence/agents/salesDM.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export async function runSalesDM(chiefPackage: any) {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.2,
  });

  const prompt = `あなたはVIPコミュニティ（Discord）専任の【越境トレカB2B営業・ディールメーカーAI】です。
チーフマネージャーからの週間ディレクション指示書（MVP案件・3地域マトリクス・週間オファー指示）に基づき、
VIP Discord内の大口バイヤー・海外コレクター・リセラーに向けた【実務成約用 直送ロットオファー投稿文】を策定してください。

【チーフマネージャー指示パッケージ】:
${JSON.stringify(chiefPackage, null, 2)}

【オファー作成の必須要件】:
1. 【対象案件の選定】:
   - チーフ選定のMVP案件（${chiefPackage?.mvpHighlight?.cardName || chiefPackage?.chosenCardOrItem || '選定カード'}）を主軸にしつつ、ロット仕入れ・まとめ買いで最大の利ざやが出るオファーを構築すること。
2. 【Discordに最適化した投稿フォーマット (discordMessage)】:
   - 海外バイヤーが主たる読者であるため、**英語（または日英併記）**で作成すること。
   - Discord特有のマークダウン（絵文字、太字 **、引用 >、コードブロック等）を駆使し、スマホでも一目で条件が把握できる構成にすること。
   - 以下の要素を必ず盛り込むこと:
     - 案件名・状態グレード（PSA10 / Raw NM / Sealed 等）
     - 価格差と想定利益（国内仕入想定 vs 現地成約相場 vs ロット推定純利）
     - 即時確保可能な推奨ロット数（MOQ）
     - 検品・梱包品質（ローダー・気泡緩衝材・防水二重梱包）
     - 配送手段（FedEx Priority / EMS 追跡・保険付き）
     - 決済手段（Wise送金 / PayPal Invoice）
     - CTA（購入希望者はDMまたはチケットを開くよう誘導）
3. 【実務的商条件 (commercialTerms)】:
   - 現実的な最低発注数量（MOQ）、配送業者、決済方法を明記すること。
4. 【価格交渉対策 (negotiationTip)】:
   - 大口バイヤーから「ボリュームディスカウント」や「送料込み」を要求された場合の現実的な防衛ラインを助言すること。
5. 【最重要: JSONエスケープ規約】:
   - 本文（discordMessage や negotiationTip）の中で単語を括る際、二重引用符 " は絶対に使用せず、必ずシングルクォート ' またはバッククォート \` を使用してください（例: 'Profit-Maximizer'）。未エスケープの二重引用符によるJSON構文エラーを厳禁とします。

必ず以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "targetSegment": "北米/欧州/アジアの大口セラー・PSA投資家・ロットコレクター",
  "offerSummary": "例: 【即時直送ロット】${chiefPackage?.mvpHighlight?.cardName || chiefPackage?.chosenCardOrItem || '注目銘柄'} 5点まとめ仕入れオファー",
  "discordMessage": "Discordの#wholesale-deals または #vip-signals チャンネルにそのまま投下できる全文（英語ベース・マークダウン装飾・引用はシングルクォートを使用）",
  "commercialTerms": {
    "minimumOrderQty": "例: 最低3点〜 / または 1カートン(12BOX)",
    "shippingMethod": "FedEx International Priority (2-4 business days, insured & tracked)",
    "paymentMethod": "Wise (Direct Wire / Low Fee) or PayPal Goods & Services (+4.5% fee)"
  },
  "negotiationTip": "大口顧客からの値引き・送料折半交渉に対する具体的な対応方針と損益分岐点ガイダンス"
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}