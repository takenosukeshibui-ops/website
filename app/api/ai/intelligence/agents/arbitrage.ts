// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName } from '../helpers';
import { createClient } from '@/lib/supabase/server';

export interface ArbitrageItem {
  cardName: string;
  cardNumber: string; // 🌟 必須の型番（例: "096/071", "sv2D" 等）
  conditionGrade: string;
  jpBuyPriceJPY: string;
  jpEvidenceUrl?: string;
  targetSoldPrice: string;
  priceSpreadJPY: string;
  spreadROI: string;
  liquidity: string;
  insight: string;
  sourcePlatform?: string;
  evidenceNote?: string;
}

export interface ArbitrageTier {
  priceTier: string;
  priceTierLabel: string;
  mainItem: ArbitrageItem;
  subItems?: ArbitrageItem[];
}

export interface ArbitrageSlotReport {
  slotKey: string;
  slotLabel: string;
  tiers: ArbitrageTier[];
}

const REGION_CURRENCIES: Record<string, { currency: string; name: string; targetPlatforms: string[] }> = {
  us: { 
    currency: 'USD', 
    name: '北米（アメリカ）市場',
    targetPlatforms: ['eBay (US)', 'TCGplayer (Market Price)']
  },
  eu: { 
    currency: 'EUR', 
    name: '欧州（ヨーロッパ）市場',
    targetPlatforms: ['Cardmarket (MKM Trend/Low)', 'eBay UK', 'eBay DE']
  },
  asia: { 
    currency: 'SGD', 
    name: 'アジア（シンガポール・台湾・香港等）市場',
    targetPlatforms: ['Shopee', 'Carousell', '現地専門店実勢価格']
  },
};

// リアルタイム為替レート取得ヘルパー
async function getRealtimeExchangeRate(currency: string): Promise<number> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('為替レート取得失敗');
    const data = await res.json();
    const rate = data?.rates?.JPY;
    if (rate && typeof rate === 'number') {
      return Math.round(rate * 100) / 100;
    }
  } catch (err) {
    console.warn(`[ExchangeRate] ${currency}のリアルタイム取得失敗（フォールバック適用）:`, err);
  }
  const fallbacks: Record<string, number> = { USD: 155, EUR: 168, SGD: 118 };
  return fallbacks[currency] || 150;
}

const SLOTS = [
  { key: 'classic_vintage', label: 'クラシック・ヴィンテージ', desc: '旧裏面・eシリーズ・ADV・PCG・初期絶版' },
  { key: 'neo_vintage', label: 'ネオ・ヴィンテージ', desc: 'DP・Pt・LEGEND・BW・XY' },
  { key: 'promos_exclusive', label: '限定プロモ・配布品', desc: '大会プロモ・ジムプロモ・企業コラボ・プレイヤーズ' },
  { key: 'modern_meta', label: '現行モダン・高需要枠', desc: 'サン＆ムーン・ソード＆シールド・スカーレット＆バイオレット（SAR・SR・AR・CHR）' },
  { key: 'high_end_sealed', label: '高額鑑定品・未開封BOX', desc: '高額PSA10/BGS鑑定品、絶版未開封BOX、サプライ未開封' }
];

export async function runSayaAnalysis(
  region: 'us' | 'eu' | 'asia', 
  category: string = 'pokemon',
  targetSlotKey?: string
) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;
  const categoryName = getCategoryName(category);

  const exchangeRateJPY = await getRealtimeExchangeRate(cur.currency);

  const baseModel = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  const modelWithSearch = baseModel.bindTools([
    {
      googleSearch: {},
    },
  ]);

  let externalPriceContext = '※外部APIデータ未取得のため、各主要プラットフォームの公的成約基準に基づき推論';
  try {
    const supabase = await createClient();
    const { data: cachedPrices, error: cacheErr } = await supabase
      .from('overseas_market_prices')
      .select('platform, card_name, condition_grade, sold_price_local, currency, sold_price_jpy, volume_indicator, source_evidence_url')
      .eq('region', region)
      .eq('category', category)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (!cacheErr && cachedPrices && cachedPrices.length > 0) {
      externalPriceContext = cachedPrices.map((p: any) => 
        `- [${p.platform}] ${p.card_name} (${p.condition_grade}): 売価 ${p.currency} ${p.sold_price_local} (約¥${Number(p.sold_price_jpy).toLocaleString()}) | 流動性: ${p.volume_indicator || '直近成約あり'}`
      ).join('\n');
    }
  } catch (err) {
    console.warn('[Arbitrage] Overseas price fetch warning:', err);
  }

  // 🌟 targetSlotKeyが指定されている場合は、その1スロットのみに絞り込んでGoogle API消費を抑制
  const targetSlots = targetSlotKey ? SLOTS.filter(s => s.key === targetSlotKey) : SLOTS;
  const effectiveSlots = targetSlots.length > 0 ? targetSlots : SLOTS;

  // ==========================================================================
  // 【Step 1】対象スロットの調査（1スロットにつき1つの価格帯×3商品 ＝ 1地域あたり最大15商品を発掘）
  // ==========================================================================
  const slotPromises = effectiveSlots.map(async (slot) => {
    const slotPrompt = `あなたは【${cur.name}】で越境【${categoryName}】販売を展開する現地事業者専属の調達戦略アナリストです。
対象通貨: ${cur.currency}（最新リアルタイム為替レート: 1 ${cur.currency} ＝ 約${exchangeRateJPY}円）。

【重要: 大手トレカ通販専門サイトの実勢相場リサーチ】
必ずGoogle検索を実行し、カードラッシュ・晴れる屋2・駿河屋等の大手専門店の現在実売相場を確認した上で jpBuyPriceJPY を決定してください。
（※個別商品ページのURL特定は後続システムが自動で行うため、プロンプト内でのURL出力は不要です）

■ 検索対象ショップ（大手トレカ通販のみに限定）:
・カードラッシュ (cardrush-pokemon.jp / cardrush.jp)
・遊々亭 (yuyu-tei.jp)
・駿河屋 (suruga-ya.jp) ※中古在庫あり品
・晴れる屋2 (hareruya2.com)
・ドラゴンスター (dorasuta.jp)
・ホビーステーション (hobbystation.com)
・フルコンプ (fullcomp-online.com)
※メルカリ等のCtoCフリマ相場は絶対に含めないこと。

【重要: 型番（コレクションナンバー）の出力義務】
後続の検索システムが個別商品ページをピンポイント特定するため、【型番（例: 096/071, 134/108, 001/SV-P, S8b 205/184 等）】を必ず cardNumber フィールドに明記してください。型番の省略は厳禁です。

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）

【調達リサーチ任務】
本日の市場動向から、このスロットにおいて最も利ざやと回転率が高い【最適な1つの価格帯（under_3k / under_10k / middle / upper / top_end のいずれか）】を自律的に選び、
その価格帯に属する【本命1商品 ＋ 代替候補2商品（計3商品）】を厳選抽出してください。

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

【厳格な四則演算ルール】
・targetSoldPrice の日本円換算値 ＝ 現地価格(${cur.currency}) × ${exchangeRateJPY}円
・priceSpreadJPY（利ざや） ＝ targetSoldPrice(円換算) − jpBuyPriceJPY
・spreadROI（%） ＝ Math.round((priceSpreadJPY / jpBuyPriceJPY) * 100)%

以下のJSON形式のみを出力してください:
{
  "slotKey": "${slot.key}",
  "slotLabel": "${slot.label}",
  "tiers": [
    {
      "priceTier": "選定した価格帯のキー (例: middle)",
      "priceTierLabel": "選定した価格帯のラベル (例: 1万〜3万円)",
      "mainItem": {
        "cardName": "実在カード名とレアリティ (例: ナンジャモ SAR)",
        "cardNumber": "実在する正確な型番 (例: 096/071 ※省略厳禁)",
        "conditionGrade": "コンディションマスターから選定",
        "jpBuyPriceJPY": "¥X,XXX",
        "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
        "priceSpreadJPY": "¥X,XXX",
        "spreadROI": "XX%",
        "liquidity": "直近7日 X件",
        "sourcePlatform": "参照プラットフォーム名",
        "evidenceNote": "売価根拠",
        "insight": "現地需要動向と輸入推奨理由（1行）"
      },
      "subItems": [
        {
          "cardName": "候補2のカード名とレアリティ",
          "cardNumber": "候補2の正確な型番 (例: 134/108)",
          "conditionGrade": "コンディションマスターから選定",
          "jpBuyPriceJPY": "¥X,XXX",
          "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
          "priceSpreadJPY": "¥X,XXX",
          "spreadROI": "XX%",
          "liquidity": "直近7日 X件",
          "sourcePlatform": "参照プラットフォーム名",
          "evidenceNote": "売価根拠",
          "insight": "特徴1行"
        },
        {
          "cardName": "候補3のカード名とレアリティ",
          "cardNumber": "候補3の正確な型番 (例: 205/172)",
          "conditionGrade": "コンディションマスターから選定",
          "jpBuyPriceJPY": "¥X,XXX",
          "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
          "priceSpreadJPY": "¥X,XXX",
          "spreadROI": "XX%",
          "liquidity": "直近7日 X件",
          "sourcePlatform": "参照プラットフォーム名",
          "evidenceNote": "売価根拠",
          "insight": "特徴1行"
        }
      ]
    }
  ]
}`;

    const res = await modelWithSearch.invoke(slotPrompt);
    return parseAIJson(res.content.toString());
  });

  const slotResults = await Promise.all(slotPromises);

  // ==========================================================================
  // 【Step 2】発掘した商品を要約し、サマリーAIへ渡してデータ駆動分析
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
リサーチチームが日本市場をスクリーニングし、現地主要プラットフォーム（${cur.targetPlatforms.join(' / ')}）で利ざやの取れる【最新の調達候補リスト（計${allDiscoveredItems.length}商品）】を発掘しました。

【今週発掘された調達・価格差データ】:
${JSON.stringify(allDiscoveredItems, null, 2)}

【任務】
上記データ群をフラットかつ客観的に観察し、海外現地ショップオーナーに向けた【データ駆動型エグゼクティブ・サマリー】を作成してください。

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}】アービトラージレポート",
  "claim": "今週の${cur.name}向け日本語版カード輸入調達戦略",
  "summary": {
    "headline": "データから浮かび上がった、最も特筆すべき市場動向や歪みの核心",
    "macroAnalysis": {
      "japanSourcingClimate": "仕入れ値・在庫動向から読み解く、日本国内市場の調達環境分析",
      "localMarketDemand": "現地売価・成約速度から浮き彫りになる、現地需要の偏り"
    },
    "microAnalysis": {
      "topImportMarginCard": "リスト中【最も利ざや・価格ギャップが顕著なカード名】とその選定根拠",
      "topLocalVelocityCard": "リスト中【最も成約件数・回転が速いカード名】とその選定根拠",
      "conditionGradingInsight": "データ構成から見えてくる独自のインサイト"
    },
    "riskAlert": {
      "sourcingQualityTrap": "今回選定された商材を日本から仕入れる際の注意点",
      "localInventoryRisk": "現地での在庫滞留・急落リスクを避けるための回転戦略"
    },
    "actionDirectives": [
      "短期的な重点回収＆スピード販売アクション",
      "中・高額帯のプレミアム販売＆利ざや確保アクション"
    ]
  }
}`;

  const summaryRes = await baseModel.invoke(summaryPrompt);
  const summaryParsed = parseAIJson(summaryRes.content.toString());

  return {
    title: summaryParsed?.title || `【${region.toUpperCase()}】アービトラージレポート`,
    claim: summaryParsed?.claim || `${cur.name}向け調達レポート`,
    exchangeRate: {
      currency: cur.currency,
      rateJPY: exchangeRateJPY,
      label: `1 ${cur.currency} ＝ ¥${exchangeRateJPY.toLocaleString()}`
    },
    summary: summaryParsed?.summary || null,
    slots: slotResults,
  };
}