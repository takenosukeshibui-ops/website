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
 * 確定候補を既存の5スロットへ決定論的に分類する（AIによる除外・変更を一切行わない）
 */
function classifyCandidateToSlot(candidate: VerifiedArbitrageCandidate): string {
  const grade = candidate.conditionGrade || '';
  const isRaw = grade === 'Raw' || grade.startsWith('Raw (');

  // 1. 鑑定品（PSA / BGS / CGC / ARS / Graded）・未開封BOXはすべて鑑定・未開封枠へ
  if (!isRaw) {
    return 'high_end_sealed';
  }

  const name = candidate.cardName || '';
  const num = (candidate.cardNumber || '').toUpperCase();

  // 2. プロモ型番・プロモ表記は限定プロモ枠へ
  if (
    /\/(?:[A-Z0-9]+-P|PPP|PLAY|T|P)$/.test(num) ||
    /(プロモ|PROMO|見返り美人|ムンク|ポンチョ|フェスタ|プレシャス|ゴールデン|カナザワ|ヨコハマ|シブヤ|トウキョー|サッポロ|フクオカ|ヒロシマ|オーサカ|ナゴヤ|キョウト)/i.test(
      name
    )
  ) {
    return 'promos_exclusive';
  }

  // 3. クラシック・ヴィンテージ枠（旧裏・VS・web・e・ADV・PCG期）
  if (
    /\[(VS|WEB|E[1-5]|ADV\d*|PCG\d*)\]/i.test(name) ||
    /(旧裏|ひかる|☆|スター)/.test(name) ||
    /^\d{3}$/.test(num)
  ) {
    return 'classic_vintage';
  }

  // 4. ネオ・ヴィンテージ枠（DP・Pt・LEGEND・BW・XY期）
  if (
    /\[(DP\d*|DPBP|PT\d*|L[1-3]|LL|BW\d*|XY\d*|CP\d*)\]/i.test(name) ||
    /(LV\.X|グレート|LEGEND|BREAK)/.test(name)
  ) {
    return 'neo_vintage';
  }

  // 5. 上記以外のシングルは現行モダン・メタ枠へ
  return 'modern_meta';
}

/**
 * スクレイピング確定データをレポート用 ArbitrageItem へ変換する
 */
function buildVerifiedArbitrageItem(
  candidate: VerifiedArbitrageCandidate,
  region: 'us' | 'eu' | 'asia',
  customInsight?: string
): ArbitrageItem {
  const countMatch = candidate.liquidity.match(/(\d+件)/);
  const volumeLabel = countMatch ? countMatch[1] : candidate.liquidity;

  const fallbackInsight = `${candidate.liquidity}・利益率${candidate.spreadROI}%（${candidate.jpShopName} ¥${candidate.jpBuyPriceJPY.toLocaleString()} → ${candidate.currency} ${candidate.ebaySoldForeign}）`;

  return {
    cardName: candidate.cardName,
    cardNumber: candidate.cardNumber,
    conditionGrade: candidate.conditionGrade,
    jpShopName: candidate.jpShopName || 'ポケカジラ状態◎最安',
    jpBuyPriceJPY: `¥${candidate.jpBuyPriceJPY.toLocaleString()}`,
    jpEvidenceUrl: candidate.pokecazillaUrl,
    targetSoldPrice: `${candidate.currency} ${candidate.ebaySoldForeign} (約¥${candidate.ebaySoldJpy.toLocaleString()})`,
    priceSpreadJPY: `¥${candidate.priceSpreadJPY.toLocaleString()}`,
    spreadROI: `${candidate.spreadROI}%`,
    salesVolume7d: volumeLabel,
    salesVolume30d: volumeLabel,
    sourcePlatform: region === 'eu' ? 'eBay DE' : region === 'asia' ? 'eBay SG' : 'eBay US',
    evidenceNote: `Apify実売検証済 (${candidate.liquidity})`,
    sourceEvidenceUrl: candidate.ebayUrl,
    insight:
      typeof customInsight === 'string' && customInsight.trim().length > 0
        ? customInsight.trim()
        : fallbackInsight,
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

  // 🌟 パターンA: AIには「総括サマリー」と「各カードの狙い目メモ(insight)」の文章生成のみを行わせる
  let aiSummary: any = null;
  let aiInsightsMap: Record<string, string> = {};

  if (apiKey) {
    try {
      const compactCandidates = realCandidates.map((c, idx) => ({
        index: idx,
        cardName: c.cardName,
        cardNumber: c.cardNumber,
        conditionGrade: c.conditionGrade,
        jpShopName: c.jpShopName,
        jpBuyPriceJPY: c.jpBuyPriceJPY,
        ebaySoldForeign: `${c.currency} ${c.ebaySoldForeign}`,
        ebaySoldJpy: c.ebaySoldJpy,
        priceSpreadJPY: c.priceSpreadJPY,
        spreadROI: c.spreadROI,
        liquidity: c.liquidity,
      }));

      const summaryAndInsightPrompt = `あなたは【${cur.name}】で越境【${categoryName}】販売を展開する調達戦略アナリストです。
以下はプログラムによって価格・在庫・状態ランクが確定済みのアービトラージ候補（全${compactCandidates.length}件）です。

【確定候補データ（全${compactCandidates.length}件）】:
${JSON.stringify(compactCandidates, null, 2)}

【指示】
1. 候補の除外・追加・数値の改変は一切行わず、全${compactCandidates.length}件すべて（index 0〜${compactCandidates.length - 1}）について、バイヤー向けの簡潔な「狙い目メモ（insight：1行で現地需要や状態ランクの優位性を解説）」を作成してください。
2. 全体の傾向をまとめた executive summary（summary）を作成してください。
3. 必ず以下のJSON形式のみを出力してください（マークダウン不要）。

{
  "summary": {
    "headline": "全体の結論ヘッドライン（1文）",
    "macroAnalysis": {
      "japanSourcingClimate": "日本国内の仕入れ環境・在庫状況の要約",
      "localMarketDemand": "${cur.name}の成約動向・需要の要約"
    },
    "microAnalysis": {
      "topImportMarginCard": "最大利益幅カードの具体的な特徴",
      "topLocalVelocityCard": "回転率・成約件数が目立つカードの傾向",
      "conditionGradingInsight": "状態ランク（美品/良品/鑑定品）ごとの価格差の着眼点"
    },
    "riskAlert": {
      "sourcingQualityTrap": "国内仕入れ時の状態確認リスク",
      "localInventoryRisk": "海外販売時の相場変動・流動性リスク"
    },
    "actionDirectives": [
      "具体的な買い付け・出品アクション1",
      "具体的な買い付け・出品アクション2"
    ]
  },
  "insights": {
    "0": "index 0 のカードの狙い目メモ（1行）",
    "1": "index 1 のカードの狙い目メモ（1行）"
  }
}`;

      const res = await baseModel.invoke(summaryAndInsightPrompt);
      const parsed = parseAIJson(res.content.toString());
      if (parsed && typeof parsed === 'object') {
        if (parsed.summary) aiSummary = parsed.summary;
        if (parsed.insights && typeof parsed.insights === 'object') {
          aiInsightsMap = parsed.insights;
        }
      }
    } catch (err) {
      console.warn('[SayaAnalysis] AIサマリー/insight生成をスキップし、定型文にフォールバックします:', err);
    }
  }

  // 🌟 確定候補を1件も削らず5スロットへ上限なしで格納（既に priceSpreadJPY 降順）
  const itemsBySlot = new Map<string, ArbitrageItem[]>();
  for (const slot of SLOTS) {
    itemsBySlot.set(slot.key, []);
  }

  realCandidates.forEach((candidate, idx) => {
    const slotKey = classifyCandidateToSlot(candidate);
    const item = buildVerifiedArbitrageItem(candidate, region, aiInsightsMap[String(idx)]);
    const list = itemsBySlot.get(slotKey) || [];
    list.push(item);
    itemsBySlot.set(slotKey, list);
  });

  const slotResults: ArbitrageSlotReport[] = SLOTS.map((slot) => {
    const items = itemsBySlot.get(slot.key) || [];
    if (items.length === 0) {
      return {
        slotKey: slot.key,
        slotLabel: slot.label,
        tiers: [],
      };
    }

    return {
      slotKey: slot.key,
      slotLabel: slot.label,
      tiers: [
        {
          priceTier: todayTier.key,
          priceTierLabel: todayTier.label,
          mainItem: items[0],
          subItems: items.slice(1), // 上限撤廃：2件目以降をすべて格納
        },
      ],
    };
  });

  const topCandidate = realCandidates[0];
  const fallbackSummary = {
    headline: `${cur.name}で利益基準を満たす確定候補 全${realCandidates.length}件を検出（最大粗利: ${topCandidate.cardName} ¥${topCandidate.priceSpreadJPY.toLocaleString()}）。`,
    macroAnalysis: {
      japanSourcingClimate: 'ポケカジラ掲載ショップの状態ランク別（状態◎/○/△）実在庫最安値と照合済み。',
      localMarketDemand: `${cur.name}の直近成約データ（${cur.currency}建て）から公式コンディション別に算出。`,
    },
    microAnalysis: {
      topImportMarginCard: `${topCandidate.cardName}（${topCandidate.conditionGrade}）：仕入 ¥${topCandidate.jpBuyPriceJPY.toLocaleString()} → 成約 ${topCandidate.currency} ${topCandidate.ebaySoldForeign}（差額 ¥${topCandidate.priceSpreadJPY.toLocaleString()}）`,
      topLocalVelocityCard: `全${realCandidates.length}件が直近成約実績あり・ROI 15%以上の基準をクリア。`,
      conditionGradingInsight: '未鑑定品はeBayコンディションと国内状態ランクを1対1で照合し、傷あり逆ザヤリスクを排除済み。',
    },
    riskAlert: {
      sourcingQualityTrap: '購入前にショップ個別の状態表記（白欠け・線傷の有無）と在庫状況を最終確認してください。',
      localInventoryRisk: '為替レート変動およびeBay販売手数料・国際送料を考慮した上で出品価格を設定してください。',
    },
    actionDirectives: [
      `粗利上位の ${topCandidate.cardName}（¥${topCandidate.priceSpreadJPY.toLocaleString()}）から優先的に国内在庫を確保する。`,
      '各スロット内の代替候補も含め、仕入れ可能な在庫をまとめて確保し同梱発送で送料を圧縮する。',
    ],
  };

  return {
    title: `【${region.toUpperCase()}】アービトラージレポート（全${realCandidates.length}件）`,
    claim: `今週の${cur.name}向け日本語版カード輸入調達戦略（確定データ全${realCandidates.length}件・上限撤廃）`,
    exchangeRate: {
      currency: cur.currency,
      rateJPY: exchangeRateJPY,
      label: `1 ${cur.currency} ＝ ¥${exchangeRateJPY.toLocaleString()}`,
    },
    summary: aiSummary || fallbackSummary,
    slots: slotResults,
  };
}