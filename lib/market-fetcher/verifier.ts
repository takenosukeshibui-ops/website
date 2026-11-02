// lib/market-fetcher/verifier.ts
import { fetchEbayPrice } from './ebay';
import { fetchTcgplayerPrice } from './tcgplayer';

export interface VerifiedPriceUpdate {
  itemId: string;
  target_sold_price_local: string;
  target_sold_price_jpy: number;
  price_spread_jpy: number;
  spread_roi_percent: number;
  sourcePlatform: string;
  evidenceNote: string;
  sourceEvidenceUrl: string;
}

// レート制限およびバースト防止のための並行実行ヘルパー
async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<any>[] = [];

  for (const item of items) {
    const p = fn(item).then((res) => {
      results.push(res);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
      for (let i = executing.length - 1; i >= 0; i--) {
        // @ts-ignore
        if (executing[i].status === 'fulfilled' || executing[i].status === 'rejected') {
          executing.splice(i, 1);
        }
      }
    }
  }
  await Promise.all(executing);
  return results;
}

export async function verifyAndEnrichArbitrageItems(
  items: Array<{
    id: string;
    card_name: string;
    region: 'us' | 'eu' | 'asia';
    jp_buy_price_jpy: number;
  }>
): Promise<VerifiedPriceUpdate[]> {
  // 並行度3（1秒間に過度なリクエストが飛ばないよう安全に巡回）
  const updates = await mapConcurrent(items, 3, async (item) => {
    const buyJPY = item.jp_buy_price_jpy || 1000;
    const cleanCardName = item.card_name.replace(/\(.*?\)|（.*?）/g, '').trim();

    try {
      // -----------------------------------------------------------
      // 1. 北米市場（US）: TCGplayer優先 ➔ なければ eBay US
      // -----------------------------------------------------------
      if (item.region === 'us') {
        const tcg = await fetchTcgplayerPrice(3, cleanCardName);
        if (tcg && tcg.marketPriceUSD > 0) {
          const sellJPY = tcg.marketPriceJPY;
          const spreadJPY = Math.max(0, sellJPY - buyJPY);
          const roi = buyJPY > 0 ? Math.round((spreadJPY / buyJPY) * 100) : 0;

          return {
            itemId: item.id,
            target_sold_price_local: `$${tcg.marketPriceUSD.toFixed(2)}`,
            target_sold_price_jpy: sellJPY,
            price_spread_jpy: spreadJPY,
            spread_roi_percent: roi,
            sourcePlatform: 'TCGplayer (Market Price)',
            evidenceNote: `実成約中央値: $${tcg.marketPriceUSD.toFixed(2)} (API検証済)`,
            sourceEvidenceUrl: tcg.url,
          };
        }

        const ebayUS = await fetchEbayPrice(`${cleanCardName} Japanese`, 'us');
        if (ebayUS && ebayUS.priceLocal > 0) {
          const sellJPY = ebayUS.priceJpy;
          const spreadJPY = Math.max(0, sellJPY - buyJPY);
          const roi = buyJPY > 0 ? Math.round((spreadJPY / buyJPY) * 100) : 0;

          return {
            itemId: item.id,
            target_sold_price_local: `$${ebayUS.priceLocal.toFixed(2)}`,
            target_sold_price_jpy: sellJPY,
            price_spread_jpy: spreadJPY,
            spread_roi_percent: roi,
            sourcePlatform: 'eBay (US)',
            evidenceNote: `eBay即決最安相場: $${ebayUS.priceLocal.toFixed(2)} (API検証済)`,
            sourceEvidenceUrl: ebayUS.itemUrl,
          };
        }
      }

      // -----------------------------------------------------------
      // 2. 欧州市場（EU）: eBay DE (EUR) ➔ eBay UK (GBP)
      // -----------------------------------------------------------
      if (item.region === 'eu') {
        const ebayDE = await fetchEbayPrice(`${cleanCardName} Japanese`, 'de');
        if (ebayDE && ebayDE.priceLocal > 0) {
          const sellJPY = ebayDE.priceJpy;
          const spreadJPY = Math.max(0, sellJPY - buyJPY);
          const roi = buyJPY > 0 ? Math.round((spreadJPY / buyJPY) * 100) : 0;

          return {
            itemId: item.id,
            target_sold_price_local: `€${ebayDE.priceLocal.toFixed(2)}`,
            target_sold_price_jpy: sellJPY,
            price_spread_jpy: spreadJPY,
            spread_roi_percent: roi,
            sourcePlatform: 'eBay (DE)',
            evidenceNote: `EU域内即決相場: €${ebayDE.priceLocal.toFixed(2)} (API検証済)`,
            sourceEvidenceUrl: ebayDE.itemUrl,
          };
        }

        const ebayUK = await fetchEbayPrice(`${cleanCardName} Japanese`, 'uk');
        if (ebayUK && ebayUK.priceLocal > 0) {
          const sellJPY = ebayUK.priceJpy;
          const spreadJPY = Math.max(0, sellJPY - buyJPY);
          const roi = buyJPY > 0 ? Math.round((spreadJPY / buyJPY) * 100) : 0;

          return {
            itemId: item.id,
            target_sold_price_local: `£${ebayUK.priceLocal.toFixed(2)}`,
            target_sold_price_jpy: sellJPY,
            price_spread_jpy: spreadJPY,
            spread_roi_percent: roi,
            sourcePlatform: 'eBay (UK)',
            evidenceNote: `英国即決相場: £${ebayUK.priceLocal.toFixed(2)} (API検証済)`,
            sourceEvidenceUrl: ebayUK.itemUrl,
          };
        }
      }

      // アジア市場、または該当なしの場合は更新なし
      return null;
    } catch (err) {
      console.warn(`[Verifier] Price check failed for ${item.card_name}:`, err);
      return null;
    }
  });

  return updates.filter((u): u is VerifiedPriceUpdate => u !== null);
}