// lib/market-fetcher/apify-arbitrage.ts
import { extractPokemonNameJa } from './pokemon-dictionary';

export interface VerifiedArbitrageCandidate {
  cardName: string;
  cardNumber: string;
  conditionGrade: string;
  jpBuyPriceJPY: number;
  jpShopName: string;
  currency: 'USD' | 'EUR';
  ebaySoldForeign: number;
  ebaySoldJpy: number;
  netProceedsJpy: number;
  priceSpreadJPY: number;
  spreadROI: number;
  liquidity: string;
  pokecazillaUrl: string;
  ebayUrl: string;
}

const APIFY_TOKEN = (process.env.APIFY_API_TOKEN || '').trim();

const EBAY_TASK_ID = (
  process.env.APIFY_EBAY_TASK_ID || 'caffein.dev/ebay-sold-listings'
).trim();

const POKECAZILLA_TASK_ID = (
  process.env.APIFY_POKEMON_TASK_ID ||
  process.env.APIFY_POKECAZILLA_TASK_ID ||
  'kempt_tapestry_mg3/pokemon-price-search'
).trim();

interface DayLocalPriceRange {
  minLocal: number;
  maxLocal?: number;
  minSpreadJpy: number;
}

/**
 * 曜日（targetDay）の価格帯ラベルに合わせて eBay 検索用の現地通貨（USD / EUR）価格帯を算出する
 */
function getLocalPriceRangeForDay(targetDay: string, exchangeRateJpy: number): DayLocalPriceRange {
  switch (targetDay) {
    case 'Monday': // 〜3千円（エントリー・超高回転枠）
      return {
        minLocal: Math.max(8, Math.floor(1500 / exchangeRateJpy)),
        maxLocal: Math.ceil(6000 / exchangeRateJpy),
        minSpreadJpy: 500,
      };
    case 'Tuesday': // 3千〜1万円（定番コレクション枠）
    case 'Sunday':  // 3千〜1万円（週明け即売れ回転枠）
      return {
        minLocal: Math.floor(3500 / exchangeRateJpy),
        maxLocal: Math.ceil(16000 / exchangeRateJpy),
        minSpreadJpy: 1000,
      };
    case 'Wednesday': // 1万〜3万円（中核プロモ・高需要SAR枠）
    case 'Saturday':  // 1万〜3万円（週末高需要コレクション枠）
      return {
        minLocal: Math.floor(11000 / exchangeRateJpy),
        maxLocal: Math.ceil(45000 / exchangeRateJpy),
        minSpreadJpy: 1000,
      };
    case 'Thursday': // 3万〜8万円（準高額鑑定・上位絶版枠）
      return {
        minLocal: Math.floor(32000 / exchangeRateJpy),
        maxLocal: Math.ceil(120000 / exchangeRateJpy),
        minSpreadJpy: 1000,
      };
    case 'Friday': // 8万円〜（資産性PSA10・絶版BOX枠）
      return {
        minLocal: Math.floor(85000 / exchangeRateJpy),
        maxLocal: undefined,
        minSpreadJpy: 1000,
      };
    default:
      return {
        minLocal: Math.floor(3500 / exchangeRateJpy),
        maxLocal: Math.ceil(45000 / exchangeRateJpy),
        minSpreadJpy: 1000,
      };
  }
}

/**
 * Apify API v2 同期実行ヘルパー
 */
async function runApifySync(
  rawId: string,
  token: string,
  bodyPayload: Record<string, any>,
  actorFallbackPayload?: Record<string, any>
): Promise<any[]> {
  const apiPathId = rawId.replace(/\//g, '~');

  const taskUrl = `https://api.apify.com/v2/actor-tasks/${apiPathId}/run-sync-get-dataset-items?token=${token}`;
  const taskRes = await fetch(taskUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
    cache: 'no-store',
  });

  if (taskRes.ok) {
    return await taskRes.json();
  }

  if (taskRes.status === 404) {
    const actorUrl = `https://api.apify.com/v2/acts/${apiPathId}/run-sync-get-dataset-items?token=${token}`;
    const actorRes = await fetch(actorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actorFallbackPayload || bodyPayload),
      cache: 'no-store',
    });

    if (actorRes.ok) {
      return await actorRes.json();
    }

    throw new Error(`Apify API Error (${rawId}): ${actorRes.status} ${actorRes.statusText}`);
  }

  throw new Error(`Apify Task API Error (${rawId}): ${taskRes.status} ${taskRes.statusText}`);
}

/**
 * eBayタイトルからトレカ型番を抽出する
 */
export function extractCardNumber(title: string): string | null {
  const slashMatch = title.match(/\b(\d{3}\/\d{3})\b/);
  if (slashMatch) return slashMatch[1];

  const promoMatch = title.match(/\b(\d{3}\/[A-Z0-9]+-P)\b/i);
  if (promoMatch) return promoMatch[1].toUpperCase();

  const hyphenMatch = title.match(/\b([A-Z]{2,4}\d{2}-\d{3})\b/i);
  if (hyphenMatch) return hyphenMatch[1].toUpperCase();

  return null;
}

/**
 * タイトルから状態グレードを推定（鑑定品・未開封のすり抜けを完全防止）
 */
function detectConditionGrade(title: string): string {
  const upper = title.toUpperCase();

  const psaMatch = upper.match(/\bPSA\s*(\d+(?:\.\d+)?)\b/);
  if (psaMatch) return `PSA ${psaMatch[1]}`;

  const bgsMatch = upper.match(/\bBGS\s*(\d+(?:\.\d+)?)\b/);
  if (bgsMatch) return `BGS ${bgsMatch[1]}`;

  const cgcMatch = upper.match(/\bCGC\s*(\d+(?:\.\d+)?)\b/);
  if (cgcMatch) return `CGC ${cgcMatch[1]}`;

  const arsMatch = upper.match(/\bARS\s*(\d+(?:\.\d+)?)\b/);
  if (arsMatch) return `ARS ${arsMatch[1]}`;

  if (/\b(PSA|BGS|CGC|ARS|ACE|GRADED|SLAB|GEM\s*MINT)\b/.test(upper)) {
    return 'Graded';
  }

  if (/\b(SEALED|BOOSTER\s*BOX|PACK)\b/.test(upper)) {
    return 'Sealed Box';
  }

  return 'Raw NM';
}

/**
 * ポケカジラURLの正規化（相対パス補完・404防止）
 */
function normalizePokecazillaUrl(rawUrl: string | undefined, fallbackSearchUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallbackSearchUrl;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('https://pokecazilla.com/') || trimmed.startsWith('http://pokecazilla.com/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://pokecazilla.com${trimmed}`;
  }
  return fallbackSearchUrl;
}

/**
 * eBay URLの正規化（対象地域に合わせて ebay.com / ebay.de に統一）
 */
function normalizeEbayUrl(
  rawUrl: string | undefined,
  cardNumber: string,
  region: 'us' | 'eu',
  pokemonNameEn?: string
): string {
  const targetOrigin = region === 'eu' ? 'https://www.ebay.de' : 'https://www.ebay.com';
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
    return rawUrl
      .trim()
      .replace(/^https?:\/\/(www\.)?ebay\.(com|co\.uk|de|fr|it|es|ca|com\.au)/i, targetOrigin);
  }
  const kw = [pokemonNameEn, cardNumber, 'Japanese Pokemon'].filter(Boolean).join(' ');
  return `${targetOrigin}/sch/i.html?_nkw=${encodeURIComponent(kw)}&LH_Sold=1&LH_Complete=1`;
}

/**
 * Apify 2段階スクレイピングを実行し、「ポケモン名 ＋ 型番」一致・状態◎最安値の実売サヤ取り候補を返す
 */
export async function fetchRealArbitrageCandidates(
  category: string = 'pokemon',
  exchangeRateJpy: number = 155,
  targetDay: string = 'Thursday',
  region: 'us' | 'eu' = 'us'
): Promise<VerifiedArbitrageCandidate[]> {
  if (!APIFY_TOKEN) {
    console.warn('[Apify] APIFY_API_TOKEN が未設定のため、実データ取得をスキップします');
    return [];
  }

  try {
    const isEu = region === 'eu';
    const targetEbaySite = isEu ? 'ebay.de' : 'ebay.com';
    const expectedCurrency: 'USD' | 'EUR' = isEu ? 'EUR' : 'USD';
    const priceRange = getLocalPriceRangeForDay(targetDay, exchangeRateJpy);

    const defaultEbayKeyword =
      category === 'onepiece'
        ? 'Japanese One Piece Card'
        : category === 'yugioh'
        ? 'Japanese Yugioh Card'
        : 'Japanese Pokemon Card';

    const ebayTaskPayload: Record<string, any> = {
      ebaySite: targetEbaySite,
      minPrice: priceRange.minLocal,
    };
    if (priceRange.maxLocal !== undefined) {
      ebayTaskPayload.maxPrice = priceRange.maxLocal;
    }

    // 1. eBay Sold Listings を地域サイト＆曜日価格帯指定で同期実行
    const ebayItems = await runApifySync(
      EBAY_TASK_ID,
      APIFY_TOKEN,
      ebayTaskPayload,
      {
        keywords: [defaultEbayKeyword],
        count: 50,
        ...ebayTaskPayload,
      }
    );

    // 2. 対象通貨（USならUSD / EUならEUR）かつ「ポケモン名＋型番」が特定できた成約のみ抽出
    const parsedEbay = ebayItems
      .map((item) => {
        const rawCurrency = String(item.currency ?? item.soldCurrency ?? '').toUpperCase().trim();
        const rawPriceStr = String(item.soldPrice ?? item.price ?? '');
        const rawUrl = String(item.url || item.itemUrl || '');

        const isCurrencyMismatch =
          (rawCurrency !== '' && rawCurrency !== expectedCurrency) ||
          rawPriceStr.includes('£') ||
          (!isEu && (rawPriceStr.includes('€') || /ebay\.(co\.uk|de|fr|it|es)/i.test(rawUrl))) ||
          (isEu && (rawPriceStr.includes('$') || /ebay\.(com|co\.uk|ca|com\.au)(\/|$)/i.test(rawUrl)));

        const soldLocal = isCurrencyMismatch ? 0 : Number(item.soldPrice ?? item.price ?? 0) || 0;
        const title = String(item.title || '');
        const cardNumber = extractCardNumber(title);
        const pokemonNameJa = extractPokemonNameJa(title);

        return {
          title,
          soldLocal,
          soldJpy: Math.round(soldLocal * exchangeRateJpy),
          cardNumber,
          pokemonNameJa,
          conditionGrade: detectConditionGrade(title),
          ebayUrl: rawUrl,
        };
      })
      .filter((item) => {
        if (item.cardNumber === null || item.pokemonNameJa === null) return false;
        if (item.soldLocal <= 0 || item.soldLocal < priceRange.minLocal) return false;
        if (priceRange.maxLocal !== undefined && item.soldLocal > priceRange.maxLocal) return false;
        return true;
      });

    if (parsedEbay.length === 0) return [];

    // 同じ「ポケモン名 ＋ 型番 ＋ グレード」が複数成約している場合は平均成約額と成約件数を集計
    const groupedByKey = new Map<
      string,
      {
        cardNumber: string;
        pokemonNameJa: string;
        conditionGrade: string;
        totalLocal: number;
        count: number;
        ebayUrl: string;
      }
    >();

    for (const item of parsedEbay) {
      const key = `${item.pokemonNameJa}_${item.cardNumber}_${item.conditionGrade}`;
      const existing = groupedByKey.get(key);
      if (existing) {
        existing.totalLocal += item.soldLocal;
        existing.count += 1;
      } else {
        groupedByKey.set(key, {
          cardNumber: item.cardNumber!,
          pokemonNameJa: item.pokemonNameJa!,
          conditionGrade: item.conditionGrade,
          totalLocal: item.soldLocal,
          count: 1,
          ebayUrl: item.ebayUrl,
        });
      }
    }

    // 3. ポケカジラ検索用の startUrls を「ポケモン名 ＋ 型番」で重複なし生成
    const categoryId = category === 'onepiece' ? 18 : 17;
    const domainPath = category === 'onepiece' ? 'onepiece' : 'pokemon';
    const uniqueQueries = Array.from(
      new Set(parsedEbay.map((i) => `${i.pokemonNameJa!} ${i.cardNumber!}`))
    );

    const startUrls = uniqueQueries.map((q) => ({
      url: `https://pokecazilla.com/${domainPath}/products/list?category_id=${categoryId}&name=${encodeURIComponent(q)}`,
    }));

    // 4. ポケカジラ検索タスクを一括実行（一覧 ➔ 個別ページへ自動遷移して状態◎最安値を取得）
    const jpResults = await runApifySync(POKECAZILLA_TASK_ID, APIFY_TOKEN, { startUrls });

    const jpCandidatesMap = new Map<
      string,
      Array<{ name: string; minPrice: number; shopName: string; detailUrl: string }>
    >();

    for (const row of jpResults) {
      if (!row || row['#error']) continue;

      const searchUrl = String(row.searchUrl || '');
      const numMatch = searchUrl.match(/name=([^&]+)/);
      const rawQuery = numMatch ? decodeURIComponent(numMatch[1]) : '';
      const queriedNum = extractCardNumber(rawQuery) || rawQuery;
      if (!queriedNum) continue;

      if (row.isDetailResult) {
        if (typeof row.mintMinPrice !== 'number' || row.mintMinPrice <= 0) {
          continue; // 状態◎の在庫がないカードはスキップ
        }
        const cardCode = String(row.cardCode || '');
        if (cardCode && !cardCode.includes(queriedNum)) continue;

        const list = jpCandidatesMap.get(queriedNum) || [];
        list.push({
          name: String(row.name || queriedNum),
          minPrice: Number(row.mintMinPrice),
          shopName: String(row.mintShopName || 'ポケカジラ状態◎最安'),
          detailUrl: normalizePokecazillaUrl(row.detailUrl, searchUrl),
        });
        jpCandidatesMap.set(queriedNum, list);
      }
    }

    // 5. 「ポケモン名 ＋ 型番」が両方一致するカードだけを突合
    const verifiedList: VerifiedArbitrageCandidate[] = [];

    for (const [, ebayGroup] of groupedByKey.entries()) {
      const jpCards = jpCandidatesMap.get(ebayGroup.cardNumber);
      if (!jpCards || jpCards.length === 0) continue;

      // 型番一致候補の中から、ポケカジラのカード名に同じポケモン名（日本語）を含むカードを取得
      const matchedJpCard = jpCards.find((c) => c.name.includes(ebayGroup.pokemonNameJa));
      if (!matchedJpCard) continue;

      const avgLocal = Math.round((ebayGroup.totalLocal / ebayGroup.count) * 100) / 100;
      const avgJpy = Math.round(avgLocal * exchangeRateJpy);
      const spreadJpy = avgJpy - matchedJpCard.minPrice;
      const roi = matchedJpCard.minPrice > 0 ? Math.round((spreadJpy / matchedJpCard.minPrice) * 100) : 0;

      if (spreadJpy >= priceRange.minSpreadJpy && roi >= 15) {
        verifiedList.push({
          cardName: matchedJpCard.name,
          cardNumber: ebayGroup.cardNumber,
          conditionGrade: ebayGroup.conditionGrade,
          jpBuyPriceJPY: matchedJpCard.minPrice,
          jpShopName: `状態◎最安 (${matchedJpCard.shopName})`,
          currency: expectedCurrency,
          ebaySoldForeign: avgLocal,
          ebaySoldJpy: avgJpy,
          netProceedsJpy: avgJpy,
          priceSpreadJPY: spreadJpy,
          spreadROI: roi,
          liquidity: `直近成約 ${ebayGroup.count}件`,
          pokecazillaUrl: matchedJpCard.detailUrl,
          ebayUrl: normalizeEbayUrl(ebayGroup.ebayUrl, ebayGroup.cardNumber, region),
        });
      }
    }

    return verifiedList.sort((a, b) => b.priceSpreadJPY - a.priceSpreadJPY);
  } catch (error) {
    console.error(`[Apify Arbitrage Fetch Error (${region})]:`, error);
    return [];
  }
}