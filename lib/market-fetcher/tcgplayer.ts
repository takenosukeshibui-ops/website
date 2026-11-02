// app/lib/market-fetcher/tcgplayer.ts

interface TcgPriceResult {
  cardName: string;
  marketPriceUSD: number;
  marketPriceJPY: number;
  directLowUSD: number | null;
  subType: string; // "Normal", "Holofoil", etc.
  url: string;
}

export async function fetchTcgplayerPrice(
  categoryId: number = 3, // ポケモンカード: 3
  cardSearchName: string
): Promise<TcgPriceResult | null> {
  try {
    // TCGcsv のカテゴリ別日次価格エンドポイント
    const res = await fetch(`https://tcgcsv.com/tcgplayer/${categoryId}/prices`, {
      next: { revalidate: 86400 }, // 1日キャッシュ
    });

    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results || [];

    // カード名でヒットするアイテムを検索
    const match = results.find((item: any) =>
      item.productName?.toLowerCase().includes(cardSearchName.toLowerCase())
    );

    if (!match || !match.marketPrice) return null;

    const rate = 155; // 為替レート (USD/JPY)
    return {
      cardName: match.productName,
      marketPriceUSD: match.marketPrice,
      marketPriceJPY: Math.round(match.marketPrice * rate),
      directLowUSD: match.directLowPrice || null,
      subType: match.subTypeName || 'Normal',
      url: `https://www.tcgplayer.com/product/${match.productId}`,
    };
  } catch (err) {
    console.error('TCGplayer fetch error:', err);
    return null;
  }
}