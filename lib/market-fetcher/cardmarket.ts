// lib/market-fetcher/cardmarket.ts

export interface CardmarketPriceResult {
  cardName: string;
  trendPriceEUR: number;
  lowPriceEUR: number;
  avg30EUR: number;
  priceJpy: number;
  url: string;
}

// ユーロ対日本円の基準レート
const EUR_JPY_RATE = 165;

export async function fetchCardmarketPrice(
  cardSearchName: string,
  category: 'Pokemon' | 'OnePiece' | 'YuGiOh' = 'Pokemon'
): Promise<CardmarketPriceResult | null> {
  try {
    const cleanName = cardSearchName.replace(/\(.*?\)|（.*?）/g, '').trim();
    const encoded = encodeURIComponent(cleanName);

    // Pokemon TCG OpenAPI / Cardmarket スナップショットエンドポイント
    // （APIキー不要で Cardmarket の trendPrice, avg30, lowPrice を取得可能）
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${encoded}"&pageSize=1`, {
      next: { revalidate: 86400 }, // 1日キャッシュ
    });

    if (res.ok) {
      const data = await res.json();
      const card = data.data?.[0];
      const cmPrices = card?.cardmarket?.prices;

      if (cmPrices && (cmPrices.trendPrice || cmPrices.avg30 || cmPrices.lowPrice)) {
        const trend = parseFloat(cmPrices.trendPrice || cmPrices.avg30 || cmPrices.lowPrice || '0');
        const low = parseFloat(cmPrices.lowPrice || '0');
        const avg30 = parseFloat(cmPrices.avg30 || '0');

        return {
          cardName: card.name,
          trendPriceEUR: trend,
          lowPriceEUR: low,
          avg30EUR: avg30,
          priceJpy: Math.round(trend * EUR_JPY_RATE),
          url: card.cardmarket?.url || `https://www.cardmarket.com/en/${category}/Products/Singles?searchString=${encoded}`,
        };
      }
    }

    // フォールバック: Cardmarket公式検索URL
    return {
      cardName: cleanName,
      trendPriceEUR: 0,
      lowPriceEUR: 0,
      avg30EUR: 0,
      priceJpy: 0,
      url: `https://www.cardmarket.com/en/${category}/Products/Singles?searchString=${encoded}`,
    };
  } catch (error) {
    console.error(`[Cardmarket] Fetch error for ${cardSearchName}:`, error);
    return null;
  }
}