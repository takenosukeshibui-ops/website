// lib/market-fetcher/apify-arbitrage.ts

export interface VerifiedArbitrageCandidate {
  cardName: string;
  cardNumber: string;
  conditionGrade: string;
  jpBuyPriceJPY: number;
  ebaySoldUsd: number;
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

interface DayUsdPriceRange {
  minUsd: number;
  maxUsd?: number;
  minSpreadJpy: number;
}

/**
 * 曜日（targetDay）の価格帯ラベルに合わせて eBay 検索用の USD 価格帯を算出する
 */
function getUsdPriceRangeForDay(targetDay: string, usdToJpyRate: number): DayUsdPriceRange {
  switch (targetDay) {
    case 'Monday': // 〜3千円（エントリー・超高回転枠）
      return {
        minUsd: Math.max(8, Math.floor(1500 / usdToJpyRate)),
        maxUsd: Math.ceil(6000 / usdToJpyRate),
        minSpreadJpy: 500,
      };
    case 'Tuesday': // 3千〜1万円（定番コレクション枠）
    case 'Sunday':  // 3千〜1万円（週明け即売れ回転枠）
      return {
        minUsd: Math.floor(3500 / usdToJpyRate),
        maxUsd: Math.ceil(16000 / usdToJpyRate),
        minSpreadJpy: 1000,
      };
    case 'Wednesday': // 1万〜3万円（中核プロモ・高需要SAR枠）
    case 'Saturday':  // 1万〜3万円（週末高需要コレクション枠）
      return {
        minUsd: Math.floor(11000 / usdToJpyRate),
        maxUsd: Math.ceil(45000 / usdToJpyRate),
        minSpreadJpy: 1000,
      };
    case 'Thursday': // 3万〜8万円（準高額鑑定・上位絶版枠）
      return {
        minUsd: Math.floor(32000 / usdToJpyRate),
        maxUsd: Math.ceil(120000 / usdToJpyRate),
        minSpreadJpy: 1000,
      };
    case 'Friday': // 8万円〜（資産性PSA10・絶版BOX枠）
      return {
        minUsd: Math.floor(85000 / usdToJpyRate),
        maxUsd: undefined,
        minSpreadJpy: 1000,
      };
    default:
      return {
        minUsd: Math.floor(3500 / usdToJpyRate),
        maxUsd: Math.ceil(45000 / usdToJpyRate),
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
 * タイトルからレアリティ・特殊仕様を抽出（同型番のノーマル誤爆を防止）
 */
function extractRaritySpec(title: string): string | null {
  const upper = title.toUpperCase();
  if (upper.includes('MASTER BALL') || upper.includes('MASTERBALL')) return 'マスターボール';
  if (upper.includes('POKE BALL') || upper.includes('POKEBALL')) return 'モンスターボール';
  if (/\bSAR\b/.test(upper)) return 'SAR';
  if (/\bMUR\b/.test(upper)) return 'MUR';
  if (/\bBWR\b/.test(upper)) return 'BWR';
  if (/\bCSR\b/.test(upper)) return 'CSR';
  if (/\bCHR\b/.test(upper)) return 'CHR';
  if (/\bSSR\b/.test(upper)) return 'SSR';
  if (/\bSR\b/.test(upper)) return 'SR';
  if (/\bUR\b/.test(upper)) return 'UR';
  if (/\bHR\b/.test(upper)) return 'HR';
  if (/\bAR\b/.test(upper)) return 'AR';
  if (/\bACE\b/.test(upper)) return 'ACE';
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
 * eBay URLの正規化（実在URL保持・フォールバック検索URL生成）
 */
function normalizeEbayUrl(rawUrl: string | undefined, cardNumber: string): string {
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
    return rawUrl.trim();
  }
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${cardNumber} Japanese Pokemon`)}&LH_Sold=1&LH_Complete=1`;
}

/**
 * Apify 2段階スクレイピングを実行し、曜日別価格帯・レアリティ一致の実売サヤ取り候補を返す
 */
export async function fetchRealArbitrageCandidates(
  category: string = 'pokemon',
  usdToJpyRate: number = 155,
  targetDay: string = 'Thursday'
): Promise<VerifiedArbitrageCandidate[]> {
  if (!APIFY_TOKEN) {
    console.warn('[Apify] APIFY_API_TOKEN が未設定のため、実データ取得をスキップします');
    return [];
  }

  try {
    const priceRange = getUsdPriceRangeForDay(targetDay, usdToJpyRate);

    const defaultEbayKeyword =
      category === 'onepiece'
        ? 'Japanese One Piece Card'
        : category === 'yugioh'
        ? 'Japanese Yugioh Card'
        : 'Japanese Pokemon Card';

    const ebayPriceFilter: Record<string, any> = {
      minPrice: priceRange.minUsd,
    };
    if (priceRange.maxUsd !== undefined) {
      ebayPriceFilter.maxPrice = priceRange.maxUsd;
    }

    // 1. eBay Sold Listings を曜日価格帯指定で同期実行
    const ebayItems = await runApifySync(
      EBAY_TASK_ID,
      APIFY_TOKEN,
      ebayPriceFilter,
      {
        keywords: [defaultEbayKeyword],
        maxItems: 50,
        ...ebayPriceFilter,
      }
    );

    // 2. 指定価格帯内 かつ 型番が抽出できた成約のみフィルタリング
    const parsedEbay = ebayItems
      .map((item) => {
        const soldUsd = Number(item.soldPrice ?? item.price ?? 0) || 0;
        const title = String(item.title || '');
        const cardNumber = extractCardNumber(title);
        return {
          title,
          soldUsd,
          soldJpy: Math.round(soldUsd * usdToJpyRate),
          cardNumber,
          raritySpec: extractRaritySpec(title),
          conditionGrade: detectConditionGrade(title),
          ebayUrl: String(item.url || item.itemUrl || ''),
        };
      })
      .filter((item) => {
        if (item.cardNumber === null) return false;
        if (item.soldUsd < priceRange.minUsd) return false;
        if (priceRange.maxUsd !== undefined && item.soldUsd > priceRange.maxUsd) return false;
        return true;
      });

    if (parsedEbay.length === 0) return [];

    // 同じ型番・レアリティ・グレードが複数成約している場合は平均成約額と成約件数を集計
    const groupedByKey = new Map<
      string,
      {
        cardNumber: string;
        raritySpec: string | null;
        sampleTitle: string;
        conditionGrade: string;
        totalUsd: number;
        count: number;
        ebayUrl: string;
      }
    >();

    for (const item of parsedEbay) {
      const key = `${item.cardNumber}_${item.raritySpec || 'NONE'}_${item.conditionGrade}`;
      const existing = groupedByKey.get(key);
      if (existing) {
        existing.totalUsd += item.soldUsd;
        existing.count += 1;
      } else {
        groupedByKey.set(key, {
          cardNumber: item.cardNumber!,
          raritySpec: item.raritySpec,
          sampleTitle: item.title,
          conditionGrade: item.conditionGrade,
          totalUsd: item.soldUsd,
          count: 1,
          ebayUrl: item.ebayUrl,
        });
      }
    }

    // 3. ポケカジラ検索用の startUrls を重複なしで生成
    const categoryId = category === 'onepiece' ? 18 : 17;
    const domainPath = category === 'onepiece' ? 'onepiece' : 'pokemon';
    const uniqueNumbers = Array.from(new Set(parsedEbay.map((i) => i.cardNumber!)));

    const startUrls = uniqueNumbers.map((num) => ({
      url: `https://pokecazilla.com/${domainPath}/products/list?category_id=${categoryId}&name=${encodeURIComponent(num)}`,
    }));

    // 4. ポケカジラ検索タスクを一括実行して国内最安値を取得
    const jpPages = await runApifySync(POKECAZILLA_TASK_ID, APIFY_TOKEN, { startUrls });

    // 型番ごとに候補カード一覧を保持（後段でレアリティ一致チェックを行う）
    const jpCandidatesMap = new Map<
      string,
      {
        searchUrl: string;
        cards: Array<{ name: string; minPrice: number; detailUrl: string }>;
      }
    >();

    for (const page of jpPages) {
      const searchUrl = String(page.searchUrl || '');
      const numMatch = searchUrl.match(/name=([^&]+)/);
      const queriedNum = numMatch ? decodeURIComponent(numMatch[1]) : '';
      if (!queriedNum || !Array.isArray(page.cards)) continue;

      const exactCards = page.cards
        .filter(
          (c: any) =>
            typeof c.minPrice === 'number' &&
            c.minPrice > 0 &&
            String(c.cardCode || '').includes(queriedNum)
        )
        .map((c: any) => ({
          name: String(c.name || queriedNum),
          minPrice: Number(c.minPrice),
          detailUrl: normalizePokecazillaUrl(c.detailUrl, searchUrl),
        }));

      if (exactCards.length > 0) {
        jpCandidatesMap.set(queriedNum, { searchUrl, cards: exactCards });
      }
    }

    // 5. eBay成約と国内最安値を「型番＋レアリティ一致」で突合
    const verifiedList: VerifiedArbitrageCandidate[] = [];

    for (const [, ebayGroup] of groupedByKey.entries()) {
      const jpEntry = jpCandidatesMap.get(ebayGroup.cardNumber);
      if (!jpEntry) continue;

      // eBay側にレアリティ指定がある場合は、ポケカジラ側カード名にも同じレアリティを含むものに限定
      let matchedJpCard = jpEntry.cards[0];
      if (ebayGroup.raritySpec) {
        const specMatched = jpEntry.cards.find((c) =>
          c.name.toUpperCase().includes(ebayGroup.raritySpec!)
        );
        if (!specMatched) continue; // レアリティ不一致（例: SAR vs ノーマル）は誤爆防止のため除外
        matchedJpCard = specMatched;
      }

      const avgUsd = Math.round((ebayGroup.totalUsd / ebayGroup.count) * 100) / 100;
      const avgJpy = Math.round(avgUsd * usdToJpyRate);
      const spreadJpy = avgJpy - matchedJpCard.minPrice;
      const roi = matchedJpCard.minPrice > 0 ? Math.round((spreadJpy / matchedJpCard.minPrice) * 100) : 0;

      if (spreadJpy >= priceRange.minSpreadJpy && roi >= 15) {
        verifiedList.push({
          cardName: matchedJpCard.name,
          cardNumber: ebayGroup.cardNumber,
          conditionGrade: ebayGroup.conditionGrade,
          jpBuyPriceJPY: matchedJpCard.minPrice,
          ebaySoldUsd: avgUsd,
          ebaySoldJpy: avgJpy,
          netProceedsJpy: avgJpy,
          priceSpreadJPY: spreadJpy,
          spreadROI: roi,
          liquidity: `直近成約 ${ebayGroup.count}件`,
          pokecazillaUrl: matchedJpCard.detailUrl,
          ebayUrl: normalizeEbayUrl(ebayGroup.ebayUrl, ebayGroup.cardNumber),
        });
      }
    }

    return verifiedList.sort((a, b) => b.priceSpreadJPY - a.priceSpreadJPY);
  } catch (error) {
    console.error('[Apify Arbitrage Fetch Error]:', error);
    return [];
  }
}