// lib/market-fetcher/apify-arbitrage.ts
import { extractAllPokemonNamesJa } from './pokemon-dictionary';

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
  minLocal?: number;
  maxLocal?: number;
  minSpreadJpy: number;
}

/**
 * 曜日（targetDay）の仕入れ目安レンジをそのまま eBay 検索用の現地通貨（USD / EUR）価格帯に換算する
 */
function getLocalPriceRangeForDay(targetDay: string, exchangeRateJpy: number): DayLocalPriceRange {
  switch (targetDay) {
    case 'Monday': // 〜3,000円
      return {
        minLocal: undefined,
        maxLocal: Math.round(3000 / exchangeRateJpy),
        minSpreadJpy: 500,
      };
    case 'Tuesday': // 3,000円〜10,000円
    case 'Sunday':  // 3,000円〜10,000円
      return {
        minLocal: Math.round(3001 / exchangeRateJpy),
        maxLocal: Math.round(10000 / exchangeRateJpy),
        minSpreadJpy: 800,
      };
    case 'Wednesday': // 10,000円〜30,000円
    case 'Saturday':  // 10,000円〜30,000円
      return {
        minLocal: Math.round(10001 / exchangeRateJpy),
        maxLocal: Math.round(30000 / exchangeRateJpy),
        minSpreadJpy: 2000,
      };
    case 'Thursday': // 30,000円〜80,000円
      return {
        minLocal: Math.round(30001 / exchangeRateJpy),
        maxLocal: Math.round(80000 / exchangeRateJpy),
        minSpreadJpy: 6000,
      };
    case 'Friday': // 80,000円〜
      return {
        minLocal: Math.round(80001 / exchangeRateJpy),
        maxLocal: undefined,
        minSpreadJpy: 8000,
      };
    default:
      console.warn(`[Apify] 不正な曜日指定です: ${targetDay}`);
      return {
        minLocal: 999999,
        maxLocal: 999999,
        minSpreadJpy: 999999,
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
 * eBayタイトルからトレカ型番をすべて抽出する
 */
export function extractAllCardNumbers(title: string, isGraded: boolean = false): string[] {
  const results = new Set<string>();

  // 2桁〜3桁の通常型番に対応（例: 096/071, 15/080, 025/165）
  const slashMatches = title.match(/\b\d{2,3}\/\d{2,3}\b/g);
  if (slashMatches) slashMatches.forEach((m) => results.add(m));

  // 1桁〜3桁のプロモ型番に対応（例: 001/SV-P, 28/SM-P, 77/XY-P）
  const promoMatches = title.match(/\b\d{1,3}\/[A-Z0-9]+-P\b/gi);
  if (promoMatches) promoMatches.forEach((m) => results.add(m.toUpperCase()));

  // ハイフン省略プロモ表記（例: #107PCGP -> 107/PCG-P）
  const compactPromoMatches = title.match(/#?(\d{1,3})(SV|S|SM|XY|BW|L|DP|PCG|ADV)P\b/gi);
  if (compactPromoMatches) {
    compactPromoMatches.forEach((m) => {
      const cleaned = m.replace(/^#/, '').toUpperCase();
      const match = cleaned.match(/^(\d{1,3})([A-Z]+)P$/);
      if (match) results.add(`${match[1]}/${match[2]}-P`);
    });
  }

  const hyphenMatches = title.match(/\b[A-Z]{2,4}\d{2}-\d{3}\b/gi);
  if (hyphenMatches) hyphenMatches.forEach((m) => results.add(m.toUpperCase()));
  return Array.from(results);
}

export function extractCardNumber(title: string): string | null {
  const all = extractAllCardNumbers(title, false);
  return all.length > 0 ? all[0] : null;
}

function isMultiCardSet(title: string, cardNumbers: string[]): boolean {
  const upper = title.toUpperCase();

  // 複数枚セット・まとめ売りを示すキーワード（単なるパック名末尾の "Clay Burst Set" 等は通す）
  const setPatterns = [
    /\bSET\s+OF\s+\d+\b/,
    /\b\d+\s*CARDS?\s*SET\b/,
    /\b(COMPLETE|FULL|ALL|MASTER|AR|CHR|SAR|SR|UR|CSR|EEVEE|EEVEELUTION)\s+SET\b/,
    /\b\d+\s*CARDS?\b/,
    /\b(LOT|BUNDLE|COMBO|PAIR|PLAYSET)\b/,
    /\b\d+\s*(PCS|PIECES|SHEETS)\b/,
    /\bX\s*[2-9]\b/,
    /\b[2-9]\s*X\b/,
    /\b([2-9]|10)\s*枚\b/,
    /セット/,
    /\bNO\.?\s*\d{3}\s+\d{3}\b/,
  ];

  if (setPatterns.some((pat) => pat.test(upper))) {
    return true;
  }

  // タイトル内に異なる型番が2つ以上含まれている場合（例: 037/040 & 044/040）
  if (cardNumbers.length >= 2) {
    return true;
  }

  return false;
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

    const ebayKeywords =
      category === 'onepiece'
        ? [
            'Japanese One Piece Card',
            'Japanese One Piece Promo',
            'Japanese One Piece PSA',
            'Japanese One Piece Manga',
            'Japanese One Piece Parallel',
            'Japanese One Piece Alt Art',
          ]
        : category === 'yugioh'
        ? [
            'Japanese Yugioh Card',
            'Japanese Yugioh Promo',
            'Japanese Yugioh PSA',
            'Japanese Yugioh 20th',
            'Japanese Yugioh 25th',
            'Japanese Yugioh Ultimate',
          ]
        : [
            'Japanese Pokemon Card',
            'Japanese Pokemon Promo',
            'Japanese Pokemon PSA',
            'Japanese Pokemon Old Back',
            'Japanese Pokemon Vintage',
            'Japanese Pokemon XY',
          ];

    const ebayTaskPayload: Record<string, any> = {
      ebaySite: targetEbaySite,
      keywords: ebayKeywords,
      count: 30,
      exactMatch: false,
    };
    if (priceRange.minLocal !== undefined) {
      ebayTaskPayload.minPrice = priceRange.minLocal;
    }
    if (priceRange.maxLocal !== undefined) {
      ebayTaskPayload.maxPrice = priceRange.maxLocal;
    }

    // 1. eBay Sold Listings を地域サイト＆曜日価格帯指定で同期実行
    const ebayItems = await runApifySync(
      EBAY_TASK_ID,
      APIFY_TOKEN,
      ebayTaskPayload
    );

    // 2. 対象通貨（USならUSD / EUならEUR）かつ「ポケモン名＋型番」が特定できた成約のみ抽出
    const parsedEbay = ebayItems
      .map((item) => {
        const rawCurrency = String(
          item.currency ?? item.soldCurrency ?? item.priceCurrency ?? ''
        )
          .toUpperCase()
          .trim();
        const rawPriceStr = String(item.soldPrice ?? item.price ?? '');
        const rawUrl = String(item.url || item.itemUrl || '');
        const itemPriceCorpus = `${rawCurrency} ${rawPriceStr} ${String(
          item.formattedPrice ?? item.priceText ?? ''
        )}`.toUpperCase();

        const isCurrencyMismatch =
          (rawCurrency !== '' && rawCurrency !== expectedCurrency) ||
          itemPriceCorpus.includes('£') ||
          /\bGBP\b/.test(itemPriceCorpus) ||
          (!isEu &&
            (itemPriceCorpus.includes('€') ||
              /\b(EUR|CAD|AUD|JPY|CHF|SGD|NZD|HKD|MXN|CNY|KRW)\b/.test(itemPriceCorpus) ||
              /\b(C|AU|NZ|HK|S)\s*\$/.test(itemPriceCorpus) ||
              /ebay\.(co\.uk|de|fr|it|es|ca|com\.au|com\.sg|com\.hk)/i.test(rawUrl))) ||
          (isEu &&
            (itemPriceCorpus.includes('$') ||
              /\b(USD|CAD|AUD|JPY|CHF|SGD|NZD|HKD|MXN|CNY|KRW)\b/.test(itemPriceCorpus) ||
              /ebay\.(com|co\.uk|ca|com\.au|com\.sg|com\.hk)(\/|$)/i.test(rawUrl)));

        const numericPrice =
          typeof item.soldPrice === 'number'
            ? item.soldPrice
            : typeof item.price === 'number'
            ? item.price
            : Number(rawPriceStr.replace(/[^\d.]/g, '')) || 0;

        const soldLocal = isCurrencyMismatch ? 0 : numericPrice;
        const title = String(item.title || '');
        const conditionGrade = detectConditionGrade(title);
        const isGraded = conditionGrade !== 'Raw NM' && conditionGrade !== 'Sealed Box';
        const allCardNumbers = extractAllCardNumbers(title, isGraded);
        const allPokemonNamesJa = extractAllPokemonNamesJa(title);
        const isSet = isMultiCardSet(title, allCardNumbers);
        return {
          title,
          soldLocal,
          soldJpy: Math.round(soldLocal * exchangeRateJpy),
          cardNumber: allCardNumbers[0] ?? null,
          pokemonNameJa: allPokemonNamesJa[0] ?? null,
          isSet,
          conditionGrade,
          ebayUrl: rawUrl,
        };
      })
      .filter((item) => {
        if (item.isSet) return false;
        if (item.cardNumber === null || item.pokemonNameJa === null) return false;
        if (item.soldLocal <= 0) return false;
        if (priceRange.minLocal !== undefined && item.soldLocal < priceRange.minLocal) return false;
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