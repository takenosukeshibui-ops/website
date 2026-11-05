// lib/market-fetcher/google-search.ts

/**
 * 指定したカードショップのGoogle検索1位のURLを取得
 * ※見つからない場合やAPI未設定時は、安全なショップ内検索URLへ自動フォールバック
 */
export async function getTopShopUrlByGoogle(
  cardName: string,
  targetShop: 'cardrush' | 'hareruya2' | 'torecacamp' = 'cardrush'
): Promise<string> {
  const cleanName = cardName.replace(/\s*[\(（].*?[\)）]/g, '').trim();
  const encodedName = encodeURIComponent(cleanName);

  // フォールバック用の各社検索URL
  const fallbackUrls: Record<string, string> = {
    cardrush: `https://www.cardrush-pokemon.jp/product-list?keyword=${encodedName}`,
    hareruya2: `https://www.hareruya2.com/product-list?keyword=${encodedName}`,
    torecacamp: `https://torecacamp-pokemon.com/search?q=${encodedName}`,
  };

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GEMINI_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  // APIキー未設定時は直行検索URLを返却
  if (!apiKey || !cx) {
    return fallbackUrls[targetShop];
  }

  // Google検索コマンド（site:）で個別商品ページに絞り込み
  const siteQueries: Record<string, string> = {
    cardrush: `site:cardrush-pokemon.jp/product/ ${cleanName}`,
    hareruya2: `site:hareruya2.com/products/ ${cleanName}`,
    torecacamp: `site:torecacamp-pokemon.com/products/ ${cleanName}`,
  };

  const query = siteQueries[targetShop] || siteQueries.cardrush;

  try {
    const endpoint = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=1`;
    const res = await fetch(endpoint, { next: { revalidate: 86400 } }); // 24時間キャッシュ

    if (!res.ok) {
      console.warn(`[GoogleSearch] APIエラー (${res.status}): フォールバックURLを使用します`);
      return fallbackUrls[targetShop];
    }

    const data = await res.json();
    const firstResult = data.items?.[0]?.link;

    // 1位の個別ページURLが存在すれば採用、なければ検索URL
    return firstResult || fallbackUrls[targetShop];
  } catch (err) {
    console.warn(`[GoogleSearch] 通信エラー:`, err);
    return fallbackUrls[targetShop];
  }
}