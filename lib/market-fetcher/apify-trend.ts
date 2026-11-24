// lib/market-fetcher/apify-trend.ts
const APIFY_TOKEN = (process.env.APIFY_API_TOKEN || '').trim();

export interface DomesticTrendCandidate {
  cardName: string;
  rarity: string;
  currentPriceJpy: number;
  trendMetric: string; // 例: "+6,334円 (7日前: ¥49,466)"
  detailUrl: string;
  sourceSite: string;
}

/**
 * 旧裏・クラシック期（1996〜2006年）のカードか判定
 */
function isClassicVintageTitle(text: string): boolean {
  const upper = text.toUpperCase();
  return (
    /\b(OLD\s*BACK|NO\s*RARITY|1996|1997|1998|1999|2000|2001|2002|2003|2004|2005|2006|VS|WEB|ADV|PCG)\b/.test(
      upper
    ) || /(旧裏|旧裏面|ひかる|☆|スター)/.test(text)
  );
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
    '夜のタンカ', 'ともだちてちょう', 'カウンターキャッチャー', 'ポケモンいれかえ',
  ];
  return playableKeywords.some((kw) => text.includes(kw));
}

/**
 * コレクション向けレアリティ（SAR / AR / CSR / UR / HR / MUR / BWR / プロモ等）か判定
 */
function isCollectibleRarity(rarity: string, cardName: string, priceJpy: number): boolean {
  const rUpper = rarity.toUpperCase().trim();
  const combined = `${rUpper} ${cardName.toUpperCase()}`;

  if (/^(RR|RRR|U|C|R|N|UC)$/.test(rUpper)) {
    return false;
  }

  if (
    /\b(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SA|PROMO|SR|SP|SEC|L|TR)\b/.test(combined) ||
    /(プロモ|スペシャルアート|マスターボール|ミラー|記念|限定|パラレル|コミック|ピカチュウ|リザードン|ブラッキー|イーブイ|ニンフィア|ミュウ|ゲンガー|ナンジャモ|リーリエ|アセロラ|マリィ|ルチア|セレナ|ルフィ|シャンクス|エース|サボ|ナミ|ハンコック)/.test(
      cardName
    )
  ) {
    return true;
  }

  if ((rUpper === '' || rUpper === 'なし') && priceJpy >= 3000) {
    return true;
  }

  return false;
}

/**
 * トレチャ（torechart.com）から国内の7日間高騰ランキング（上昇額順・変動率順）を高速スクレイピングする
 */
export async function fetchDomesticTrendCandidates(
  category: string = 'pokemon'
): Promise<DomesticTrendCandidate[]> {
  if (!APIFY_TOKEN) {
    console.warn('[ApifyTrend] APIFY_API_TOKEN が未設定のため国内トレンド取得をスキップします');
    return [];
  }

  if (category !== 'pokemon' && category !== 'onepiece') {
    return [];
  }

  const domainCategory = category === 'onepiece' ? 'onepiece' : 'pokemon';
  const targetUrls = [
    { url: `https://torechart.com/${domainCategory}/priceup?dayType=7&rankingType=0` },
    { url: `https://torechart.com/${domainCategory}/priceup?dayType=7&rankingType=2` },
  ];

  const pageFunction = `async function pageFunction(context) {
    const { $, request } = context;
    const results = [];
    const seen = new Set();

    $('a[href*="detail"]').each((_, el) => {
      const href = ($(el).attr('href') || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      let fullUrl = '';
      try {
        fullUrl = new URL(href, request.url).href;
      } catch (e) {
        return;
      }

      if (!fullUrl.includes('torechart.com/')) return;

      let container = $(el);
      for (let i = 0; i < 4; i++) {
        const txt = container.text();
        if (/[¥￥]\\s*[\\d,]+/.test(txt)) break;
        const parent = container.parent();
        if (!parent || parent.length === 0) break;
        container = parent;
      }

      const blockText = container.text().replace(/\\s+/g, ' ').trim();
      if (!blockText || blockText.length > 400) return;

      const priceMatch = blockText.match(/[¥￥]\\s*([\\d,]+)/);
      if (!priceMatch) return;
      const currentPriceJpy = Number(priceMatch[1].replace(/,/g, '')) || 0;
      if (currentPriceJpy < 300) return;

      let cardName = $(el).text().replace(/\\s+/g, ' ').trim();
      cardName = cardName
        .replace(/^\\d+\\s*位\\s*/, '')
        .replace(/[¥￥]\\s*[\\d,]+.*/g, '')
        .replace(/レア度\\s*[:：].*/g, '')
        .replace(/7日前\\s*[:：].*/g, '')
        .trim();

      if (!cardName || cardName.length < 2) {
        cardName = blockText
          .replace(/^\\d+\\s*位\\s*/, '')
          .split(/[¥￥]\\s*[\\d,]+/)[0]
          .trim();
      }
      if (!cardName || cardName.length < 2 || cardName.length > 80) return;

      const rarityMatch = blockText.match(/レア度\\s*[:：]\\s*([^\\s/・|]+)/);
      const rarity = rarityMatch && rarityMatch[1] !== 'なし' ? rarityMatch[1].trim() : '';

      const diffYenMatch = blockText.match(/\\(\\s*([+＋][\\d,]+円)\\s*\\)/);
      const diffPctMatch = blockText.match(/\\(\\s*([+＋]?\\d+(?:\\.\\d+)?%)\\s*\\)/);
      const prevPriceMatch = blockText.match(/7日前\\s*[:：]\\s*([¥￥]\\s*[\\d,]+)/);

      const metricParts = [];
      if (diffYenMatch) metricParts.push(diffYenMatch[1]);
      if (diffPctMatch) metricParts.push('+' + diffPctMatch[1].replace(/^[+＋]/, ''));
      if (prevPriceMatch) metricParts.push('7日前: ' + prevPriceMatch[1].replace(/\\s+/g, ''));
      const trendMetric = metricParts.length > 0 ? metricParts.join(' / ') : '週間高騰ランキング上位';

      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      results.push({
        sourceUrl: request.url,
        cardName,
        rarity,
        currentPriceJpy,
        trendMetric,
        detailUrl: fullUrl,
      });
    });

    return results;
  }`;

  // 25秒のハードタイムアウトを設定しパイプライン全体の遅延を防止
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~cheerio-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=25&memory=512`,
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
          requestHandlerTimeoutSecs: 15,
        }),
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const errDetail = await res.text().catch(() => '');
      console.warn(`[ApifyTrend] torechart.com 取得失敗: ${res.status} ${res.statusText} | ${errDetail}`);
      return [];
    }

    const rawItems: any[] = await res.json();
    const candidates: DomesticTrendCandidate[] = [];
    const seenUrls = new Set<string>();

    for (const item of rawItems) {
      if (!item || !item.cardName) continue;
      const cardName = String(item.cardName).trim();
      const rarity = String(item.rarity || '').trim();
      const price = Number(item.currentPriceJpy) || 0;
      const detailUrl = String(item.detailUrl || '');

      if (price <= 0 || !detailUrl) continue;
      if (seenUrls.has(detailUrl)) continue;
      if (isClassicVintageTitle(cardName)) continue;
      if (isPlayableNonCollectible(cardName)) continue;
      if (!isCollectibleRarity(rarity, cardName, price)) continue;

      seenUrls.add(detailUrl);

      const displayName =
        rarity && !cardName.toUpperCase().includes(rarity.toUpperCase())
          ? `${cardName} (${rarity})`
          : cardName;

      candidates.push({
        cardName: displayName,
        rarity: rarity || 'コレクション枠',
        currentPriceJpy: price,
        trendMetric: String(item.trendMetric || '週間高騰ランキング上位'),
        detailUrl,
        sourceSite: 'トレチャ (torechart.com)',
      });
    }

    return candidates.slice(0, 25);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[ApifyTrend] torechart.com 取得が25秒でタイムアウトしたためスキップしました');
    } else {
      console.warn('[ApifyTrend] 国内トレンドスクレイピングエラー:', err);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}