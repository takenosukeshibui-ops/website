// lib/market-fetcher/apify-trend.ts
import { extractPokemonNameEn } from './pokemon-dictionary';

const APIFY_TOKEN = (process.env.APIFY_API_TOKEN || '').trim();
const EBAY_TASK_ID = (
  process.env.APIFY_EBAY_TASK_ID || 'caffein.dev/ebay-sold-listings'
).trim();

export interface DomesticTrendCandidate {
  cardName: string;
  cardNumber?: string;
  rarity: string;
  currentPriceJpy: number;
  trendMetric: string;
  detailUrl: string;
  sourceSite: string;
  ebaySoldLocalText?: string;
  ebaySoldJpy?: number;
  ebayCondition?: string;
  ebayItemUrl?: string;
  ebaySoldCount?: number;
}

// トレーナーズ・ワンピース主要キャラ英語辞書（pokemon-dictionary補完用）
const CHARACTER_EN_MAP: Array<[string, string]> = [
  ['ナンジャモ', 'Iono'],
  ['リーリエ', 'Lillie'],
  ['アセロラ', 'Acerola'],
  ['マリィ', 'Marnie'],
  ['ミモザ', 'Miriam'],
  ['ボタン', 'Penny'],
  ['エリカ', 'Erika'],
  ['シロナ', 'Cynthia'],
  ['ルチア', 'Lisia'],
  ['セレナ', 'Serena'],
  ['カスミ', 'Misty'],
  ['サカキ', 'Giovanni'],
  ['ゼイユ', 'Carmine'],
  ['サザレ', 'Perrin'],
  ['スグリ', 'Kieran'],
  ['メイ', 'Rosa'],
  ['かんこうきゃく', 'Sightseer'],
  ['カイ', 'Irida'],
  ['セキ', 'Adaman'],
  ['キハダ', 'Dendra'],
  ['パラソルおねえさん', 'Parasol Lady'],
  ['タロ', 'Lacey'],
  ['ルフィ', 'Luffy'],
  ['シャンクス', 'Shanks'],
  ['エース', 'Ace'],
  ['サボ', 'Sabo'],
  ['ナミ', 'Nami'],
  ['ハンコック', 'Boa Hancock'],
  ['ゾロ', 'Zoro'],
  ['サンジ', 'Sanji'],
  ['ロー', 'Trafalgar Law'],
  ['キッド', 'Eustass Kid'],
  ['ティーチ', 'Marshall D Teach'],
  ['バギー', 'Buggy'],
  ['ウタ', 'Uta'],
  ['ヤマト', 'Yamato'],
  ['ロビン', 'Nico Robin'],
  ['チョッパー', 'Chopper'],
];

function resolveCharacterNameEn(jaText: string): string {
  const pokeEn = extractPokemonNameEn(jaText);
  if (pokeEn) return pokeEn;
  for (const [ja, en] of CHARACTER_EN_MAP) {
    if (jaText.includes(ja)) return en;
  }
  return '';
}

function extractMechanicSuffix(text: string): string {
  const m = text.match(/(?:^|[^A-Za-z])(VSTAR|VMAX|V-UNION|VUNION|EX|GX|V)(?=$|[^A-Za-z])/i);
  return m ? m[1].toUpperCase().replace('VUNION', 'V-UNION') : '';
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

export function buildEnglishEbayQueryForTrend(
  cardName: string,
  rarity: string,
  category: string,
  cardNumber?: string
): string {
  const baseJa = cardName.replace(/[\(（].*?[\)）]/g, '').replace(/\[.*?\]/g, '').trim();
  const enChar = resolveCharacterNameEn(baseJa);
  const suffix = extractMechanicSuffix(baseJa);

  const numMatch = (cardNumber || cardName).match(/\b(\d{2,3}\/\d{2,3}|(?:OP|ST|EB|PRB)\d{2}-\d{3}|\d{1,3}\/[A-Za-z0-9-]+)\b/);
  const cardNum = numMatch ? numMatch[1] : '';

  const rarityUpper = rarity.toUpperCase().trim();
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

function isEbayNoiseListing(title: string): boolean {
  return /\b(custom|parody|proxy|orica|replica|fake|jumbo|oversized|lot|joblot|bundle|set\s*of\s*\d+|complete\s*set|bulk|streamer|break|booster\s*box|booster\s*pack|empty|case\s*only|chinese|china|s-chinese|t-chinese|30thc|m6a|cbb\d*|korean|thai|indonesian)\b/i.test(
    title
  );
}

function matchesRarityInTitle(titleUpper: string, rarityUpper: string): boolean {
  if (!rarityUpper) return true;
  if (rarityUpper === 'SAR') {
    return /\b(SAR|SPECIAL\s*ART\s*RARE|SIR)\b/.test(titleUpper);
  }
  if (rarityUpper === 'PROMO') {
    return /\b(PROMO|SV-P|S-P|SM-P|XY-P|BW-P)\b/.test(titleUpper);
  }
  return new RegExp(`\\b${rarityUpper}\\b`).test(titleUpper);
}

function matchesCandidateTitleAndPrice(
  title: string,
  soldJpy: number,
  enChar: string,
  suffix: string,
  rarityUpper: string,
  cardNum: string,
  domesticPriceJpy: number,
  strictPriceCheck: boolean = true
): { matched: boolean; isGraded: boolean } {
  const titleUpper = title.toUpperCase();

  if (cardNum && !titleUpper.includes(cardNum.toUpperCase())) {
    return { matched: false, isGraded: false };
  }

  if (enChar) {
    const tokens = enChar.toUpperCase().split(/\s+/).filter(Boolean);
    if (!tokens.every((t) => titleUpper.includes(t))) {
      return { matched: false, isGraded: false };
    }
  } else if (!cardNum) {
    return { matched: false, isGraded: false };
  }

  if (suffix) {
    if (suffix === 'V') {
      if (!/\bV\b/.test(titleUpper)) return { matched: false, isGraded: false };
    } else if (!new RegExp(`\\b${suffix}\\b`).test(titleUpper)) {
      return { matched: false, isGraded: false };
    }
  } else {
    if (/\b(VSTAR|VMAX|V-UNION|VUNION|EX|GX)\b/.test(titleUpper)) {
      return { matched: false, isGraded: false };
    }
  }

  if (!matchesRarityInTitle(titleUpper, rarityUpper)) {
    return { matched: false, isGraded: false };
  }

  const isGraded = /\b(PSA|BGS|CGC|ARS|TAG|GRADE|GEM\s*MINT)\s*10\b/i.test(title);

  if (strictPriceCheck && domesticPriceJpy > 0) {
    const minValidJpy = isGraded
      ? Math.max(2000, Math.round(domesticPriceJpy * 0.5))
      : Math.round(domesticPriceJpy * 0.35);
    const maxValidJpy = isGraded
      ? Math.max(Math.round(domesticPriceJpy * 5.0), domesticPriceJpy + 35000)
      : Math.max(Math.round(domesticPriceJpy * 3.5), domesticPriceJpy + 12000);

    if (soldJpy < minValidJpy || soldJpy > maxValidJpy) {
      return { matched: false, isGraded };
    }
  }

  return { matched: true, isGraded };
}

function parseLocalizedNumber(val: unknown, isEu: boolean): number {
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
}

async function runApifySync(
  rawId: string,
  token: string,
  bodyPayload: Record<string, any>
): Promise<any[]> {
  const apiPathId = rawId.replace(/\//g, '~');

  try {
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
      const actorErr = await actorRes.text().catch(() => '');
      console.warn(`[ApifyTrend] eBay Actor失敗 (${rawId}): ${actorRes.status} | ${actorErr}`);
      return [];
    }

    const taskErr = await taskRes.text().catch(() => '');
    console.warn(`[ApifyTrend] eBay Task失敗 (${rawId}): ${taskRes.status} | ${taskErr}`);
    return [];
  } catch (err) {
    console.warn(`[ApifyTrend] eBay Task通信エラー (${rawId}):`, err);
    return [];
  }
}

/**
 * EBAY_TASK_ID で個別成約が不足した場合、Playwrightで直接eBay Soldページから /itm/ 個別URLと成約価格を抽出する
 */
async function fetchEbaySoldFallbackViaPlaywright(
  queries: Array<{ idx: number; query: string }>,
  isEu: boolean
): Promise<Array<{ candidateIdx: number; itemId: string; title: string; priceText: string }>> {
  if (!APIFY_TOKEN || queries.length === 0) return [];

  const ebayOrigin = isEu ? 'https://www.ebay.de' : 'https://www.ebay.com';
  const startUrls = queries.slice(0, 8).map((q) => ({
    url: `${ebayOrigin}/sch/i.html?_nkw=${encodeURIComponent(q.query)}&LH_Sold=1&LH_Complete=1&_sop=13`,
    userData: { candidateIdx: q.idx },
  }));

  const ebayPageFunction = `async function pageFunction(context) {
    const { page, request } = context;
    const candidateIdx = request.userData && typeof request.userData.candidateIdx === 'number'
      ? request.userData.candidateIdx
      : -1;

    await page.waitForSelector('a[href*="/itm/"]', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);

    return await page.evaluate(({ cIdx }) => {
      const items = [];
      const seenIds = new Set();
      const anchors = Array.from(document.querySelectorAll('a[href*="/itm/"]'));

      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        const idMatch = href.match(/\\/itm\\/(\\d{9,15})/);
        if (!idMatch) continue;
        const itemId = idMatch[1];
        if (itemId === '123456' || seenIds.has(itemId)) continue;

        let card = a.closest('li.s-item, li.s-card, div.s-item__wrapper, div.s-card__wrapper');
        if (!card) {
          let el = a.parentElement;
          for (let i = 0; i < 5 && el; i++) {
            const t = el.innerText || '';
            if (t.length > 20 && t.length < 1000 && /(\\$|USD|EUR|€|JPY|¥)/.test(t)) {
              card = el;
              break;
            }
            el = el.parentElement;
          }
        }
        if (!card) continue;

        const titleEl = card.querySelector('.s-item__title, .s-card__title, h3, [role="heading"]');
        const priceEl = card.querySelector('.s-item__price, .s-card__price');
        const title = ((titleEl ? titleEl.textContent : a.textContent) || '')
          .replace(/^(New Listing|新規出品)\\s*/i, '')
          .replace(/Opens in a new window or tab/gi, '')
          .replace(/\\s+/g, ' ')
          .trim();
        const priceText = ((priceEl ? priceEl.textContent : card.textContent) || '').replace(/\\s+/g, ' ').trim();

        if (!title || title === 'Shop on eBay' || !priceText) continue;
        seenIds.add(itemId);

        items.push({
          candidateIdx: cIdx,
          itemId,
          title,
          priceText: priceText.slice(0, 200),
        });
        if (items.length >= 15) break;
      }
      return items;
    }, { cIdx: candidateIdx });
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
          startUrls,
          pageFunction: ebayPageFunction,
          proxyConfiguration: { useApifyProxy: true },
          maxRequestsPerCrawl: startUrls.length,
          maxConcurrency: 4,
          maxRequestRetries: 1,
          requestHandlerTimeoutSecs: 20,
        }),
        cache: 'no-store',
        signal: controller.signal,
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 国内トレンド候補に対して、eBayの実成約データ（価格＋個別 /itm/ URL）を厳格照合して紐づける
 */
export async function enrichTrendCandidatesWithEbaySold(
  candidates: DomesticTrendCandidate[],
  region: 'us' | 'eu' | 'asia',
  category: string = 'pokemon',
  exchangeRateJpy: number = 155
): Promise<DomesticTrendCandidate[]> {
  if (!APIFY_TOKEN || candidates.length === 0) {
    return candidates;
  }

  const targetCount = Math.min(candidates.length, 12);
  const targetCandidates = candidates.slice(0, targetCount);
  const isEu = region === 'eu';
  const targetEbaySite = isEu ? 'ebay.de' : 'ebay.com';
  const targetOrigin = isEu ? 'https://www.ebay.de' : 'https://www.ebay.com';
  const targetCurrency = isEu ? 'EUR' : 'USD';

  const candidateSpecs = targetCandidates.map((c, idx) => {
    const baseJa = c.cardName.replace(/[\(（].*?[\)）]/g, '').replace(/\[.*?\]/g, '').trim();
    const numMatch = (c.cardNumber || c.cardName).match(
      /\b(\d{2,3}\/\d{2,3}|(?:OP|ST|EB|PRB)\d{2}-\d{3}|\d{1,3}\/[A-Za-z0-9-]+)\b/
    );
    return {
      idx,
      query: buildEnglishEbayQueryForTrend(c.cardName, c.rarity, category, c.cardNumber),
      enChar: resolveCharacterNameEn(baseJa),
      suffix: extractMechanicSuffix(baseJa),
      rarityUpper: (/^(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SR|SP|SEC|PROMO)$/i.test(c.rarity)
        ? c.rarity
        : ''
      ).toUpperCase(),
      cardNum: numMatch ? numMatch[1] : '',
      domesticPriceJpy: c.currentPriceJpy,
    };
  });

  const groupedByIdx = new Map<
    number,
    Array<{ priceLocal: number; url: string; title: string; isPsa10: boolean }>
  >();

  // Step 1: EBAY_TASK_ID (count: 20) で一括取得
  if (EBAY_TASK_ID) {
    const uniqueKeywords = Array.from(new Set(candidateSpecs.map((q) => q.query)));
    const rawSoldItems = await runApifySync(EBAY_TASK_ID, APIFY_TOKEN, {
      ebaySite: targetEbaySite,
      keywords: uniqueKeywords,
      count: 20,
      exactMatch: false,
      minPrice: 5,
    });

    for (const item of rawSoldItems) {
      if (!item) continue;
      const title = String(item.title || '').trim();
      const rawUrl = String(
        item.url || item.itemUrl || item.link || (item.itemId ? `${targetOrigin}/itm/${item.itemId}` : '')
      ).trim();
      const idMatch = rawUrl.match(/\/itm\/(\d{9,15})/);
      if (!title || !idMatch) continue;
      if (isEbayNoiseListing(title)) continue;

      const canonicalUrl = `${targetOrigin}/itm/${idMatch[1]}`;
      const rawCurrency = String(item.currency ?? item.soldCurrency ?? item.priceCurrency ?? '')
        .toUpperCase()
        .trim();
      const rawPriceStr = String(item.soldPrice ?? item.price ?? '');
      const itemPriceCorpus = `${rawCurrency} ${rawPriceStr} ${String(item.formattedPrice ?? '')}`.toUpperCase();

      let priceLocal = 0;
      if (rawCurrency === 'JPY' || /^[¥￥]|JPY\s*[\d,]+/.test(itemPriceCorpus)) {
        const jpyMatch = itemPriceCorpus.match(/(?:JPY|[¥￥])\s*([\d,]+)/);
        const jpyVal = jpyMatch ? Number(jpyMatch[1].replace(/,/g, '')) : parseLocalizedNumber(rawPriceStr, false);
        priceLocal = jpyVal > 0 ? Math.round((jpyVal / exchangeRateJpy) * 100) / 100 : 0;
      } else if (isEu) {
        const eurMatch =
          itemPriceCorpus.match(/(?:CA\.?\s*)?(?:EUR|€)\s*([\d.,]+)/i) ||
          itemPriceCorpus.match(/([\d.,]+)\s*(?:EUR|€)/i);
        priceLocal = eurMatch
          ? parseLocalizedNumber(eurMatch[1], true)
          : typeof item.soldPrice === 'number'
          ? item.soldPrice
          : typeof item.price === 'number'
          ? item.price
          : parseLocalizedNumber(rawPriceStr, true);
      } else {
        const isUsdOk =
          rawCurrency === '' || rawCurrency === 'USD' || rawCurrency === '$' || rawCurrency === 'US$';
        const hasForeignSymbol =
          itemPriceCorpus.includes('£') ||
          itemPriceCorpus.includes('€') ||
          /\b(GBP|EUR|CAD|AUD|CHF|SGD|CNY|KRW)\b/.test(itemPriceCorpus) ||
          /\b(C|AU|NZ|HK|S)\s*\$/.test(itemPriceCorpus);
        if (isUsdOk && !hasForeignSymbol) {
          priceLocal =
            typeof item.soldPrice === 'number'
              ? item.soldPrice
              : typeof item.price === 'number'
              ? item.price
              : parseLocalizedNumber(rawPriceStr, false);
        }
      }

      if (priceLocal <= 1) continue;
      const soldJpy = Math.round(priceLocal * exchangeRateJpy);

      // 全候補に対して厳格マッチング（先頭候補による横取りを防止）
      for (const spec of candidateSpecs) {
        const check = matchesCandidateTitleAndPrice(
          title,
          soldJpy,
          spec.enChar,
          spec.suffix,
          spec.rarityUpper,
          spec.cardNum,
          spec.domesticPriceJpy,
          true
        );
        if (!check.matched) continue;

        const list = groupedByIdx.get(spec.idx) || [];
        if (!list.some((x) => x.url === canonicalUrl)) {
          list.push({ priceLocal, url: canonicalUrl, title, isPsa10: check.isGraded });
          groupedByIdx.set(spec.idx, list);
        }
      }
    }
  }

  // Step 2: 個別成約が4銘柄未満だった場合、未マッチ候補をPlaywrightで直接eBay Soldから補完取得
  if (groupedByIdx.size < 4) {
    const unmatchedQueries = candidateSpecs
      .filter((s) => !groupedByIdx.has(s.idx) && Boolean(s.enChar || s.cardNum))
      .slice(0, 8)
      .map((s) => ({ idx: s.idx, query: s.query }));

    const fallbackRows = await fetchEbaySoldFallbackViaPlaywright(unmatchedQueries, isEu);

    for (const row of fallbackRows) {
      if (!row || !row.itemId || !row.title || !row.priceText) continue;
      if (isEbayNoiseListing(row.title)) continue;

      const pText = row.priceText.toUpperCase();
      // "100.00 to 200.00" のようなレンジ表記は除外
      if (/\bTO\b|\bBIS\b|～|~/.test(pText)) continue;

      let priceLocal = 0;
      const jpyMatch = pText.match(/(?:JPY|[¥￥])\s*([\d,]+)/);
      const eurMatch = pText.match(/(?:EUR|€)\s*([\d.,]+)|([\d.,]+)\s*(?:EUR|€)/);
      const usdMatch = pText.match(/(?:US\s*\$|USD|\$)\s*([\d,.]+)/);

      if (jpyMatch) {
        const jpyVal = Number(jpyMatch[1].replace(/,/g, '')) || 0;
        priceLocal = jpyVal > 0 ? Math.round((jpyVal / exchangeRateJpy) * 100) / 100 : 0;
      } else if (isEu && eurMatch) {
        priceLocal = parseLocalizedNumber(eurMatch[1] || eurMatch[2], true);
      } else if (!isEu && usdMatch && !/\b(C|AU|NZ|HK|S)\s*\$/.test(pText)) {
        priceLocal = parseLocalizedNumber(usdMatch[1], false);
      } else if (eurMatch) {
        const eurVal = parseLocalizedNumber(eurMatch[1] || eurMatch[2], true);
        priceLocal = isEu ? eurVal : Math.round(eurVal * 1.08 * 100) / 100;
      }

      if (priceLocal <= 1) continue;
      const soldJpy = Math.round(priceLocal * exchangeRateJpy);
      const canonicalUrl = `${targetOrigin}/itm/${row.itemId}`;

      const targetSpecs =
        row.candidateIdx >= 0 && row.candidateIdx < candidateSpecs.length
          ? [candidateSpecs[row.candidateIdx]]
          : candidateSpecs;

      for (const spec of targetSpecs) {
        const check = matchesCandidateTitleAndPrice(
          row.title,
          soldJpy,
          spec.enChar,
          spec.suffix,
          spec.rarityUpper,
          spec.cardNum,
          spec.domesticPriceJpy,
          true
        );
        if (!check.matched) continue;

        const list = groupedByIdx.get(spec.idx) || [];
        if (!list.some((x) => x.url === canonicalUrl)) {
          list.push({ priceLocal, url: canonicalUrl, title: row.title, isPsa10: check.isGraded });
          groupedByIdx.set(spec.idx, list);
        }
      }
    }
  }

  return candidates.map((c, idx) => {
    const soldList = groupedByIdx.get(idx);
    if (!soldList || soldList.length === 0) return c;

    const rawOnly = soldList.filter((s) => !s.isPsa10);
    const activePool = rawOnly.length >= 1 ? rawOnly : soldList;
    activePool.sort((a, b) => a.priceLocal - b.priceLocal);

    const mid = activePool[Math.floor(activePool.length / 2)];
    const priceJpy = Math.round(mid.priceLocal * exchangeRateJpy);
    const symbol = targetCurrency === 'EUR' ? '€' : '$';

    return {
      ...c,
      ebaySoldLocalText: `約¥${priceJpy.toLocaleString()} (${symbol}${mid.priceLocal.toFixed(2)})`,
      ebaySoldJpy: priceJpy,
      ebayCondition: mid.isPsa10 ? 'PSA 10' : 'Raw NM',
      ebayItemUrl: mid.url,
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
        if (currentPriceJpy < 500) continue;

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

        const numMatch = blockText.match(/\\b(\\d{2,3}\\/\\d{2,3}|(?:OP|ST|EB|PRB)\\d{2}-\\d{3}|\\d{1,3}\\/(?:SV-P|S-P|SM-P|XY-P))\\b/i);
        const cardNumber = numMatch ? numMatch[1] : '';

        const diffMatches = blockText.match(/([+＋][\\d,]+\\s*円|[+＋]?\\d+(?:\\.\\d+)?\\s*%|7日前\\s*[:：]\\s*[¥￥]?\\s*[\\d,]+円?)/g);
        const trendMetric = diffMatches ? Array.from(new Set(diffMatches)).join(' / ') : '週間高騰ランキング上位';

        if (seen.has(fullUrl)) continue;
        seen.add(fullUrl);

        results.push({
          sourceUrl: reqUrl,
          isAmountRanking: reqUrl.includes('rankingType=0'),
          cardName,
          cardNumber,
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
    // 上昇額ランキング（rankingType=0）を優先ソートし、高額・主力SARが先頭12件に必ず入るように整列
    rawItems.sort((a, b) => Number(Boolean(b?.isAmountRanking)) - Number(Boolean(a?.isAmountRanking)));

    const candidates: DomesticTrendCandidate[] = [];
    const seenUrls = new Set<string>();

    for (const item of rawItems) {
      if (!item || !item.cardName) continue;
      const cardName = String(item.cardName).trim();
      const cardNumber = item.cardNumber ? String(item.cardNumber).trim() : undefined;
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
        cardNumber,
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