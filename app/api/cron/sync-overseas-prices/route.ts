// app/api/cron/sync-overseas-prices/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchEbayPrice } from '@/lib/market-fetcher/ebay';
import { fetchTcgplayerPrice } from '@/lib/market-fetcher/tcgplayer';

// 同期対象の主要シード銘柄（スロット代表カード）
const SEED_CARDS = [
  { name: 'ナンジャモ SAR', category: 'pokemon', query: 'Iono SAR Japanese' },
  { name: 'リザードンex SAR', category: 'pokemon', query: 'Charizard ex SAR Japanese 151' },
  { name: 'ピカチュウ AR', category: 'pokemon', query: 'Pikachu AR Japanese 151' },
  { name: 'ブラッキーVMAX SA', category: 'pokemon', query: 'Umbreon VMAX HR SA Japanese' },
  { name: 'ゲンガー 通信進化', category: 'pokemon', query: 'Gengar Vending Masaki Japanese' },
];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const recordsToInsert: any[] = [];

    for (const seed of SEED_CARDS) {
      // 1. eBay US (北米)
      const ebayUS = await fetchEbayPrice(seed.query, 'us');
      if (ebayUS) {
        recordsToInsert.push({
          category: seed.category,
          card_name: seed.name,
          region: 'us',
          platform: 'ebay_us',
          condition_grade: ebayUS.condition,
          sold_price_local: ebayUS.priceLocal,
          currency: ebayUS.currency,
          sold_price_jpy: ebayUS.priceJpy,
          volume_indicator: '直近出品・成約相場',
          source_evidence_url: ebayUS.itemUrl,
        });
      }

      // 2. eBay UK / DE (欧州)
      const ebayUK = await fetchEbayPrice(seed.query, 'uk');
      if (ebayUK) {
        recordsToInsert.push({
          category: seed.category,
          card_name: seed.name,
          region: 'eu',
          platform: 'ebay_uk',
          condition_grade: ebayUK.condition,
          sold_price_local: ebayUK.priceLocal,
          currency: ebayUK.currency,
          sold_price_jpy: ebayUK.priceJpy,
          volume_indicator: '直近出品・成約相場',
          source_evidence_url: ebayUK.itemUrl,
        });
      }

      // 3. TCGplayer (北米)
      const tcg = await fetchTcgplayerPrice(3, seed.name);
      if (tcg) {
        recordsToInsert.push({
          category: seed.category,
          card_name: seed.name,
          region: 'us',
          platform: 'tcgplayer',
          condition_grade: 'Raw NM',
          sold_price_local: tcg.marketPriceUSD,
          currency: 'USD',
          sold_price_jpy: tcg.marketPriceJPY,
          volume_indicator: 'Market Price (中央値)',
          source_evidence_url: tcg.url,
        });
      }
    }

    if (recordsToInsert.length > 0) {
      const { error } = await supabase.from('overseas_market_prices').insert(recordsToInsert);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: `${recordsToInsert.length} 件の海外成約相場データを同期・格納しました`,
      count: recordsToInsert.length,
    });
  } catch (error: any) {
    console.error('Market Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}