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

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const EBAY_TASK_ID = process.env.APIFY_EBAY_TASK_ID || 'kempt_tapestry~ebay-sold-search';
const POKECAZILLA_TASK_ID = process.env.APIFY_POKECAZILLA_TASK_ID || 'kempt_tapestry~Pokemon-Price-Searcch';

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
 * タイトルから状態グレードを推定
 */
function detectConditionGrade(title: string): string {
  const upper = title.toUpperCase();
  if (upper.includes('PSA 10') || upper.includes('PSA10')) return 'PSA 10';
  if (upper.includes('PSA 9') || upper.includes('PSA9')) return 'PSA 9';
  if (upper.includes('BGS 10') || upper.includes('BGS10')) return 'BGS 10';
  if (upper.includes('BGS 9.5')) return 'BGS 9.5';
  if (upper.includes('CGC 10')) return 'CGC 10';
  if (upper.includes('ARS 10')) return 'ARS 10';
  if (upper.includes('SEALED') || upper.includes('BOX')) return 'Sealed Box';
  return 'Raw NM';
}

/**
 * Apify 2段階スクレイピングを実行し、実売データに基づくサヤ取り候補一覧を返す
 */
export async function fetchRealArbitrageCandidates(
  category: string = 'pokemon',
  usdToJpyRate: number = 155
): Promise<VerifiedArbitrageCandidate[]> {
  if (!APIFY_TOKEN) {
    console.warn('[Apify] APIFY_API_TOKEN が未設定のため、実データ取得をスキップします');
    return [];
  }

  try {
    // 1. eBay Sold Listings Search Task を同期実行
    const ebayRes = await fetch(
      `https://api.apify.com/v2/actor-tasks/${EBAY_TASK_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      }
    );

    if (!ebayRes.ok) {
      throw new Error(`eBay Task API Error: ${ebayRes.status} ${ebayRes.statusText}`);
    }

    const ebayItems: any[] = await ebayRes.json();

    // 2. $50以上 かつ 型番が抽出できた成約のみフィルタリング
    const parsedEbay = ebayItems
      .map((item) => {
        const soldUsd = Number(item.soldPrice) || 0;
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
      .filter((item) => item.soldUsd >= 50 && item.cardNumber !== null);

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

    // 4. Cheerio Scraper Task を一括実行して国内最安値を取得
    const jpRes = await fetch(
      `https://api.apify.com/v2/actor-tasks/${POKECAZILLA_TASK_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrls }),
        cache: 'no-store',
      }
    );

    if (!jpRes.ok) {
      throw new Error(`Pokecazilla Task API Error: ${jpRes.status} ${jpRes.statusText}`);
    }

    const jpPages: any[] = await jpRes.json();

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

      // 粗利 +1,000円以上 かつ ROI 15%以上のみ抽出
      if (spreadJpy >= 1000 && roi >= 15) {
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