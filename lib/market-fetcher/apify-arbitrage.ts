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
        maxUsd: undefined, // 上限なし
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
 * - Task (/v2/actor-tasks/) と Actor (/v2/acts/) の両方に自動対応
 * - URLパス仕様に合わせてリクエストURL生成時のみ '/' を '~' に安全エンコード
 */
async function runApifySync(
  rawId: string,
  token: string,
  bodyPayload: Record<string, any>,
  actorFallbackPayload?: Record<string, any>
): Promise<any[]> {
  const apiPathId = rawId.replace(/\//g, '~');

  // 1. まず Task エンドポイントとして実行を試行
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

  // 2. Task で 404 の場合、ストア公開 Actor (/v2/acts/) としてフォールバック実行
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
 * 対応形式: 071/063, 018/017, 276/XY-P, OP05-119 など
 */
export function extractCardNumber(title: string): string | null {
  // ポケカ標準型番 (例: 071/063, 018/017)
  const slashMatch = title.match(/\b(\d{3}\/\d{3})\b/);
  if (slashMatch) return slashMatch[1];

  // ポケカプロモ型番 (例: 276/XY-P, 001/SV-P)
  const promoMatch = title.match(/\b(\d{3}\/[A-Z0-9]+-P)\b/i);
  if (promoMatch) return promoMatch[1].toUpperCase();

  // ワンピース/遊戯王型番 (例: OP05-119, ST01-001)
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
 * Apify 2段階スクレイピングを実行し、曜日別価格帯に絞った実売サヤ取り候補一覧を返す
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

    // eBay 検索時の価格帯フィルタを構築（曜日ごとの価格帯のみをスクレイピング）
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

    // 同じ型番・グレードが複数成約している場合は平均成約額と成約件数を集計
    const groupedByNumber = new Map<
      string,
      {
        sampleTitle: string;
        conditionGrade: string;
        totalUsd: number;
        count: number;
        ebayUrl: string;
      }
    >();

    for (const item of parsedEbay) {
      const key = `${item.cardNumber}_${item.conditionGrade}`;
      const existing = groupedByNumber.get(key);
      if (existing) {
        existing.totalUsd += item.soldUsd;
        existing.count += 1;
      } else {
        groupedByNumber.set(key, {
          sampleTitle: item.title,
          conditionGrade: item.conditionGrade,
          totalUsd: item.soldUsd,
          count: 1,
          ebayUrl: item.ebayUrl,
        });
      }
    }

    // 3. ポケカジラ検索用の startUrls を重複なしで生成
    const categoryId = category === 'onepiece' ? 18 : 17; // 17: ポケカ
    const domainPath = category === 'onepiece' ? 'onepiece' : 'pokemon';
    const uniqueNumbers = Array.from(new Set(parsedEbay.map((i) => i.cardNumber!)));

    const startUrls = uniqueNumbers.map((num) => ({
      url: `https://pokecazilla.com/${domainPath}/products/list?category_id=${categoryId}&name=${encodeURIComponent(num)}`,
    }));

    // 4. ポケカジラ検索タスクを一括実行して国内最安値を取得
    const jpPages = await runApifySync(POKECAZILLA_TASK_ID, APIFY_TOKEN, { startUrls });

    // 型番ごとに「型番がカードコードに完全一致する」国内最安値レコードをマッピング
    const jpMap = new Map<string, { name: string; minPrice: number; detailUrl: string }>();

    for (const page of jpPages) {
      const searchUrl = String(page.searchUrl || '');
      const numMatch = searchUrl.match(/name=([^&]+)/);
      const queriedNum = numMatch ? decodeURIComponent(numMatch[1]) : '';
      if (!queriedNum || !Array.isArray(page.cards)) continue;

      // 型番文字列（例: 018/017）を cardCode に含むカードだけに限定（同名別弾カードを排除）
      const exactMatches = page.cards.filter(
        (c: any) =>
          typeof c.minPrice === 'number' &&
          c.minPrice > 0 &&
          String(c.cardCode || '').includes(queriedNum)
      );

      if (exactMatches.length > 0) {
        const best = exactMatches[0];
        jpMap.set(queriedNum, {
          name: best.name || queriedNum,
          minPrice: best.minPrice,
          detailUrl: best.detailUrl || searchUrl,
        });
      }
    }

    // 5. eBay成約と国内最安値を突合し、単純差額方式で利益を計算（Gate 1 検算と100%一致させる）
    const verifiedList: VerifiedArbitrageCandidate[] = [];

    for (const [key, ebayGroup] of groupedByNumber.entries()) {
      const cardNumber = key.split('_')[0];
      const jpData = jpMap.get(cardNumber);
      if (!jpData) continue;

      const avgUsd = Math.round((ebayGroup.totalUsd / ebayGroup.count) * 100) / 100;
      const avgJpy = Math.round(avgUsd * usdToJpyRate);
      const spreadJpy = avgJpy - jpData.minPrice;
      const roi = jpData.minPrice > 0 ? Math.round((spreadJpy / jpData.minPrice) * 100) : 0;

      // 曜日別最低粗利 かつ ROI 15%以上のみ抽出
      if (spreadJpy >= priceRange.minSpreadJpy && roi >= 15) {
        verifiedList.push({
          cardName: jpData.name,
          cardNumber,
          conditionGrade: ebayGroup.conditionGrade,
          jpBuyPriceJPY: jpData.minPrice,
          ebaySoldUsd: avgUsd,
          ebaySoldJpy: avgJpy,
          netProceedsJpy: avgJpy,
          priceSpreadJPY: spreadJpy,
          spreadROI: roi,
          liquidity: `直近成約 ${ebayGroup.count}件`,
          pokecazillaUrl: jpData.detailUrl,
          ebayUrl: ebayGroup.ebayUrl,
        });
      }
    }

    return verifiedList.sort((a, b) => b.priceSpreadJPY - a.priceSpreadJPY);
  } catch (error) {
    console.error('[Apify Arbitrage Fetch Error]:', error);
    return [];
  }
}