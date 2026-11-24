// lib/market-fetcher/apify-trend.ts
import { extractPokemonNameEn } from './pokemon-dictionary';

const APIFY_TOKEN = (process.env.APIFY_API_TOKEN || '').trim();
const EBAY_TASK_ID = (
  process.env.APIFY_EBAY_TASK_ID || 'caffein.dev/ebay-sold-listings'
).trim();

export interface DomesticTrendCandidate {
  cardName: string;
  rarity: string;
  currentPriceJpy: number;
  trendMetric: string;
  detailUrl: string;
  sourceSite: string;
  // eBay実成約データ（取得できた場合）
  ebaySoldLocalText?: string;
  ebaySoldJpy?: number;
  ebayCondition?: string;
  ebayItemUrl?: string;
  ebaySoldCount?: number;
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

/**
 * 日本語カード名から英語のeBay検索クエリを組み立てる
 */
export function buildEnglishEbayQueryForTrend(cardName: string, rarity: string, category: string): string {
  const baseJa = cardName.replace(/[\(（].*?[\)）]/g, '').replace(/\[.*?\]/g, '').trim();
  const enChar = extractPokemonNameEn(baseJa);

  const suffixMatch = baseJa.match(/\b(VSTAR|VMAX|VUNION|V-UNION|ex|EX|GX|V)\b/i);
  const suffix = suffixMatch ? suffixMatch[1] : '';

  const numMatch = cardName.match(/\b(\d{1,3}\/[A-Za-z0-9-]+)\b/);
  const cardNum = numMatch ? numMatch[1] : '';

  const rarityUpper = rarity.toUpperCase();
  const cleanRarity = /^(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SR|SP|SEC|PROMO)$/.test(rarityUpper)
    ? rarityUpper
    : '';

  const gameWord = category === 'onepiece' ? 'Japanese One Piece' : 'Japanese Pokemon';

  if (enChar) {
    return [enChar, suffix, cardNum, cleanRarity, gameWord].filter(Boolean).join(' ');
  }

  const asciiTokens = baseJa.match(/[A-Za-z0-9/-]+/g);
  if (asciiTokens && asciiTokens.length > 0) {
    return [asciiTokens.join(' '), cardNum, cleanRarity, gameWord].filter(Boolean).join(' ');
  }

  return [baseJa, cleanRarity, gameWord].filter(Boolean).join(' ');
}

/**
 * apify-arbitrage.ts と同じ Apify API v2 同期実行ヘルパー（actor-tasks / acts 自動フォールバック対応）
 */
async function runApifySync(
  rawId: string,
  token: string,
  bodyPayload: Record<string, any>
): Promise<any[]> {
  const apiPathId = rawId.replace(/\//g, '~');

  const taskUrl = `https://api.apify.com/v2/actor-tasks/${apiPathId}/run-sync-get-dataset-items?token=${token}`;
  const taskRes = await fetch(taskUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
    cache: 'no-store',
  });

  if (taskRes.ok) {
    const data = await taskRes.json();
    return Array.isArray(data) ? data : [];
  }

  if (taskRes.status === 404) {
    const actorUrl = `https://api.apify.com/v2/acts/${apiPathId}/run-sync-get-dataset-items?token=${token}`;
    const actorRes = await fetch(actorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      cache: 'no-store',
    });

    if (actorRes.ok) {
      const data = await actorRes.json();
      return Array.isArray(data) ? data : [];
    }
  }

  console.warn(`[ApifyTrend] eBayタスク実行失敗 (${rawId}): ${taskRes.status} ${taskRes.statusText}`);
  return [];
}

/**
 * 取得済みの国内トレンド候補に対して、caffein.dev/ebay-sold-listings で最新実成約データ（価格＋個別 /itm/ URL）を紐づける
 */
export async function enrichTrendCandidatesWithEbaySold(
  candidates: DomesticTrendCandidate[],
  region: 'us' | 'eu' | 'asia',
  category: string = 'pokemon',
  exchangeRateJpy: number = 155
): Promise<DomesticTrendCandidate[]> {
  if (!APIFY_TOKEN || !EBAY_TASK_ID || candidates.length === 0) {
    return candidates;
  }

  const targetCandidates = candidates.slice(0, 8);
  const isEu = region === 'eu';
  const targetEbaySite = isEu ? 'ebay.de' : 'ebay.com';
  const targetCurrency = isEu ? 'EUR' : 'USD';

  const candidateQueries = targetCandidates.map((c) => ({
    query: buildEnglishEbayQueryForTrend(c.cardName, c.rarity, category),
    enChar: extractPokemonNameEn(c.cardName.replace(/[\(（].*?[\)）]/g, '').trim()) || '',
    suffix: (c.cardName.match(/\b(VSTAR|VMAX|VUNION|V-UNION|ex|EX|GX|V)\b/i)?.[1] || '').toUpperCase(),
    rarity: (/^(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SR|SP|SEC|PROMO)$/i.test(c.rarity) ? c.rarity : '').toUpperCase(),
  }));

  const uniqueKeywords = Array.from(new Set(candidateQueries.map((q) => q.query)));

  const rawSoldItems = await runApifySync(EBAY_TASK_ID, APIFY_TOKEN, {
    ebaySite: targetEbaySite,
    keywords: uniqueKeywords,
    count: 10,
    exactMatch: false,
  });

  if (rawSoldItems.length === 0) {
    return candidates;
  }

  const parseLocalizedNumber = (val: unknown): number => {
    if (typeof val === 'number') return val;
    const cleaned = String(val || '').replace(/[^\d.,]/g, '').trim();
    if (!cleaned) return 0;
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma !== -1 && lastDot !== -1) {
      return lastComma > lastDot
        ? Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0
        : Number(cleaned.replace(/,/g, '')) || 0;
    }
    if (lastComma !== -1) {
      return cleaned.length - lastComma - 1 === 2
        ? Number(cleaned.replace(',', '.')) || 0
        : Number(cleaned.replace(/,/g, '')) || 0;
    }
    if (lastDot !== -1 && isEu && cleaned.length - lastDot - 1 === 3) {
      return Number(cleaned.replace(/\./g, '')) || 0;
    }
    return Number(cleaned) || 0;
  };

  const groupedByIdx = new Map<number, Array<{ priceLocal: number; url: string; title: string; isPsa10: boolean }>>();

  for (const item of rawSoldItems) {
    if (!item) continue;
    const title = String(item.title || '').trim();
    const rawUrl = String(item.url || item.itemUrl || '').trim();
    if (!title || !rawUrl || !rawUrl.includes('/itm/')) continue;

    // カスタム・中国語/韓国語・まとめ売り除外
    if (/\b(custom|parody|proxy|orica|replica|fake|jumbo|lot|bundle|set\s*of\s*\d+|bulk|chinese|china|korean|thai)\b/i.test(title)) {
      continue;
    }

    const rawCurrency = String(item.currency ?? item.soldCurrency ?? item.priceCurrency ?? '').toUpperCase().trim();
    const rawPriceStr = String(item.soldPrice ?? item.price ?? '');
    const itemPriceCorpus = `${rawCurrency} ${rawPriceStr} ${String(item.formattedPrice ?? '')}`.toUpperCase();

    let priceLocal = 0;
    if (isEu) {
      const eurMatch =
        itemPriceCorpus.match(/(?:CA\.?\s*)?(?:EUR|€)\s*([\d.,]+)/i) ||
        itemPriceCorpus.match(/([\d.,]+)\s*(?:EUR|€)/i);
      if (eurMatch) {
        priceLocal = parseLocalizedNumber(eurMatch[1]);
      } else {
        priceLocal =
          typeof item.soldPrice === 'number'
            ? item.soldPrice
            : typeof item.price === 'number'
            ? item.price
            : parseLocalizedNumber(rawPriceStr);
      }
    } else {
      const isUsdMismatch =
        (rawCurrency !== '' && rawCurrency !== 'USD') ||
        itemPriceCorpus.includes('£') ||
        itemPriceCorpus.includes('€') ||
        /\b(GBP|EUR|CAD|AUD|JPY|CHF|SGD|CNY|KRW)\b/.test(itemPriceCorpus);
      if (!isUsdMismatch) {
        priceLocal =
          typeof item.soldPrice === 'number'
            ? item.soldPrice
            : typeof item.price === 'number'
            ? item.price
            : parseLocalizedNumber(rawPriceStr);
      }
    }

    if (priceLocal <= 1) continue;

    // 検索キーワード（item.searchKeyword / item.keyword）またはタイトル照合で候補インデックスを特定
    const titleUpper = title.toUpperCase();
    const returnedKeyword = String(item.keyword || item.searchKeyword || '').trim();

    let matchedIdx = -1;
    if (returnedKeyword) {
      matchedIdx = candidateQueries.findIndex((q) => q.query.toLowerCase() === returnedKeyword.toLowerCase());
    }
    if (matchedIdx === -1) {
      matchedIdx = candidateQueries.findIndex((q) => {
        if (!q.enChar || !titleUpper.includes(q.enChar.toUpperCase())) return false;
        if (q.suffix && !titleUpper.includes(q.suffix)) return false;
        if (q.rarity && !titleUpper.includes(q.rarity)) return false;
        return true;
      });
    }
    if (matchedIdx === -1) continue;

    const isPsa10 = /\bPSA\s*10\b/i.test(title);
    const list = groupedByIdx.get(matchedIdx) || [];
    if (!list.some((x) => x.url === rawUrl)) {
      list.push({ priceLocal, url: rawUrl, title, isPsa10 });
      groupedByIdx.set(matchedIdx, list);
    }
  }

  return candidates.map((c, idx) => {
    const soldList = groupedByIdx.get(idx);
    if (!soldList || soldList.length === 0) return c;

    // Raw（未鑑定）が2件以上あればRaw優先、なければ全件の中央値を採用
    const rawOnly = soldList.filter((s) => !s.isPsa10);
    const activePool = rawOnly.length >= 2 ? rawOnly : soldList;
    activePool.sort((a, b) => a.priceLocal - b.priceLocal);

    const mid = activePool[Math.floor(activePool.length / 2)];
    const priceJpy = Math.round(mid.priceLocal * exchangeRateJpy);
    const symbol = targetCurrency === 'EUR' ? '€' : '$';

    const targetOrigin = isEu ? 'https://www.ebay.de' : 'https://www.ebay.com';
    const cleanUrl = mid.url
      .split('?')[0]
      .replace(/^https?:\/\/(www\.)?ebay\.(com|co\.uk|de|fr|it|es|ca|com\.au)/i, targetOrigin);

    return {
      ...c,
      ebaySoldLocalText: `約¥${priceJpy.toLocaleString()} (${symbol}${mid.priceLocal.toFixed(2)})`,
      ebaySoldJpy: priceJpy,
      ebayCondition: mid.isPsa10 ? 'PSA 10' : 'Raw NM',
      ebayItemUrl: cleanUrl,
      ebaySoldCount: soldList.length,
    };
  });
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

    return candidates.slice(0, 20);
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