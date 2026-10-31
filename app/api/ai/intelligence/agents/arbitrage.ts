// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export interface ArbitrageItem {
  cardName: string;
  conditionGrade: string;
  jpBuyPriceJPY: string;
  targetSoldPrice: string;
  priceSpreadJPY: string;
  spreadROI: string;
  liquidity: string;
  insight: string;
}

export interface ArbitrageTier {
  priceTier: string;
  priceTierLabel: string;
  mainItem: ArbitrageItem;
  subItems: ArbitrageItem[];
}

export interface ArbitrageSlotReport {
  slotKey: string;
  slotLabel: string;
  tiers: ArbitrageTier[];
}

const REGION_CURRENCIES: Record<string, { currency: string; name: string }> = {
  us: { currency: 'USD', name: '北米（アメリカ）市場' },
  eu: { currency: 'EUR', name: '欧州（ヨーロッパ）市場' },
  asia: { currency: 'SGD', name: 'アジア（シンガポール・台湾・香港等）市場' },
};

const SLOTS = [
  { key: 'classic_vintage', label: 'クラシック・ヴィンテージ', desc: '旧裏面・eシリーズ・ADV・PCG・初期絶版' },
  { key: 'neo_vintage', label: 'ネオ・ヴィンテージ', desc: 'DP・Pt・LEGEND・BW・XY' },
  { key: 'promos_exclusive', label: '限定プロモ・配布品', desc: '大会プロモ・ジムプロモ・企業コラボ・プレイヤーズ' },
  { key: 'modern_meta', label: '現行モダン・高需要枠', desc: 'サン＆ムーン・ソード＆シールド・スカーレット＆バイオレット（SAR・SR・AR・CHR）' },
  { key: 'high_end_sealed', label: '高額鑑定品・未開封BOX', desc: '高額PSA10/BGS鑑定品、絶版未開封BOX、サプライ未開封' }
];

export async function runSayaAnalysis(region: 'us' | 'eu' | 'asia', category: string = 'pokemon') {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  // ==========================================================================
  // 【Step 1】5スロット並列調査（計75商品を発掘）
  // ==========================================================================
  const slotPromises = SLOTS.map(async (slot) => {
    const slotPrompt = `あなたは【${cur.name}】で越境トレカ販売を展開する現地事業者専属の調達戦略アナリストです。
対象通貨: ${cur.currency}。

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）

【調達リサーチ任務】
以下の【5つの価格帯】すべてについて、日本から輸入・調達して現地で売却するのに適したカードを【本命1商品 ＋ 代替候補2商品（計3商品）】厳選してください。
（このスロット全体で 5価格帯 × 3商品 ＝ 合計15商品）

■ 5つの価格帯と調達・合格基準:
1. under_3k（〜¥3,000）: 最低差額 +¥1,000以上、現地直近7日成約 5件以上（超高回転・エントリー枠）
2. under_10k（¥3,000〜¥10,000）: 最低差額 +¥2,500以上、現地直近7日成約 3件以上（定番コレクション枠）
3. middle（¥10,000〜¥30,000）: 最低差額 +¥6,000以上、現地直近14日成約 2件以上（中核プロモ・人気SR枠）
4. upper（¥30,000〜¥80,000）: 最低差額 +¥15,000以上、現地直近30日成約 2件以上（高額鑑定・上位絶版枠）
5. top_end（¥80,000以上）: 最低差額 +¥30,000以上、現地直近30日成約 1件以上（資産性・未開封BOX枠）

【指定コンディション・マスター（※商材の性質に応じ、以下から厳格に選定すること）】
・素体: "Raw NM", "Raw LP", "Raw Played"
・鑑定品: "PSA 10", "PSA 9", "BGS 9.5", "BGS 10", "CGC 10", "ARS 10"
・未開封: "Sealed Box", "Sealed Pack", "Sealed Promo"
※仕入れ側と現地販売側の状態は必ず同一基準で評価すること。

以下のJSON形式のみを出力してください:
{
  "slotKey": "${slot.key}",
  "slotLabel": "${slot.label}",
  "tiers": [
    {
      "priceTier": "under_3k",
      "priceTierLabel": "〜3千円",
      "mainItem": {
        "cardName": "実在カード名 (型番/弾名)",
        "conditionGrade": "コンディションマスターから選定",
        "jpBuyPriceJPY": "¥X,XXX",
        "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
        "priceSpreadJPY": "¥X,XXX",
        "spreadROI": "XX%",
        "liquidity": "直近7日 X件",
        "insight": "現地需要動向と輸入推奨理由（1行）"
      },
      "subItems": [
        { "cardName": "候補2 (型番)", "conditionGrade": "選定表記", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" },
        { "cardName": "候補3 (型番)", "conditionGrade": "選定表記", "jpBuyPriceJPY": "¥X,XXX", "targetSoldPrice": "${cur.currency} XX", "priceSpreadJPY": "¥X,XXX", "spreadROI": "XX%", "liquidity": "直近7日 X件", "insight": "特徴1行" }
      ]
    },
    { "priceTier": "under_10k", "priceTierLabel": "3千〜1万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] },
    { "priceTier": "middle", "priceTierLabel": "1万〜3万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] },
    { "priceTier": "upper", "priceTierLabel": "3万〜8万円", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] },
    { "priceTier": "top_end", "priceTierLabel": "8万円〜", "mainItem": { /* 同様 */ }, "subItems": [ /* 2商品 */ ] }
  ]
}`;

    const res = await model.invoke(slotPrompt);
    return parseAIJson(res.content.toString());
  });

  // 5スロットの調査完了を待つ（計75商品が揃う）
  const slotResults = await Promise.all(slotPromises);

  // ==========================================================================
  // 【Step 2】発掘した75商品を要約し、サマリーAIへ渡してデータ駆動分析
  // ==========================================================================
  const allDiscoveredItems: any[] = [];
  for (const slot of slotResults) {
    if (!slot?.tiers) continue;
    for (const tier of slot.tiers) {
      if (tier.mainItem) {
        allDiscoveredItems.push({
          slot: slot.slotLabel,
          tier: tier.priceTierLabel,
          role: '本命',
          ...tier.mainItem,
        });
      }
      if (Array.isArray(tier.subItems)) {
        for (const sub of tier.subItems) {
          allDiscoveredItems.push({
            slot: slot.slotLabel,
            tier: tier.priceTierLabel,
            role: '代替候補',
            ...sub,
          });
        }
      }
    }
  }

  const summaryPrompt = `あなたは【${cur.name}】専属の最高調達投資責任者（CIO）です。
リサーチチームが日本市場をスクリーニングし、現地で利ざやの取れる【全75商品（本命25＋代替50）】を発掘しました。

【今週発掘された全75商品の調達・価格差データ】:
${JSON.stringify(allDiscoveredItems, null, 2)}

【任務】
上記75商品のデータ群をフラットかつ客観的に観察し、海外現地ショップオーナーに向けた【データ駆動型エグゼクティブ・サマリー】を作成してください。

■ 分析・執筆における絶対ルール:
1. 先入観を持たず、データ全体の「共通点・差異・異常値」を帰納的に抽出すること:
   - 特定の切り口に誘導する具体例は一切与えません。75行のレコードを比較対照したときに、データ自身が示している客観的事実や顕著なパターンをアナリスト自身の洞察力で導き出してください。
   - 以下の「問い」を手がかりに、発見した構造的特徴を言語化してください:
     * 数値の分布: リスト全体の中で、極端な数値（飛び抜けて高い/低いROI、成約数、価格差など）を示しているグループにはどのような共通項があるか？
     * 属性間の関係: スロット区分、価格帯、コンディション、商材の年代や種別などの間で、どのような相関や対比が見られるか？
     * 現地需給の歪み: 現地の販売価格や成約ペースから、バイヤーの行動や市場の歪みについて何が推察できるか？
2. 注目銘柄は必ず上記75商品の中から選出すること:
   - topImportMarginCard（最大利ざや銘柄）および topLocalVelocityCard（最高流動性銘柄）は、リストに実在するカード名・価格差をそのまま引用して解説すること。架空のカードやリスト外のカードへの言及は厳禁。
3. 機密保持: メルカリやカドショなどの国内仕入れ先ワードは絶対に使用せず、「日本国内流通」「国内二次流通」と抽象化すること。

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}】アービトラージレポート",
  "claim": "今週の${cur.name}向け日本語版カード輸入調達戦略（75銘柄の実成約スクリーニング分析）",
  "summary": {
    "headline": "75商品のデータから浮かび上がった、今週最も特筆すべき市場動向や歪みの核心（発見したパターンを記述）",
    "macroAnalysis": {
      "japanSourcingClimate": "今回発掘された75商品の仕入れ値・在庫動向から読み解く、日本国内市場の調達環境分析",
      "localMarketDemand": "75商品の現地売価・成約速度から浮き彫りになる、現地バイヤーの心理と需要の偏り"
    },
    "microAnalysis": {
      "topImportMarginCard": "リスト中【最も利ざや・価格ギャップが顕著なカード名】とその選定根拠（上記75商品から引用）",
      "topLocalVelocityCard": "リスト中【最も成約件数・回転が速いカード名】とその選定根拠（上記75商品から引用）",
      "conditionGradingInsight": "75商品のデータ構成から見えてくる独自のインサイト（データ分析から判明した事実を記述）"
    },
    "riskAlert": {
      "sourcingQualityTrap": "今回選定された商材を日本から仕入れる際の注意点（偽物・状態・シュリンク詐欺等）",
      "localInventoryRisk": "現地での在庫滞留・急落リスクを避けるための回転・保管戦略"
    },
    "actionDirectives": [
      "低単価帯（〜3千円・1万円以下）の重点回収＆スピード販売アクション",
      "中・高額帯（1万〜8万円以上）のプレミアム販売＆利ざや確保アクション"
    ]
  }
}`;

  const summaryRes = await model.invoke(summaryPrompt);
  const summaryParsed = parseAIJson(summaryRes.content.toString());

  return {
    title: summaryParsed?.title || `【${region.toUpperCase()}】アービトラージレポート`,
    claim: summaryParsed?.claim || `${cur.name}向け調達レポート`,
    summary: summaryParsed?.summary || null,
    slots: slotResults,
  };
}