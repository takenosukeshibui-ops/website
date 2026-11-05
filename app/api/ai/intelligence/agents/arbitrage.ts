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

// 🌟 曜日ごとの対象価格帯ローテーション定義（1日1価格帯）
export const DAY_PRICE_TIER_MAP: Record<string, { key: string; label: string; desc: string; criteria: string }> = {
  Monday: { key: 'under_3k', label: '〜3千円', desc: '超高回転・エントリー枠', criteria: '最低差額 +¥1,000以上、現地直近7日成約 5件以上' },
  Tuesday: { key: 'under_10k', label: '3千〜1万円', desc: '定番コレクション枠', criteria: '最低差額 +¥2,500以上、現地直近7日成約 3件以上' },
  Wednesday: { key: 'middle', label: '1万〜3万円', desc: '中核プロモ・高需要SAR枠', criteria: '最低差額 +¥6,000以上、現地直近14日成約 2件以上' },
  Thursday: { key: 'upper', label: '3万〜8万円', desc: '準高額鑑定・上位絶版枠', criteria: '最低差額 +¥15,000以上、現地直近30日成約 2件以上' },
  Friday: { key: 'top_end', label: '8万円〜', desc: '資産性PSA10・絶版BOX枠', criteria: '最低差額 +¥30,000以上、現地直近30日成約 1件以上' },
  Saturday: { key: 'middle', label: '1万〜3万円', desc: '週末高需要コレクション枠', criteria: '最低差額 +¥6,000以上、現地直近14日成約 2件以上' },
  Sunday: { key: 'under_10k', label: '3千〜1万円', desc: '週明け即売れ回転枠', criteria: '最低差額 +¥2,500以上、現地直近7日成約 3件以上' },
};

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
    console.warn(`[ExchangeRate] ${currency}のリアルタイム取得失敗:`, err);
  }
  const fallbacks: Record<string, number> = { USD: 155, EUR: 168, SGD: 118 };
  return fallbacks[currency] || 150;
}

// 🌟 常に全5スロットを網羅
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
  targetDay: string = 'Thursday'
) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;
  const categoryName = getCategoryName(category);
  const exchangeRateJPY = await getRealtimeExchangeRate(cur.currency);

  const todayTier = DAY_PRICE_TIER_MAP[targetDay] || DAY_PRICE_TIER_MAP.Thursday;

  const baseModel = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  const modelWithSearch = baseModel.bindTools([{ googleSearch: {} }]);

  let externalPriceContext = '※主要プラットフォーム成約基準に基づき推論';
  try {
    const supabase = await createClient();
    const { data: cachedPrices } = await supabase
      .from('overseas_market_prices')
      .select('platform, card_name, condition_grade, sold_price_local, currency, sold_price_jpy, volume_indicator')
      .eq('region', region)
      .eq('category', category)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (cachedPrices && cachedPrices.length > 0) {
      externalPriceContext = cachedPrices.map((p: any) => 
        `- [${p.platform}] ${p.card_name} (${p.condition_grade}): 売価 ${p.currency} ${p.sold_price_local} (約¥${Number(p.sold_price_jpy).toLocaleString()})`
      ).join('\n');
    }
  } catch (err) {
    console.warn('[Arbitrage] Overseas price fetch warning:', err);
  }

  // 🌟 全5スロットすべてを並列調査（スロットは削らず、価格帯を本日の指定枠1つに絞る）
  const slotPromises = SLOTS.map(async (slot) => {
    const slotPrompt = `あなたは【${cur.name}】で越境【${categoryName}】販売を展開する調達戦略アナリストです。
対象通貨: ${cur.currency}（最新リアルタイム為替: 1 ${cur.currency} ＝ 約${exchangeRateJPY}円）。

【超重要: 状態NM（美品）基準の厳格遵守】
仕入れ価格（jpBuyPriceJPY）には、カードラッシュ等の大手通販サイトにおける【通常美品（NM / 状態A）の正規販売価格】を必ず設定してください。
※「状態B」「状態C」「傷あり特価」「プレイ用」の安値を引用することは絶対に禁止です。

【重要: 型番（コレクションナンバー）の出力義務】
特定ショップの個別詳細ページをピンポイント特定するため、【型番（例: 096/071, 134/108, PROMO 001/SV-P, S8b 205/184 等）】を必ず cardNumber フィールドに明記してください。型番の省略は厳禁です。

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）
【本日の指定価格帯】: 【${todayTier.label} (${todayTier.desc})】 / 判定基準: ${todayTier.criteria}

【調達リサーチ任務】
このスロットの中から、本日の指定価格帯【${todayTier.label}】に合致するカードを【本命1商品 ＋ 代替候補2商品（計3商品）】厳選抽出してください。
（※他タイトルのカードやフリマCtoC相場は絶対に含めないこと）

以下のJSON形式のみを出力してください:
{
  "slotKey": "${slot.key}",
  "slotLabel": "${slot.label}",
  "tiers": [
    {
      "priceTier": "${todayTier.key}",
      "priceTierLabel": "${todayTier.label}",
      "mainItem": {
        "cardName": "実在カード名とレアリティ (例: ナンジャモ SAR)",
        "cardNumber": "実在する正確な型番 (例: 096/071 ※省略厳禁)",
        "conditionGrade": "コンディション (通常は Raw NM または PSA 10)",
        "jpBuyPriceJPY": "¥X,XXX (※通常美品/状態Aの正規価格)",
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
          "conditionGrade": "Raw NM または PSA 10",
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
          "conditionGrade": "Raw NM または PSA 10",
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

  return {
    title: `【${region.toUpperCase()}】アービトラージレポート`,
    claim: `今週の${cur.name}向け日本語版カード輸入調達戦略（全5スロット網羅）`,
    exchangeRate: {
      currency: cur.currency,
      rateJPY: exchangeRateJPY,
      label: `1 ${cur.currency} ＝ ¥${exchangeRateJPY.toLocaleString()}`
    },
    summary: null,
    slots: slotResults,
  };
}