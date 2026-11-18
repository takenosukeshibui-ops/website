// app/api/ai/intelligence/agents/arbitrage.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getCategoryName } from '../helpers';
import {
  fetchRealArbitrageCandidates,
  VerifiedArbitrageCandidate,
} from '@/lib/market-fetcher/apify-arbitrage';

const cachedApifyByRegion = new Map<
  string,
  { timestamp: number; items: VerifiedArbitrageCandidate[] }
>();

async function getCachedRealCandidates(
  category: string,
  exchangeRateJPY: number,
  targetDay: string,
  region: 'us' | 'eu'
): Promise<VerifiedArbitrageCandidate[]> {
  const now = Date.now();
  const cacheKey = `${region}_${category}_${targetDay}_${exchangeRateJPY}`;
  const existing = cachedApifyByRegion.get(cacheKey);
  if (existing && now - existing.timestamp < 60_000) {
    return existing.items;
  }
  const items = await fetchRealArbitrageCandidates(category, exchangeRateJPY, targetDay, region);
  cachedApifyByRegion.set(cacheKey, { timestamp: now, items });
  return items;
}

export interface ArbitrageItem {
  cardName: string;
  cardNumber: string;
  conditionGrade: string;
  jpShopName: string;
  jpBuyPriceJPY: string;
  jpEvidenceUrl?: string;
  targetSoldPrice: string;
  priceSpreadJPY: string;
  spreadROI: string;
  salesVolume7d: string;
  salesVolume30d: string;
  sourcePlatform?: string;
  evidenceNote?: string;
  sourceEvidenceUrl?: string;
  insight: string;
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
    targetPlatforms: ['eBay (US)', 'TCGplayer'],
  },
  eu: {
    currency: 'EUR',
    name: '欧州（ヨーロッパ）市場',
    targetPlatforms: ['eBay DE', 'Cardmarket', 'eBay UK'],
  },
  asia: {
    currency: 'SGD',
    name: 'アジア（シンガポール・台湾・香港等）市場',
    targetPlatforms: ['Shopee', 'Carousell', 'eBay'],
  },
};

export const DAY_PRICE_TIER_MAP: Record<string, { key: string; label: string; desc: string; criteria: string }> = {
  Monday: { key: 'under_3k', label: '〜3千円', desc: '超高回転・エントリー枠', criteria: '直近7日成約 5件以上' },
  Tuesday: { key: 'under_10k', label: '3千〜1万円', desc: '定番コレクション枠', criteria: '直近7日成約 3件以上' },
  Wednesday: { key: 'middle', label: '1万〜3万円', desc: '中核プロモ・高需要SAR枠', criteria: '直近30日成約 3件以上' },
  Thursday: { key: 'upper', label: '3万〜8万円', desc: '準高額鑑定・上位絶版枠', criteria: '直近30日成約 2件以上' },
  Friday: { key: 'top_end', label: '8万円〜', desc: '資産性PSA10・絶版BOX枠', criteria: '直近30日成約 1件以上' },
  Saturday: { key: 'middle', label: '1万〜3万円', desc: '週末高需要コレクション枠', criteria: '直近30日成約 3件以上' },
  Sunday: { key: 'under_10k', label: '3千〜1万円', desc: '週明け即売れ回転枠', criteria: '直近7日成約 3件以上' },
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
  { key: 'high_end_sealed', label: '高額鑑定品・未開封BOX', desc: '高額PSA10/BGS鑑定品、絶版未開封BOX、サプライ未開封', isGradedOrSealed: true },
];

/**
 * 出力アイテムのURL・価格・コンディションをプログラム側で厳格正規化する
 */
function enforceDataIntegrity(
  item: ArbitrageItem | undefined,
  isGradedOrSealed: boolean,
  slotRealCandidates: VerifiedArbitrageCandidate[],
  category: string,
  region: 'us' | 'eu' | 'asia',
  currency: string,
  exchangeRateJPY: number
): void {
  if (!item) return;

  // 1. 素体枠のコンディション強制クリーンアップ
  if (!isGradedOrSealed) {
    item.conditionGrade = 'Raw NM';
    item.cardName = String(item.cardName || '')
      .replace(/\b(PSA|BGS|CGC|ARS|ACE)\s*\d*(\.\d+)?/gi, '')
      .replace(/鑑定品?/g, '')
      .trim();
  }

  const cardNum = String(item.cardNumber || '').trim();
  const categoryId = category === 'onepiece' ? 18 : 17;
  const domainPath = category === 'onepiece' ? 'onepiece' : 'pokemon';

  // 確実に実在するポケカジラ型番検索一覧URL
  const safePokecazillaSearchUrl = cardNum
    ? `https://pokecazilla.com/${domainPath}/products/list?category_id=${categoryId}&name=${encodeURIComponent(cardNum)}`
    : `https://pokecazilla.com/${domainPath}/products/list?category_id=${categoryId}&name=${encodeURIComponent(item.cardName)}`;

  // 地域に合わせて実在するeBay Sold成約検索URLを生成
  const ebayOrigin = region === 'eu' ? 'https://www.ebay.de' : 'https://www.ebay.com';
  const safeEbaySoldSearchUrl = `${ebayOrigin}/sch/i.html?_nkw=${encodeURIComponent(
    `${cardNum || item.cardName} Japanese`
  )}&LH_Sold=1&LH_Complete=1`;

  // 2. Apify確定データと型番が一致する場合は、確定数値・確定URLを直接注入
  const matchedVerified = slotRealCandidates.find(
    (c) => c.cardNumber.toUpperCase() === cardNum.toUpperCase()
  );

  if (matchedVerified) {
    item.cardName = matchedVerified.cardName;
    item.cardNumber = matchedVerified.cardNumber;
    item.conditionGrade = matchedVerified.conditionGrade;
    item.jpShopName = matchedVerified.jpShopName || 'ポケカジラ状態◎最安';
    item.jpBuyPriceJPY = `¥${matchedVerified.jpBuyPriceJPY.toLocaleString()}`;
    item.jpEvidenceUrl = matchedVerified.pokecazillaUrl || safePokecazillaSearchUrl;
    item.targetSoldPrice = `${matchedVerified.currency} ${matchedVerified.ebaySoldForeign} (約¥${matchedVerified.ebaySoldJpy.toLocaleString()})`;
    item.priceSpreadJPY = `¥${matchedVerified.priceSpreadJPY.toLocaleString()}`;
    item.spreadROI = `${matchedVerified.spreadROI}%`;
    item.sourcePlatform = region === 'eu' ? 'eBay DE' : 'eBay US';
    item.evidenceNote = `Apify実売検証済 (${matchedVerified.liquidity})`;
    item.sourceEvidenceUrl = matchedVerified.ebayUrl || safeEbaySoldSearchUrl;
    return;
  }

  // 3. AI独自調査枠のURLを実在保証
  item.jpShopName = 'ポケカジラ型番最安値検索';
  item.jpEvidenceUrl = safePokecazillaSearchUrl;
  item.sourceEvidenceUrl = safeEbaySoldSearchUrl;
  item.evidenceNote = 'AI市場リサーチ（リンク先で最新在庫・成約要確認）';

  // 4. 利ざや・ROIの四則演算を再計算して数値の整合性を保証
  const buyNum = Number(String(item.jpBuyPriceJPY || '').replace(/[^\d]/g, '')) || 0;
  const soldForeignMatch = String(item.targetSoldPrice || '').match(/([\d.]+)/);
  const soldForeign = soldForeignMatch ? Number(soldForeignMatch[1]) : 0;

  if (buyNum > 0 && soldForeign > 0) {
    const soldJpy = Math.round(soldForeign * exchangeRateJPY);
    const spread = soldJpy - buyNum;
    const roi = Math.round((spread / buyNum) * 100);
    item.targetSoldPrice = `${currency} ${soldForeign} (約¥${soldJpy.toLocaleString()})`;
    item.priceSpreadJPY = `¥${spread.toLocaleString()}`;
    item.spreadROI = `${roi}%`;
  }
}

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

  const realCandidates =
    region === 'us' || region === 'eu'
      ? await getCachedRealCandidates(category, exchangeRateJPY, targetDay, region)
      : [];

  const slotPromises = SLOTS.map(async (slot) => {
    const slotRealCandidates = realCandidates.filter((item) =>
      slot.isGradedOrSealed
        ? item.conditionGrade !== 'Raw NM'
        : item.conditionGrade === 'Raw NM'
    );

    const realDataSection =
      slotRealCandidates.length > 0
        ? `\n【最優先：Apify実成約＆ポケカジラ最安値スクリーニング確定データ（${cur.name}・実在数値）】:
${JSON.stringify(slotRealCandidates, null, 2)}

※上記の確定データに該当スロット（${slot.label}）・価格帯（${todayTier.label}）に合致するカードがある場合は、必ず上記データを最優先で採用し、cardNumber を正確に一致させて出力してください。
`
        : '';

    const conditionRule = slot.isGradedOrSealed
      ? `【コンディション厳格ルール（高額鑑定・未開封専用枠）】
・このスロットは【鑑定品 ("PSA 10", "PSA 9", "BGS 9.5", "ARS 10") または 未開封 ("Sealed Box", "Sealed Pack")】のみを選定してください。
・素体（Raw）の選定は厳禁です。`
      : `【コンディション厳格ルール（素体・美品限定枠）】
・このスロットは必ず【素体・美品 ("Raw NM")】のみを選定してください！
・PSA 10・BGS・CGC・ARSなどの鑑定品や未開封BOXの選定は【絶対に禁止】です！`;

    const slotPrompt = `あなたは【${cur.name}】で越境【${categoryName}】販売を展開する調達戦略アナリストです。
対象通貨: ${cur.currency}（最新為替: 1 ${cur.currency} ＝ 約${exchangeRateJPY}円）。

${conditionRule}
${realDataSection}
【リサーチ ＆ 利益計算ルール（シンプル差額方式）】
1. 出口相場（${cur.name}成約データ）:
   - 直近実際に売れた成約価格（Sold）を参照し、targetSoldPrice を ${cur.currency} 建てで設定してください。
   - 成約実績として【直近7日間の成約件数 (salesVolume7d)】と【直近30日間の成約件数 (salesVolume30d)】の両方を必ず明記してください。
2. 入口相場（国内大手ショップ・ポケカジラ在庫比較）:
   - 【ポケカジラ】【晴れる屋2】【トレカキャンプ】等の通常美品（状態A/NM）の最安値を確認し、正確な型番（cardNumber）と仕入れ価格（jpBuyPriceJPY）を出力してください。
   - 「状態B」「状態C」「傷あり特価」の安値を引用することは禁止です。
3. 単純利ざや計算:
   - targetSoldPrice の日本円換算値 ＝ 現地売価(${cur.currency}) × ${exchangeRateJPY}円
   - priceSpreadJPY（利ざや） ＝ targetSoldPrice(円換算) − jpBuyPriceJPY
   - spreadROI（%） ＝ Math.round((priceSpreadJPY / jpBuyPriceJPY) * 100)%

【担当スロット】: [${slot.key}] ${slot.label}（${slot.desc}）
【本日の指定価格帯】: 【${todayTier.label} (${todayTier.desc})】

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
        "jpShopName": "ポケカジラ最安値比較",
        "jpBuyPriceJPY": "¥X,XXX",
        "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
        "priceSpreadJPY": "¥X,XXX",
        "spreadROI": "XX%",
        "salesVolume7d": "X件",
        "salesVolume30d": "X件",
        "sourcePlatform": "${cur.targetPlatforms[0]}",
        "evidenceNote": "成約実績基準",
        "insight": "現地需要動向とショップ比較における優位性（1行）"
      },
      "subItems": [
        {
          "cardName": "候補2のカード名とレアリティ",
          "cardNumber": "候補2の正確な型番",
          "conditionGrade": "${slot.isGradedOrSealed ? 'PSA 10' : 'Raw NM'}",
          "jpShopName": "ポケカジラ最安値比較",
          "jpBuyPriceJPY": "¥X,XXX",
          "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
          "priceSpreadJPY": "¥X,XXX",
          "spreadROI": "XX%",
          "salesVolume7d": "X件",
          "salesVolume30d": "X件",
          "sourcePlatform": "${cur.targetPlatforms[0]}",
          "evidenceNote": "成約実績基準",
          "insight": "特徴1行"
        },
        {
          "cardName": "候補3のカード名とレアリティ",
          "cardNumber": "候補3の正確な型番",
          "conditionGrade": "${slot.isGradedOrSealed ? 'PSA 10' : 'Raw NM'}",
          "jpShopName": "ポケカジラ最安値比較",
          "jpBuyPriceJPY": "¥X,XXX",
          "targetSoldPrice": "${cur.currency} XX (約¥X,XXX)",
          "priceSpreadJPY": "¥X,XXX",
          "spreadROI": "XX%",
          "salesVolume7d": "X件",
          "salesVolume30d": "X件",
          "sourcePlatform": "${cur.targetPlatforms[0]}",
          "evidenceNote": "成約実績基準",
          "insight": "特徴1行"
        }
      ]
    }
  ]
}`;

    const res = await modelWithSearch.invoke(slotPrompt);
    const parsed = parseAIJson(res.content.toString());

    if (parsed?.tiers) {
      for (const tier of parsed.tiers) {
        enforceDataIntegrity(
          tier.mainItem,
          slot.isGradedOrSealed,
          slotRealCandidates,
          category,
          region,
          cur.currency,
          exchangeRateJPY
        );
        if (Array.isArray(tier.subItems)) {
          for (const sub of tier.subItems) {
            enforceDataIntegrity(
              sub,
              slot.isGradedOrSealed,
              slotRealCandidates,
              category,
              region,
              cur.currency,
              exchangeRateJPY
            );
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
      label: `1 ${cur.currency} ＝ ¥${exchangeRateJPY.toLocaleString()}`,
    },
    summary: null,
    slots: slotResults,
  };
}