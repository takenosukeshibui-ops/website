// app/lib/market-fetcher/ebay.ts

interface EbayPriceResult {
  platform: 'ebay_us' | 'ebay_uk' | 'ebay_de';
  currency: string;
  priceLocal: number;
  priceJpy: number;
  itemUrl: string;
  condition: string;
  title: string;
}

// マーケットプレイスIDと通貨マッピング
const MARKETPLACE_CONFIG = {
  us: { id: 'EBAY_US', currency: 'USD', platform: 'ebay_us' as const, rate: 155 },
  uk: { id: 'EBAY_GB', currency: 'GBP', platform: 'ebay_uk' as const, rate: 195 },
  de: { id: 'EBAY_DE', currency: 'EUR', platform: 'ebay_de' as const, rate: 165 },
};

async function getEbayAppToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('eBay APIクレデンシャルが設定されていません');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    next: { revalidate: 7000 },
  });

  const data = await res.json();
  return data.access_token;
}

export async function fetchEbayPrice(
  query: string,
  targetRegion: 'us' | 'uk' | 'de'
): Promise<EbayPriceResult | null> {
  try {
    const token = await getEbayAppToken();
    const config = MARKETPLACE_CONFIG[targetRegion];

    const encodedQuery = encodeURIComponent(query);
    // 固定価格 (即決) かつ美品/鑑定品をフィルタ
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodedQuery}&limit=5&filter=buyingOptions:{FIXED_PRICE}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': config.id,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const items = data.itemSummaries;
    if (!items || items.length === 0) return null;

    // 最安値・基準値を抽出
    const first = items[0];
    const priceVal = parseFloat(first.price.value);

    return {
      platform: config.platform,
      currency: config.currency,
      priceLocal: priceVal,
      priceJpy: Math.round(priceVal * config.rate),
      itemUrl: first.itemWebUrl,
      condition: first.condition || 'Raw NM',
      title: first.title,
    };
  } catch (error) {
    console.error(`eBay fetch error (${targetRegion}):`, error);
    return null;
  }
}