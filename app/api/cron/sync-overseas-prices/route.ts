// app/api/cron/sync-overseas-prices/route.ts
export const maxDuration = 60; // Vercel 実行時間拡張対応[cite: 1]

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchEbayPrice } from '@/lib/market-fetcher/ebay';
import { fetchTcgplayerPrice } from '@/lib/market-fetcher/tcgplayer';
import { fetchCardmarketPrice } from '@/lib/market-fetcher/cardmarket';
import { COMPREHENSIVE_SEED_CARDS, SeedCardDefinition } from '@/lib/market-fetcher/card-master';

// APIレート制限およびバースト負荷を回避するための並行実行ヘルパー
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
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

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetSlot = searchParams.get('slot');

    // スロットクエリ指定があれば絞り込み、なければ全スロット対象（型を明示）
    const targetCards: SeedCardDefinition[] = targetSlot
      ? COMPREHENSIVE_SEED_CARDS.filter((c: SeedCardDefinition) => c.slotKey === targetSlot)
      : COMPREHENSIVE_SEED_CARDS;

    const recordsToInsert: any[] = [];

    // 3件ずつ並行で外部API（eBay US/UK/DE、TCGplayer、Cardmarket）から取得
    await mapConcurrent<SeedCardDefinition, void>(targetCards, 3, async (seed: SeedCardDefinition) => {
      const [ebayUS, ebayUK, ebayDE, tcg, cm] = await Promise.all([
        fetchEbayPrice(seed.queryEbay, 'us'),
        fetchEbayPrice(seed.queryEbay, 'uk'),
        fetchEbayPrice(seed.queryEbay, 'de'),
        fetchTcgplayerPrice(seed.tcgCategoryId, seed.searchTcg),
        fetchCardmarketPrice(seed.searchTcg, 'Pokemon'),
      ]);

      // 1. eBay US (北米・USD)
      if (ebayUS && ebayUS.priceLocal > 0) {
        recordsToInsert.push({
          category: seed.category,
          card_name: seed.name,
          region: 'us',
          platform: 'ebay_us',
          condition_grade: ebayUS.condition || 'Raw NM',
          sold_price_local: ebayUS.priceLocal,
          currency: ebayUS.currency,
          sold_price_jpy: ebayUS.priceJpy,
          volume_indicator: '直近出品・即決実勢相場',
          source_evidence_url: ebayUS.itemUrl,
        });
      }

      // 2. TCGplayer (北米・USD)
      if (tcg && tcg.marketPriceUSD > 0) {
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

      // 3. Cardmarket (欧州・EUR)
      if (cm && cm.trendPriceEUR > 0) {
        recordsToInsert.push({
          category: seed.category,
          card_name: seed.name,
          region: 'eu',
          platform: 'cardmarket',
          condition_grade: 'Near Mint',
          sold_price_local: cm.trendPriceEUR,
          currency: 'EUR',
          sold_price_jpy: cm.priceJpy,
          volume_indicator: 'MKM Trend Price',
          source_evidence_url: cm.url,
        });
      }

      // 4. eBay DE (欧州ドイツ・EUR)
      if (ebayDE && ebayDE.priceLocal > 0) {
        recordsToInsert.push({
          category: seed.category,
          card_name: seed.name,
          region: 'eu',
          platform: 'ebay_de',
          condition_grade: ebayDE.condition || 'Raw NM',
          sold_price_local: ebayDE.priceLocal,
          currency: ebayDE.currency,
          sold_price_jpy: ebayDE.priceJpy,
          volume_indicator: 'EU域内即決実勢相場',
          source_evidence_url: ebayDE.itemUrl,
        });
      }

      // 5. eBay UK (英国・GBP)
      if (ebayUK && ebayUK.priceLocal > 0) {
        recordsToInsert.push({
          category: seed.category,
          card_name: seed.name,
          region: 'eu',
          platform: 'ebay_uk',
          condition_grade: ebayUK.condition || 'Raw NM',
          sold_price_local: ebayUK.priceLocal,
          currency: ebayUK.currency,
          sold_price_jpy: ebayUK.priceJpy,
          volume_indicator: '英国即決実勢相場',
          source_evidence_url: ebayUK.itemUrl,
        });
      }
    });

    if (recordsToInsert.length > 0) {
      const supabase = await createClient(); //[cite: 1]
      const { error } = await supabase.from('overseas_market_prices').insert(recordsToInsert);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: `全${targetCards.length}銘柄中、${recordsToInsert.length}件の海外相場データを同期・格納しました`,
      syncedCount: recordsToInsert.length,
      targetCards: targetCards.length,
    });
  } catch (error: any) {
    console.error('Overseas Market Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}