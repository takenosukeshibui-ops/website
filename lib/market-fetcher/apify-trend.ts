// lib/market-fetcher/apify-trend.ts
const APIFY_TOKEN = (process.env.APIFY_API_TOKEN || '').trim();

export interface DomesticTrendCandidate {
  cardName: string;
  rarity: string;
  currentPriceJpy: number;
  trendMetric: string; // 例: "+3,200円 (+24.5%) / 取引 18件"
  detailUrl: string;
  sourceSite: string;
}

/**
 * 旧裏・クラシック期（1996〜2006年）のカードか判定
 */
function isClassicVintageTitle(text: string): boolean {
  const upper = text.toUpperCase();
  return /\b(OLD\s*BACK|NO\s*RARITY|1996|1997|1998|1999|2000|2001|2002|2003|2004|2005|2006|VS|WEB|ADV|PCG)\b/.test(
    upper
  ) || /(旧裏|旧裏面|ひかる|☆|スター)/.test(text);
}

/**
 * 大会プレイ専用カード（グッズ・スタジアム・エネルギー・ACE SPEC等）か判定
 */
function isPlayableNonCollectible(text: string): boolean {
  const upper = text.toUpperCase();
  if (/\b(ACE\s*SPEC|グッズ|スタジアム|基本.*エネルギー|特殊エネルギー)\b/i.test(upper)) {
    return true;
  }
  const playableKeywords = [
    'ポフィン', 'キャッチャー', 'タンカ', 'ネストボール', 'ハイパーボール',
    '大地の器', 'すごいつりざお', 'いれかえカート', '緊急ボード', '封印石',
    'マシーン', 'シークレットボックス', 'プライムキャッチャー', 'アンフェアスタンプ',
    'きらめく結晶', 'プレシャスキャリー', 'エネルギー転送', 'カウンターゲイン',
  ];
  return playableKeywords.some((kw) => text.includes(kw));
}

/**
 * コレクション向けレアリティ（SAR / AR / CSR / UR / HR / MUR / BWR / プロモ等）か判定
 */
function isCollectibleRarity(rarity: string, cardName: string): boolean {
  const combined = `${rarity} ${cardName}`.toUpperCase();
  if (/\b(RR|RRR|U|C|R)\b/.test(rarity.toUpperCase().trim())) {
    return false;
  }
  return (
    /\b(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SA|PROMO|SR)\b/.test(combined) ||
    /(プロモ|スペシャルアート|マスターボール|ミラー|記念|限定|ピカチュウ|リザードン|ブラッキー|イーブイ|ニンフィア|ミュウ|ゲンガー|ナンジャモ|リーリエ|アセロラ|マリィ|ルチア|セレナ)/.test(
      cardName
    )
  );
}

/**
 * みんなのポケカ相場（pokeca-chart.com）から国内の高騰・取引急増銘柄をスクレイピングする
 */
export async function fetchDomesticTrendCandidates(
  category: string = 'pokemon'
): Promise<DomesticTrendCandidate[]> {
  if (!APIFY_TOKEN) {
    console.warn('[ApifyTrend] APIFY_API_TOKEN が未設定のため国内トレンド取得をスキップします');
    return [];
  }

  // 現在はポケモンカード専用ソース（pokeca-chart.com）を対象
  if (category !== 'pokemon') {
    return [];
  }

  const targetUrls = [
    { url: 'https://pokeca-chart.com/' },
    { url: 'https://pokeca-chart.com/ranking/' },
  ];

  const pageFunction = `async function pageFunction(context) {
    const { $, request } = context;
    const results = [];
    const seen = new Set();

    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const fullUrl = href.startsWith('http')
        ? href
        : href.startsWith('/')
        ? 'https://pokeca-chart.com' + href
        : 'https://pokeca-chart.com/' + href;

      if (!fullUrl.startsWith('https://pokeca-chart.com/')) return;
      // ナビゲーションや固定ページを除外し、個別カードページ候補を抽出
      if (/\\/(ranking|category|tag|page|privacy|contact|about|news|search)\\/?$/i.test(fullUrl)) return;

      const container = $(el).closest('tr, li, article, .card-item, .ranking-item, div');
      const blockText = (container.length ? container.text() : $(el).text())
        .replace(/\\s+/g, ' ')
        .trim();

      if (!blockText || blockText.length < 4 || blockText.length > 260) return;

      // 価格（〇〇円）が含まれるブロックのみ対象
      const priceMatches = blockText.match(/([\\d,]{2,})\\s*円/g);
      if (!priceMatches || priceMatches.length === 0) return;

      const rawLinkText = $(el).text().replace(/\\s+/g, ' ').trim();
      let cardName = rawLinkText
        .replace(/[\\d,]+\\s*円.*/g, '')
        .replace(/[+＋\\-－][\\d,.]+[%％円].*/g, '')
        .replace(/^\\d+位\\s*/, '')
        .trim();

      if (!cardName || cardName.length < 2) {
        const headingText = container.find('h2, h3, h4, .name, .title').first().text().replace(/\\s+/g, ' ').trim();
        cardName = headingText || blockText.split(/\\d+\\s*円/)[0].replace(/^\\d+位\\s*/, '').trim();
      }

      if (!cardName || cardName.length < 2 || cardName.length > 80) return;

      // 現在価格（円）
      const firstPriceNum = Number(priceMatches[0].replace(/[^\\d]/g, '')) || 0;
      if (firstPriceNum < 300) return;

      // レアリティ抽出
      const rarityMatch = blockText.match(/\\b(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SR|RR|RRR|PROMO)\\b/i)
        || blockText.match(/(プロモ|マスターボール|スペシャルアート)/);
      const rarity = rarityMatch ? rarityMatch[1].toUpperCase() : '';

      // 上昇額・上昇率・取引件数などの変動シグナル抽出
      const diffMatches = blockText.match(/([+＋][\\d,]+\\s*円|[+＋]?\\d+(?:\\.\\d+)?\\s*[%％]|\\d+\\s*件)/g);
      const trendMetric = diffMatches ? Array.from(new Set(diffMatches)).join(' / ') : '高騰ランキング掲載';

      const dedupKey = cardName + '_' + rarity;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      results.push({
        sourceUrl: request.url,
        cardName,
        rarity,
        currentPriceJpy: firstPriceNum,
        trendMetric,
        detailUrl: fullUrl,
      });
    });

    return results;
  }`;

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~cheerio-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: targetUrls,
          pageFunction,
          proxyConfiguration: { useApifyProxy: true },
          maxRequestsPerCrawl: targetUrls.length,
          maxConcurrency: 2,
          maxRequestRetries: 1,
          requestHandlerTimeoutSecs: 20,
          ignoreSslErrors: true,
        }),
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.warn(`[ApifyTrend] pokeca-chart.com 取得失敗: ${res.status} ${res.statusText}`);
      return [];
    }

    const rawItems: any[] = await res.json();
    const candidates: DomesticTrendCandidate[] = [];
    const seenNames = new Set<string>();

    for (const item of rawItems) {
      if (!item || !item.cardName) continue;
      const cardName = String(item.cardName).trim();
      const rarity = String(item.rarity || '').trim();
      const price = Number(item.currentPriceJpy) || 0;

      if (price <= 0) continue;
      if (isClassicVintageTitle(cardName)) continue;
      if (isPlayableNonCollectible(cardName)) continue;
      if (!isCollectibleRarity(rarity, cardName)) continue;

      const key = `${cardName}_${rarity}`;
      if (seenNames.has(key)) continue;
      seenNames.add(key);

      candidates.push({
        cardName: rarity && !cardName.toUpperCase().includes(rarity) ? `${cardName} (${rarity})` : cardName,
        rarity: rarity || 'コレクション枠',
        currentPriceJpy: price,
        trendMetric: String(item.trendMetric || '国内相場上昇中'),
        detailUrl: String(item.detailUrl || 'https://pokeca-chart.com/'),
        sourceSite: 'みんなのポケカ相場 (pokeca-chart.com)',
      });
    }

    return candidates.slice(0, 25);
  } catch (err) {
    console.warn('[ApifyTrend] 国内トレンドスクレイピングエラー:', err);
    return [];
  }
}