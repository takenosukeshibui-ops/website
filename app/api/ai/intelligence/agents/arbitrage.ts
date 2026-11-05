// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName } from '../helpers';
import { createClient } from '@/lib/supabase/server';

export interface ArbitrageItem {
  cardName: string;
  cardNumber: string;
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
  sourceEvidenceUrl?: string; // 🌟 必須: AIが実際に確認した海外実売の個別URL
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

const SLOTS = [
  { key: 'classic_vintage', label: 'クラシック・ヴィンテージ', desc: '旧裏面・eシリーズ・ADV・PCG・初期絶版', isGradedOrSealed: false },
  { key: 'neo_vintage', label: 'ネオ・ヴィンテージ', desc: 'DP・Pt・LEGEND・BW・XY', isGradedOrSealed: false },
  { key: 'promos_exclusive', label: '限定プロモ・配布品', desc: '大会プロモ・ジムプロモ・企業コラボ・プレイヤーズ', isGradedOrSealed: false },
  { key: 'modern_meta', label: '現行モダン・高需要枠', desc: 'サン＆ムーン・ソード＆シールド・スカーレット＆バイオレット（SAR・SR・AR・CHR）', isGradedOrSealed: false },
  { key: 'high_end_sealed', label: '高額鑑定品・未開封BOX', desc: '高額PSA10/BGS鑑定品、絶版未開封BOX、サプライ未開封', isGradedOrSealed: true }
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

  const slotPromises = SLOTS.map(async (slot) => {
    const conditionRule = slot.isGradedOrSealed
      ? `【コンディション厳格ルール（高額鑑定・未開封専用枠）】
・このスロットは【鑑定品 ("PSA 10", "PSA 9", "BGS 9.5", "ARS 10") または 未開封 ("Sealed Box", "Sealed Pack")】のみを選定してください。
・素体（Raw）の選定は厳禁です。`
      : `【コンディション厳格ルール（素体・美品限定枠）】
・このスロットは必ず【素体・美品 ("Raw NM")】のみを選定してください！
・PSA 10などの鑑定品や未開封BOXの選定は【絶対に禁止】です！カード名に「PSA」を含めたり、conditionGradeに「PSA」を指定することは厳禁です。`;

    const slotPrompt = `あなたは【${cur.name}】で越境【${categoryName}】販売を展開する調達戦略アナリストです。
対象通貨: ${cur.currency}（最新リアルタイム為替: 1 ${cur.currency} ＝ 約${exchangeRateJPY}円）。

${conditionRule}

【超重要: 状態NM（美品）基準の厳格遵守】
仕入れ価格（jpBuyPriceJPY）には、カードラッシュ等の大手通販サイトにおける【通常美品（NM / 状態A）の正規販売価格】を必ず設定してください。
※「状態B」「状態C」「傷あり特価」「プレイ用」の安値を引用することは絶対に禁止です。

【重要: 型番および実売URLの出力義務】
・個別商品ページを特定するため、【型番（例: 096/071, PROMO 001/SV-P 等）】を必ず cardNumber フィールドに明記してください。
・相場調査の際にAIが参照したeBay等における【個別の実成約（Sold Listings）URL】を sourceEvidenceUrl フィールドへ確実に抽出してください。

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）
【本日の指定価格帯】: 【${todayTier.label} (${todayTier.desc})】 / 判定基準: ${todayTier.criteria}

【調達リサーチ任務】
このスロットの中から、本日の指定価格帯【${todayTier.label}】に合致するカードを【本命1商品 ＋ 代替候補2商品（計3商品）】厳選抽出してください。

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
        "conditionGrade": "${slot.isGradedOrSealed ? 'PSA 10' : 'Raw NM'}",
        "jpBuyPriceJPY": "¥X,XXX (※通常美品/状態Aの正規価格)",
        "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
        "priceSpreadJPY": "¥X,XXX",
        "spreadROI": "XX%",
        "liquidity": "直近7日 X件",
        "sourcePlatform": "参照プラットフォーム名 (例: eBay)",
        "evidenceNote": "売価根拠 (例: 11/15 Sold Listing)",
        "sourceEvidenceUrl": "AIが確認したeBay等の個別実成約URL (※省略厳禁)",
        "insight": "現地需要動向と輸入推奨理由（1行）"
      },
      "subItems": [
        {
          "cardName": "候補2のカード名とレアリティ",
          "cardNumber": "候補2の正確な型番",
          "conditionGrade": "${slot.isGradedOrSealed ? 'PSA 10' : 'Raw NM'}",
          "jpBuyPriceJPY": "¥X,XXX",
          "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
          "priceSpreadJPY": "¥X,XXX",
          "spreadROI": "XX%",
          "liquidity": "直近7日 X件",
          "sourcePlatform": "参照プラットフォーム名",
          "evidenceNote": "売価根拠",
          "sourceEvidenceUrl": "AIが確認した個別の実成約URL",
          "insight": "特徴1行"
        },
        {
          "cardName": "候補3のカード名とレアリティ",
          "cardNumber": "候補3の正確な型番",
          "conditionGrade": "${slot.isGradedOrSealed ? 'PSA 10' : 'Raw NM'}",
          "jpBuyPriceJPY": "¥X,XXX",
          "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
          "priceSpreadJPY": "¥X,XXX",
          "spreadROI": "XX%",
          "liquidity": "直近7日 X件",
          "sourcePlatform": "参照プラットフォーム名",
          "evidenceNote": "売価根拠",
          "sourceEvidenceUrl": "AIが確認した個別の実成約URL",
          "insight": "特徴1行"
        }
      ]
    }
  ]
}`;

    const res = await modelWithSearch.invoke(slotPrompt);
    const parsed = parseAIJson(res.content.toString());

    if (!slot.isGradedOrSealed && parsed?.tiers) {
      for (const tier of parsed.tiers) {
        if (tier.mainItem) {
          tier.mainItem.conditionGrade = 'Raw NM';
          tier.mainItem.cardName = tier.mainItem.cardName.replace(/PSA\s*\d+/gi, '').trim();
        }
        if (Array.isArray(tier.subItems)) {
          for (const sub of tier.subItems) {
            sub.conditionGrade = 'Raw NM';
            sub.cardName = sub.cardName.replace(/PSA\s*\d+/gi, '').trim();
          }
        }
      }
    }

    return parsed;
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