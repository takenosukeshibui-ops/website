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
 * スクレイピング確定データ（slotRealCandidates）と一致するアイテムのみを許可し、
 * 一致しないAIの創作・独自調査データは null を返して完全に除外する
 */
function filterAndHydrateVerifiedItem(
  item: ArbitrageItem | undefined,
  isGradedOrSealed: boolean,
  slotRealCandidates: VerifiedArbitrageCandidate[],
  region: 'us' | 'eu' | 'asia'
): ArbitrageItem | null {
  if (!item) return null;

  const cardNum = String(item.cardNumber || '').trim().toUpperCase();
  const rawName = String(item.cardName || '').trim();
  if (!cardNum || !rawName) return null;

  // Apify確定データと「型番」および「カード名」の両方が一致するレコードを検索
  const matchedVerified = slotRealCandidates.find(
    (c) =>
      c.cardNumber.toUpperCase() === cardNum &&
      (c.cardName === rawName || c.cardName.includes(rawName) || rawName.includes(c.cardName))
   );

  // 🌟 一致するスクレイピングデータが存在しない場合は完全に除外（AI独自調査を一切許可しない）
  if (!matchedVerified) {
    return null;
  }

  // コンディション枠の整合性再チェック
  const isCandidateGradedOrSealed = matchedVerified.conditionGrade !== 'Raw NM';
  if (isGradedOrSealed !== isCandidateGradedOrSealed) {
    return null;
  }

  // "直近成約 3件" から "3件" を抽出（UI表示崩れ防止）
  const countMatch = matchedVerified.liquidity.match(/(\d+件)/);
  const volumeLabel = countMatch ? countMatch[1] : matchedVerified.liquidity;

  // スクレイピング確定データで全フィールドを上書き
  return {
    cardName: matchedVerified.cardName,
    cardNumber: matchedVerified.cardNumber,
    conditionGrade: matchedVerified.conditionGrade,
    jpShopName: matchedVerified.jpShopName || 'ポケカジラ状態◎最安',
    jpBuyPriceJPY: `¥${matchedVerified.jpBuyPriceJPY.toLocaleString()}`,
    jpEvidenceUrl: matchedVerified.pokecazillaUrl,
    targetSoldPrice: `${matchedVerified.currency} ${matchedVerified.ebaySoldForeign} (約¥${matchedVerified.ebaySoldJpy.toLocaleString()})`,
    priceSpreadJPY: `¥${matchedVerified.priceSpreadJPY.toLocaleString()}`,
    spreadROI: `${matchedVerified.spreadROI}%`,
    salesVolume7d: volumeLabel,
    salesVolume30d: volumeLabel,
    sourcePlatform: region === 'eu' ? 'eBay DE' : region === 'asia' ? 'eBay SG' : 'eBay US',
    evidenceNote: `Apify実売検証済 (${matchedVerified.liquidity})`,
    sourceEvidenceUrl: matchedVerified.ebayUrl,
    insight: item.insight || `${matchedVerified.liquidity}・利益率${matchedVerified.spreadROI}%の実売確認済銘柄`,
  };
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

  // 🌟 Google Search ツールは付与しない（外部からの独自データ取得を禁止）
  const baseModel = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.0,
    maxOutputTokens: 8192,
    apiKey,
  });

  const realCandidates =
    region === 'us' || region === 'eu'
      ? await getCachedRealCandidates(category, exchangeRateJPY, targetDay, region)
      : [];

  // スクレイピング候補が0件の場合はAIを呼び出さず空スロットを返す
  if (realCandidates.length === 0) {
    return {
      title: `【${region.toUpperCase()}】アービトラージレポート`,
      claim: `今週の${cur.name}向け日本語版カード輸入調達戦略（スクレイピング実売データ限定）`,
      exchangeRate: {
        currency: cur.currency,
        rateJPY: exchangeRateJPY,
        label: `1 ${cur.currency} ＝ ¥${exchangeRateJPY.toLocaleString()}`,
      },
      summary: null,
      slots: SLOTS.map((slot) => ({
        slotKey: slot.key,
        slotLabel: slot.label,
        tiers: [],
      })),
    };
  }

  const slotPromises = SLOTS.map(async (slot) => {
    const slotRealCandidates = realCandidates.filter((item) =>
      slot.isGradedOrSealed
        ? item.conditionGrade !== 'Raw NM'
        : item.conditionGrade === 'Raw NM'
    );

    // このスロットに対応するスクレイピング候補が0件ならAIを呼ばずに終了
    if (slotRealCandidates.length === 0) {
      return {
        slotKey: slot.key,
        slotLabel: slot.label,
        tiers: [],
      };
    }

    const slotPrompt = `あなたは【${cur.name}】で越境【${categoryName}】販売を展開する調達戦略アナリストです。
対象通貨: ${cur.currency}（最新為替: 1 ${cur.currency} ＝ 約${exchangeRateJPY}円）。

【最優先・厳格ルール（スクレイピング確定データ限定）】
・以下の【Apify実成約＆ポケカジラ最安値スクリーニング確定データ】に含まれるカード**のみ**を選定対象としてください。
・リストに存在しないカード名や型番を独自に調査・推測・追加することは【一切禁止】です。
・リストの中から、担当スロット【[${slot.key}] ${slot.label}（${slot.desc}）】の時代・カテゴリに該当するカードだけを抽出し、利益額と流動性の高い順に「本命（mainItem）1件」と「代替候補（subItems）最大2件」へ振り分けてください。
・担当スロット（時代・カテゴリ）に合致するカードがリスト内に1件もない場合は、無理に別時代のカードを入れず、必ず "tiers": [] を出力してください。

【Apify実成約＆ポケカジラ最安値スクリーニング確定データ（全${slotRealCandidates.length}件）】:
${JSON.stringify(slotRealCandidates, null, 2)}

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
        "cardName": "リストのcardNameをそのまま記載",
        "cardNumber": "リストのcardNumberをそのまま記載",
        "conditionGrade": "リストのconditionGradeをそのまま記載",
        "salesVolume7d": "リストのliquidityから記載",
        "salesVolume30d": "リストのliquidityから記載",
        "insight": "現地需要動向と利益優位性の解説（1行）"
      },
      "subItems": [
        {
          "cardName": "リストのcardNameをそのまま記載",
          "cardNumber": "リストのcardNumberをそのまま記載",
          "conditionGrade": "リストのconditionGradeをそのまま記載",
          "salesVolume7d": "リストのliquidityから記載",
          "salesVolume30d": "リストのliquidityから記載",
          "insight": "特徴1行"
        }
      ]
    }
  ]
}`;

    const res = await baseModel.invoke(slotPrompt);
    const parsed = parseAIJson(res.content.toString());

    const validatedTiers: ArbitrageTier[] = [];
    const usedCardNumbers = new Set<string>();

    if (parsed?.tiers && Array.isArray(parsed.tiers)) {
      for (const tier of parsed.tiers) {
        const validMain = filterAndHydrateVerifiedItem(
          tier.mainItem,
          slot.isGradedOrSealed,
          slotRealCandidates,
          region
        );

        // 本命アイテムがスクレイピングデータに一致しなければそのtier自体をスキップ
        if (!validMain || usedCardNumbers.has(validMain.cardNumber.toUpperCase())) {
          continue;
        }
        usedCardNumbers.add(validMain.cardNumber.toUpperCase());

        const validSubs: ArbitrageItem[] = [];
        if (Array.isArray(tier.subItems)) {
          for (const sub of tier.subItems) {
            const validSub = filterAndHydrateVerifiedItem(
              sub,
              slot.isGradedOrSealed,
              slotRealCandidates,
              region
            );
            if (validSub && !usedCardNumbers.has(validSub.cardNumber.toUpperCase())) {
              usedCardNumbers.add(validSub.cardNumber.toUpperCase());
              validSubs.push(validSub);
            }
          }
        }

        validatedTiers.push({
          priceTier: tier.priceTier || todayTier.key,
          priceTierLabel: tier.priceTierLabel || todayTier.label,
          mainItem: validMain,
          subItems: validSubs,
        });
      }
    }

    return {
      slotKey: slot.key,
      slotLabel: slot.label,
      tiers: validatedTiers,
    };
  });

  const rawSlotResults = await Promise.all(slotPromises);

  // 全スロット横断で同じ「カード名＋型番」が複数スロットに重複しないよう除外
  const globalUsedKeys = new Set<string>();
  const slotResults = rawSlotResults.map((slot) => {
    const dedupedTiers: ArbitrageTier[] = [];

    for (const tier of slot.tiers) {
      const mainKey = `${tier.mainItem.cardName}_${tier.mainItem.cardNumber}`.toUpperCase();
      if (globalUsedKeys.has(mainKey)) continue;
      globalUsedKeys.add(mainKey);

      const dedupedSubs = (tier.subItems || []).filter((sub) => {
        const subKey = `${sub.cardName}_${sub.cardNumber}`.toUpperCase();
        if (globalUsedKeys.has(subKey)) return false;
        globalUsedKeys.add(subKey);
        return true;
      });

      dedupedTiers.push({
        ...tier,
        subItems: dedupedSubs,
      });
    }

    return {
      ...slot,
      tiers: dedupedTiers,
    };
  });

  return {
    title: `【${region.toUpperCase()}】アービトラージレポート`,
    claim: `今週の${cur.name}向け日本語版カード輸入調達戦略（スクレイピング実売データ限定）`,
    exchangeRate: {
      currency: cur.currency,
      rateJPY: exchangeRateJPY,
      label: `1 ${cur.currency} ＝ ¥${exchangeRateJPY.toLocaleString()}`,
    },
    summary: null,
    slots: slotResults,
  };
}