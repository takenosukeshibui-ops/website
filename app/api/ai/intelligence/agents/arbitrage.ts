// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';

export async function runSayaAnalysis(region: 'us' | 'eu' | 'asia' = 'us', _category: string = 'pokemon') {
    const rules = await getAgentRules('arbitrage');

    const regionContexts = {
        us: { name: '北米市場（日米アービトラージ）', currency: 'USD' },
        eu: { name: '欧州市場（日欧アービトラージ）', currency: 'EUR' },
        asia: { name: 'アジア市場（日亜アービトラージ）', currency: 'USD/HKD' }
    };

    const cur = regionContexts[region];
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.1,
    });

    const prompt = `あなたは【${cur.name}】専属の日本語版ポケモンカード アービトラージ（サヤ抜き）アナリストです。
対象通貨: ${cur.currency}。

【調査任務：5大スロット網羅サヤ取り査定（週次定点観測）】
現行弾や一部のBOXだけに偏ることなく、以下の5つのスロットすべてについて、国内仕入れ価格と現地実成約価格の【単純価格差（粗利スプレッド）】が大きい銘柄を査定してください。
※プラットフォーム手数料、国際送料、為替バッファ等の経費は一切考慮せず、純粋な「価格差額」および「価格差比率（Spread ROI）」で評価してください。これにより、低単価（数千円〜）から高単価まで幅広い価格帯の発掘を目的とします。

1. classic_vintage: クラシック・ヴィンテージ枠（旧裏面、eシリーズ、ADV/PCG等）
2. neo_vintage: ネオ・ヴィンテージ枠（DP/Pt、LEGEND、BW、XY等の絶版シングル）
3. exclusive_promo: 限定プロモ・配布枠（ジムプロモ、ポケセン限定、タイアップ品等）
4. modern_meta: 現行モダン・メタ枠（SM、SS、SVのSAR/SR/UR/AR、直近弾、世界大会メタ）
5. graded_sealed: 鑑定品・POP希少・未開封BOX枠（PSA10/9、絶版未開封BOX等）

【抽出件数の動的ルール（案B）】
- 各スロットの査定銘柄（items）は【基本1商品】を厳選すること。
- ただし、以下の【高価格差解禁トリガー】のいずれかを満たす極めて条件の良い案件がある場合のみ、例外として【最大2商品】まで抽出してよい（無理な数合わせは厳禁）:
  ① 高スプレッド: 国内仕入れに対する単純価格差比率（Spread ROI）が50%以上
  ② 高流動性: 直近7日以内で海外実成約（Sold Listings）が3件以上確認でき、即時売却の確度が高い
  ③ 国内投げ売り: 国内相場比-20%などの割安出品が確認でき、即時仕入れの旨味が極めて大きい

【厳格品質担保ルール】
1. 【状態完全一致の原則（Condition Equivalence）】:
   仕入れ元（国内フリマ/スニダン）と販売先（現地）の「状態」が100%同一であること。
   （例: PSA10＝PSA10、PSA9＝PSA9、Raw NM＝Raw NM、未開封シュリンク付＝未開封シュリンク付）
2. 【実成約価格（Sold Listings）限定】: 出品希望価格の参照は厳禁。直近7〜14日以内の実成約中央値のみを参照すること。
3. 【単純スプレッド計算】:
   手数料や送料等の経費は差し引かず、現地販売価格（円換算）から国内仕入れ価格を引いた単純な「価格差額（priceSpreadJPY）」と「価格差比率（spreadROI）」を算出すること。
${rules}

必ず以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "title": "【${region.toUpperCase()}利ざや】世界3大市場 5大スロット網羅サヤ取りレポート",
  "claim": "今週の${cur.name}におけるサヤ取り総括（最高価格差スロット、推奨買い付け方針）",
  "reasons": [
    "国内仕入れ価格の安定性と再現性",
    "現地実成約（Sold Listings）の直近取引頻度と流動性",
    "国内外における純粋な価格スプレッドの広さ"
  ],
  "facts": [
    { "label": "最高ROIスロット", "value": "例: ネオ・ヴィンテージ枠" },
    { "label": "想定平均価格差", "value": "+¥XX,XXX / 件" },
    { "label": "評価基準", "value": "純粋価格差（経費除外スプレッド）" },
    { "label": "状態整合性", "value": "全スロット完全一致確認済" }
  ],
  "soWhat": "自社代理購入サービスを通じた直送手配での成約余地と推奨オファー",
  "riskAndMitigation": {
    "risk": "相場急変動や売れ残りリスク",
    "mitigation": "受発注のリアルタイム買い付け指示および流動性の高い銘柄選定"
  },
  "verificationChecklist": [
    "全スロットの仕入れ元と販売先の状態完全一致確認",
    "直近7〜14日の成約履歴（Sold Listings）確認",
    "国内外の実勢レート換算の確認"
  ],
  "slots": [
    {
      "slotKey": "classic_vintage",
      "slotLabel": "クラシック・ヴィンテージ枠（旧裏〜PCG期）",
      "isHighRoiTriggered": false,
      "triggerReason": "2件目を出した理由（トリガー該当時のみ記入。1件なら空文字）",
      "items": [
        {
          "cardName": "カード名（状態完全一致）",
          "conditionGrade": "PSA9 / PSA10 / Raw NM 等",
          "jpBuyPriceJPY": "¥XX,XXX",
          "targetSoldPrice": "${cur.currency} XXX (約¥XX,XXX)",
          "priceSpreadJPY": "¥XX,XXX",
          "spreadROI": "XX.X%",
          "liquidity": "直近7日成約 X件確認",
          "riskAndMitigation": {
            "risk": "ヴィンテージ特有の個体差判定ブレ",
            "mitigation": "鑑定品限定仕入れまたは状態A-前提でのマージン確保"
          },
          "verificationDetail": "スニダン直近成約とeBay Soldを照合済"
        }
      ]
    },
    {
      "slotKey": "neo_vintage",
      "slotLabel": "ネオ・ヴィンテージ枠（DP〜XY期）",
      "isHighRoiTriggered": false,
      "triggerReason": "",
      "items": [
        {
          "cardName": "カード名（状態完全一致）",
          "conditionGrade": "状態",
          "jpBuyPriceJPY": "¥XX,XXX",
          "targetSoldPrice": "${cur.currency} XXX",
          "priceSpreadJPY": "¥XX,XXX",
          "spreadROI": "XX.X%",
          "liquidity": "成約頻度",
          "riskAndMitigation": { "risk": "懸念", "mitigation": "対策" },
          "verificationDetail": "確認内容"
        }
      ]
    },
    {
      "slotKey": "exclusive_promo",
      "slotLabel": "限定プロモ・配布枠",
      "isHighRoiTriggered": false,
      "triggerReason": "",
      "items": [
        {
          "cardName": "カード名（状態完全一致）",
          "conditionGrade": "状態",
          "jpBuyPriceJPY": "¥XX,XXX",
          "targetSoldPrice": "${cur.currency} XXX",
          "priceSpreadJPY": "¥XX,XXX",
          "spreadROI": "XX.X%",
          "liquidity": "成約頻度",
          "riskAndMitigation": { "risk": "懸念", "mitigation": "対策" },
          "verificationDetail": "確認内容"
        }
      ]
    },
    {
      "slotKey": "modern_meta",
      "slotLabel": "現行モダン・メタ枠",
      "isHighRoiTriggered": false,
      "triggerReason": "",
      "items": [
        {
          "cardName": "カード名（状態完全一致）",
          "conditionGrade": "状態",
          "jpBuyPriceJPY": "¥XX,XXX",
          "targetSoldPrice": "${cur.currency} XXX",
          "priceSpreadJPY": "¥XX,XXX",
          "spreadROI": "XX.X%",
          "liquidity": "成約頻度",
          "riskAndMitigation": { "risk": "懸念", "mitigation": "対策" },
          "verificationDetail": "確認内容"
        }
      ]
    },
    {
      "slotKey": "graded_sealed",
      "slotLabel": "高額鑑定・POP希少・未開封BOX枠",
      "isHighRoiTriggered": false,
      "triggerReason": "",
      "items": [
        {
          "cardName": "カード名 / BOX名（状態完全一致）",
          "conditionGrade": "状態",
          "jpBuyPriceJPY": "¥XX,XXX",
          "targetSoldPrice": "${cur.currency} XXX",
          "priceSpreadJPY": "¥XX,XXX",
          "spreadROI": "XX.X%",
          "liquidity": "成約頻度",
          "riskAndMitigation": { "risk": "懸念", "mitigation": "対策" },
          "verificationDetail": "確認内容"
        }
      ]
    }
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}