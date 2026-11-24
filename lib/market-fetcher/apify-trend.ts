// lib/market-fetcher/apify-trend.ts
const APIFY_TOKEN = (process.env.APIFY_API_TOKEN || '').trim();

export interface DomesticTrendCandidate {
  cardName: string;
  rarity: string;
  currentPriceJpy: number;
  trendMetric: string;
  detailUrl: string;
  sourceSite: string;
}

function isClassicVintageTitle(text: string): boolean {
  const upper = text.toUpperCase();
  return (
    /\b(OLD\s*BACK|NO\s*RARITY|1996|1997|1998|1999|2000|2001|2002|2003|2004|2005|2006|VS|WEB|ADV|PCG)\b/.test(
      upper
    ) || /(旧裏|旧裏面|ひかる|☆|スター)/.test(text)
  );
}

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
    const { page, request } = context;

    // JSでランキング一覧が描画されるまで待機
    await page.waitForSelector('a[href*="detail"]', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1500);

    return await page.evaluate(({ reqUrl, domainCat }) => {
      const results = [];
      const seen = new Set();
      const anchors = Array.from(document.querySelectorAll('a'));

      for (const a of anchors) {
        const href = (a.getAttribute('href') || '').trim();
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;

        if (/\\/(priceup|pricedown|ranking|search|about|privacy|contact|login|signup|terms|faq)\\b/i.test(href) && !href.includes('id=')) {
          continue;
        }
        if (href === '/' || href === '/pokemon' || href === '/onepiece' || href === '/pokemon/' || href === '/onepiece/') {
          continue;
        }

        let fullUrl = '';
        try {
          fullUrl = new URL(href, reqUrl).href;
        } catch (e) {
          continue;
        }

        if (!fullUrl.startsWith('https://torechart.com/')) continue;
        fullUrl = fullUrl.replace(
          /^https:\\/\\/torechart\\.com\\/detail/i,
          'https://torechart.com/' + domainCat + '/detail'
        );

        // 親要素を最大6階層たどり、価格（¥ または 円）を含む最小コンテナを取得
        let container = a;
        let foundPrice = false;
        for (let i = 0; i < 6; i++) {
          const txt = container.innerText || container.textContent || '';
          if (/[¥￥]\\s*[\\d,]{3,}|[\\d,]{3,}\\s*円/.test(txt)) {
            foundPrice = true;
            break;
          }
          const parent = container.parentElement;
          if (!parent || ['BODY', 'HTML', 'MAIN', 'TABLE'].includes(parent.tagName)) break;
          container = parent;
        }
        if (!foundPrice) continue;

        const blockText = (container.innerText || container.textContent || '').replace(/\\s+/g, ' ').trim();
        if (!blockText || blockText.length > 500) continue;

        const priceMatch = blockText.match(/[¥￥]\\s*([\\d,]{3,})/) || blockText.match(/([\\d,]{3,})\\s*円/);
        if (!priceMatch) continue;
        const currentPriceJpy = Number(priceMatch[1].replace(/,/g, '')) || 0;
        if (currentPriceJpy < 300) continue;

        let cardName = (a.innerText || a.textContent || '').replace(/\\s+/g, ' ').trim();
        cardName = cardName
          .replace(/^\\d+\\s*位\\s*/, '')
          .replace(/[¥￥]\\s*[\\d,]+.*/g, '')
          .replace(/[\\d,]+\\s*円.*/g, '')
          .replace(/レア度\\s*[:：].*/g, '')
          .replace(/7日前\\s*[:：].*/g, '')
          .trim();

        if (!cardName || cardName.length < 2) {
          cardName = blockText
            .replace(/^\\d+\\s*位\\s*/, '')
            .split(/[¥￥]\\s*[\\d,]+|[\\d,]+\\s*円/)[0]
            .replace(/レア度\\s*[:：].*/g, '')
            .trim();
        }
        if (!cardName || cardName.length < 2 || cardName.length > 80) continue;

        const rarityMatch = blockText.match(/レア度\\s*[:：]\\s*([^\\s/・|]+)/)
          || blockText.match(/\\b(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SR|SP|SEC|PROMO)\\b/i);
        const rarity = rarityMatch && rarityMatch[1] !== 'なし' ? rarityMatch[1].trim() : '';

        const diffMatches = blockText.match(/([+＋][\\d,]+\\s*円|[+＋]?\\d+(?:\\.\\d+)?\\s*%|7日前\\s*[:：]\\s*[¥￥]?\\s*[\\d,]+円?)/g);
        const trendMetric = diffMatches ? Array.from(new Set(diffMatches)).join(' / ') : '週間高騰ランキング上位';

        if (seen.has(fullUrl)) continue;
        seen.add(fullUrl);

        results.push({
          sourceUrl: reqUrl,
          cardName,
          rarity,
          currentPriceJpy,
          trendMetric,
          detailUrl: fullUrl,
        });
      }

      return results;
    }, { reqUrl: request.url, domainCat: '${domainCategory}' });
  }`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~playwright-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=40&memory=1024`,
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
          requestHandlerTimeoutSecs: 25,
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
      console.warn('[ApifyTrend] torechart.com 取得が45秒でタイムアウトしたためスキップしました');
    } else {
      console.warn('[ApifyTrend] 国内トレンドスクレイピングエラー:', err);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}