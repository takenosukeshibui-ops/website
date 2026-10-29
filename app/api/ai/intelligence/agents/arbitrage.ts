import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName } from '../helpers';

export async function runSayaAnalysis(region: 'us' | 'eu' | 'asia' = 'us', category: string = 'pokemon') {
    const categoryName = getCategoryName(category);
    const regionContexts = {
        us: { name: '北米市場（日米アービトラージ）', currency: 'USD', feeRate: '約13% (eBay)', shipping: 'FedEx 約2,500円〜3,500円' },
        eu: { name: '欧州市場（日欧アービトラージ）', currency: 'EUR', feeRate: '約10% (Cardmarket/eBay)', shipping: 'EMS 約3,000円〜4,500円' },
        asia: { name: 'アジア市場（日亜アービトラージ）', currency: 'USD/HKD', feeRate: '約8〜12%', shipping: 'EMS 約1,800円〜2,800円' }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.1,
    });

    const prompt = `あなたは【${cur.name}】専属の【${categoryName}】アービトラージ（サヤ抜き）アナリストです。
対象通貨: ${cur.currency}、プラットフォーム手数料: ${cur.feeRate}、送料目安: ${cur.shipping}。
状態を厳密に揃え、成約価格中央値を基準に実質純利益（Net ROI）を算出してください。

必ず以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}利ざや】対象カード名・BOX名・アイテム名（状態完全一致）",
  "claim": "1件あたりの実質純利益 ¥XX,XXX / $XXX (Net ROI: XX%) の即時仕入れ・販売判断",
  "reasons": [
    "国内仕入れ価格の安定性",
    "現地プラットフォームでの直近7〜14日成約実績",
    "為替リスクを織り込んだ利益マージン"
  ],
  "facts": [
    { "label": "国内仕入れ価格", "value": "¥XX,XXX" },
    { "label": "現地実成約価格", "value": "${cur.currency} XXX" },
    { "label": "想定諸経費計", "value": "¥X,XXX (手数料＋送料)" },
    { "label": "実質純利益 (Net)", "value": "¥XX,XXX (ROI: XX%)" }
  ],
  "soWhat": "自社代理購入サービスを通じた直送手配での成約余地と推奨オファー",
  "riskAndMitigation": {
    "risk": "為替変動や配送遅延による相場反落リスク",
    "mitigation": "受発注のリアルタイム化または即時買い付け指示"
  },
  "verificationChecklist": [
    "状態・鑑定グレードの一致確認",
    "直近7日成約履歴の照合",
    "サイズ・重量の送料確認"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}