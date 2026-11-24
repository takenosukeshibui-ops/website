// lib/market-fetcher/apify-arbitrage.ts
import { extractAllPokemonNamesJa } from './pokemon-dictionary';
export const maxDuration = 300;

export interface VerifiedArbitrageCandidate {
  cardName: string;
  cardNumber: string;
  conditionGrade: string;
  jpBuyPriceJPY: number;
  jpShopName: string;
  currency: 'USD' | 'EUR';
  ebaySoldForeign: number;
  ebaySoldJpy: number;
  netProceedsJpy: number;
  priceSpreadJPY: number;
  spreadROI: number;
  liquidity: string;
  pokecazillaUrl: string;
  ebayUrl: string;
}

type EbayCardCondition =
  | 'Near mint or better'
  | 'Lightly played (Excellent)'
  | 'Moderately played (Very good)'
  | 'Heavily played (Poor)';

const APIFY_TOKEN = (process.env.APIFY_API_TOKEN || '').trim();

const EBAY_TASK_ID = (
  process.env.APIFY_EBAY_TASK_ID || 'caffein.dev/ebay-sold-listings'
).trim();

const POKECAZILLA_TASK_ID = (
  process.env.APIFY_POKEMON_TASK_ID ||
  process.env.APIFY_POKECAZILLA_TASK_ID ||
  'kempt_tapestry_mg3/pokemon-price-search'
).trim();

interface DayLocalPriceRange {
  minLocal?: number;
  maxLocal?: number;
  minSpreadJpy: number;
}

/**
 * 曜日（targetDay）の仕入れ目安レンジをそのまま eBay 検索用の現地通貨（USD / EUR）価格帯に換算する
 */
function getLocalPriceRangeForDay(targetDay: string, exchangeRateJpy: number): DayLocalPriceRange {
  switch (targetDay) {
    case 'Monday': // 〜3,000円
      return {
        minLocal: undefined,
        maxLocal: Math.round(3000 / exchangeRateJpy),
        minSpreadJpy: 500,
      };
    case 'Tuesday': // 3,000円〜10,000円
    case 'Sunday':  // 3,000円〜10,000円
      return {
        minLocal: Math.round(3001 / exchangeRateJpy),
        maxLocal: Math.round(10000 / exchangeRateJpy),
        minSpreadJpy: 800,
      };
    case 'Wednesday': // 10,000円〜30,000円
    case 'Saturday':  // 10,000円〜30,000円
      return {
        minLocal: Math.round(10001 / exchangeRateJpy),
        maxLocal: Math.round(30000 / exchangeRateJpy),
        minSpreadJpy: 2000,
      };
    case 'Thursday': // 30,000円〜80,000円
      return {
        minLocal: Math.round(30001 / exchangeRateJpy),
        maxLocal: Math.round(80000 / exchangeRateJpy),
        minSpreadJpy: 6000,
      };
    case 'Friday': // 80,000円〜
      return {
        minLocal: Math.round(80001 / exchangeRateJpy),
        maxLocal: undefined,
        minSpreadJpy: 8000,
      };
    default:
      console.warn(`[Apify] 不正な曜日指定です: ${targetDay}`);
      return {
        minLocal: 999999,
        maxLocal: 999999,
        minSpreadJpy: 999999,
      };
  }
}

/**
 * Apify API v2 同期実行ヘルパー
 */
async function runApifySync(
  rawId: string,
  token: string,
  bodyPayload: Record<string, any>,
  actorFallbackPayload?: Record<string, any>
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
    return await taskRes.json();
  }

  if (taskRes.status === 404) {
    const actorUrl = `https://api.apify.com/v2/acts/${apiPathId}/run-sync-get-dataset-items?token=${token}`;
    const actorRes = await fetch(actorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actorFallbackPayload || bodyPayload),
      cache: 'no-store',
    });

    if (actorRes.ok) {
      return await actorRes.json();
    }

    throw new Error(`Apify API Error (${rawId}): ${actorRes.status} ${actorRes.statusText}`);
  }

  throw new Error(`Apify Task API Error (${rawId}): ${taskRes.status} ${taskRes.statusText}`);
}

/**
 * eBayタイトルからトレカ型番をすべて抽出する
 */
/**
 * カスタム品・ジャンボカード・カードダス等の対象外アイテムを除外する
 */
function isNoiseCard(title: string): boolean {
  return /\b(CUSTOM|PARODY|PROXY|ORICA|FAN\s*ART|REPLICA|FAKE|FÄLSCHUNG|GEFÄLSCHT|KOPIE|NACHDRUCK|JUMBO|OVERSIZED|STICKER|AUFKLEBER|SEALS?|CARDDASS|SEALDASS|TOPSUN|CHINESES?|CHINESISCH|KOREAN|KOREANISCH|THAI|INDONESIAN)\b/i.test(
    title
  );
}

/**
 * eBayタイトルからトレカ型番をすべて抽出する
 */
export function extractAllCardNumbers(title: string, isGraded: boolean = false): string[] {
  const results = new Set<string>();

  // 2桁〜3桁の通常型番に対応（例: 096/071, 15/080, 025/165）
  const slashMatches = title.match(/\b\d{2,3}\/\d{2,3}\b/g);
  if (slashMatches) slashMatches.forEach((m) => results.add(m));

  // 1桁〜3桁のプロモ型番に対応（例: 001/SV-P, 28/SM-P, 005/T, 001/PPP, 001/P, 010/PLAY）
  const promoMatches = title.match(/\b\d{1,3}\/(?:[A-Z0-9]+-P|PPP|PLAY|T|P)\b/gi);
  if (promoMatches) promoMatches.forEach((m) => results.add(m.toUpperCase()));

  // スラッシュ省略プロモ表記（例: 098 XY-P -> 098/XY-P）
  const spacedPromoMatches = title.match(/\b(\d{1,3})\s+(SV|S|SM|XY|BW|L|DP|PCG|ADV)-P\b/gi);
  if (spacedPromoMatches) {
    spacedPromoMatches.forEach((m) => {
      const match = m.trim().match(/^(\d{1,3})\s+([A-Z]+-P)$/i);
      if (match) results.add(`${match[1]}/${match[2].toUpperCase()}`);
    });
  }

  // ハイフン省略プロモ表記（例: #107PCGP -> 107/PCG-P）
  const compactPromoMatches = title.match(/#?(\d{1,3})(SV|S|SM|XY|BW|L|DP|PCG|ADV)P\b/gi);
  if (compactPromoMatches) {
    compactPromoMatches.forEach((m) => {
      const cleaned = m.replace(/^#/, '').toUpperCase();
      const match = cleaned.match(/^(\d{1,3})([A-Z]+)P$/);
      if (match) results.add(`${match[1]}/${match[2]}-P`);
    });
  }

  const hyphenMatches = title.match(/\b[A-Z]{2,4}\d{2}-\d{3}\b/gi);
  if (hyphenMatches) hyphenMatches.forEach((m) => results.add(m.toUpperCase()));

  // 鑑定品でスラッシュ型番が取れなかった場合のみ、PSAラベルの #001 表記（3桁）を救出
  if (results.size === 0 && isGraded) {
    const hashMatches = title.match(/#(\d{3})\b/g);
    if (hashMatches) {
      hashMatches.forEach((m) => results.add(m.replace('#', '')));
    }
  }

  return Array.from(results);
}

export function extractCardNumber(title: string): string | null {
  const all = extractAllCardNumbers(title, false);
  return all.length > 0 ? all[0] : null;
}

function isMultiCardSet(title: string, cardNumbers: string[]): boolean {
  const upper = title.toUpperCase();

  // 複数枚セット・まとめ売りを示すキーワード（単なるパック名末尾の "Clay Burst Set" 等は通す）
  const setPatterns = [
    /\bSET\s+OF\s+\d+\b/,
    /\b\d+\s*CARDS?\s*SET\b/,
    /\b(COMPLETE|FULL|ALL|MASTER|AR|CHR|SAR|SR|UR|CSR|EEVEE|EEVEELUTION)\s+SET\b/,
    /\b\d+\s*CARDS?\b/,
    /\b(LOT|BUNDLE|COMBO|PAIR|PLAYSET)\b/,
    /\b\d+\s*(PCS|PIECES|SHEETS)\b/,
    /\bX\s*[2-9]\b/,
    /\b[2-9]\s*X\b/,
    /\b([2-9]|10)\s*枚\b/,
    /セット/,
    /\bNO\.?\s*\d{3}\s+\d{3}\b/,
  ];

  if (setPatterns.some((pat) => pat.test(upper))) {
    return true;
  }

  // タイトル内に異なる型番が2つ以上含まれている場合（例: 037/040 & 044/040）
  if (cardNumbers.length >= 2) {
    return true;
  }

  return false;
}

/**
 * タイトルから状態グレードを推定（鑑定品・未開封のすり抜けを完全防止）
 */
function detectConditionGrade(title: string): string {
  const upper = title.toUpperCase();
  const modifier = '(?:(?:PRISTINE|GEM\\s*MINT|MINT|GRADED|BLACK\\s*LABEL|GOLD\\s*LABEL)\\s+)*';

  const psaMatch = upper.match(new RegExp(`\\bPSA\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (psaMatch) return `PSA ${psaMatch[1]}`;

  const bgsMatch = upper.match(new RegExp(`\\bBGS\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (bgsMatch) return `BGS ${bgsMatch[1]}`;

  const cgcMatch = upper.match(new RegExp(`\\bCGC\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (cgcMatch) return `CGC ${cgcMatch[1]}`;

  const arsMatch = upper.match(new RegExp(`\\bARS\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (arsMatch) return `ARS ${arsMatch[1]}`;

  const tagMatch = upper.match(new RegExp(`\\bTAG\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (tagMatch) return `TAG ${tagMatch[1]}`;

  const aceMatch = upper.match(new RegExp(`\\bACE\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (aceMatch) return `ACE ${aceMatch[1]}`;

  const pgMatch = upper.match(new RegExp(`\\bPG\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (pgMatch) return `PG ${pgMatch[1]}`;

  const pgsMatch = upper.match(new RegExp(`\\bPGS\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (pgsMatch) return `PGS ${pgsMatch[1]}`;

  const caMatch = upper.match(new RegExp(`\\bCA\\s*${modifier}(\\d+(?:\\.\\d+)?)\\b`));
  if (caMatch) return `CA ${caMatch[1]}`;

  if (/\b(PSA|BGS|CGC|ARS|TAG|ACE|PG|PGS|GRADED|SLAB|GEM\s*MINT)\b/.test(upper)) {
    return 'Graded';
  }

  if (/\b(SEALED|BOOSTER\s*BOX|PACK)\b/.test(upper)) {
    return 'Sealed Box';
  }

  return 'Raw';
}

/**
 * eBay商品ページから公式Card conditionが取得できなかった場合のタイトル補助判定
 */
function inferConditionFromTitleFallback(title: string): EbayCardCondition {
  const upper = title.toUpperCase();
  if (/\b(POOR|HEAVILY\s*PLAYED|DMG|DAMAGED)\b|\bHP\b(?!\s*\d)/.test(upper)) {
    return 'Heavily played (Poor)';
  }
  if (/\b(MODERATELY\s*PLAYED|VERY\s*GOOD|PLAYED|FAIR|B-)\b|\bMP\b/.test(upper)) {
    return 'Moderately played (Very good)';
  }
  if (/\b(LIGHTLY\s*PLAYED|EXCELLENT|EXC|VG)\b|\bLP\b/.test(upper)) {
    return 'Lightly played (Excellent)';
  }
  return 'Near mint or better';
}

/**
 * 未鑑定品のeBay個別商品ページから公式の Card condition を一括取得する
 */
async function fetchEbayOfficialConditions(urls: string[]) {
  const conditionMap: { [url: string]: EbayCardCondition } = {};
  const uniqueUrls = urls.filter(
    (u, index, self) => Boolean(u) && u.startsWith('http') && self.indexOf(u) === index
  );
  if (uniqueUrls.length === 0) return conditionMap;

  const pageFunction = `async function pageFunction(context) {
    const { $, request } = context;
    const condAreaText = [
      $('.x-item-condition-text').text(),
      $('.ux-labels-values--condition').text(),
      $('[data-testid="x-item-condition"]').text(),
      $('#vi-itm-cond').text(),
    ].join(' ').replace(/\\s+/g, ' ').trim();

    const corpus = condAreaText || $('body').text().replace(/\\s+/g, ' ').slice(0, 12000);
    let officialCondition = '';

    if (/Heavily\\s*played(?:\\s*\\(Poor\\))?|Stark\\s*bespielt|Akzeptabel/i.test(corpus)) {
      officialCondition = 'Heavily played (Poor)';
    } else if (/Moderately\\s*played(?:\\s*\\(Very\\s*good\\))?|Mäßig\\s*bespielt|Sehr\\s*gut/i.test(corpus)) {
      officialCondition = 'Moderately played (Very good)';
    } else if (/Lightly\\s*played(?:\\s*\\(Excellent\\))?|Leicht\\s*bespielt|Exzellent/i.test(corpus)) {
      officialCondition = 'Lightly played (Excellent)';
    } else if (/Near\\s*mint\\s*or\\s*better|Nahezu\\s*neuwertig(?:\\s*oder\\s*besser)?/i.test(corpus)) {
      officialCondition = 'Near mint or better';
    }

    return {
      url: request.url,
      officialCondition,
    };
  }`;

  try {
    const items = await runApifySync('apify/cheerio-scraper', APIFY_TOKEN, {
      startUrls: uniqueUrls.map((url) => ({ url })),
      pageFunction,
      proxyConfiguration: { useApifyProxy: true },
      maxRequestsPerCrawl: uniqueUrls.length,
      maxConcurrency: 25,
      maxRequestRetries: 1,
      requestHandlerTimeoutSecs: 15,
      ignoreSslErrors: true,
    });

    for (const row of items) {
      if (row && row.url && row.officialCondition) {
        conditionMap[String(row.url)] = row.officialCondition as EbayCardCondition;
      }
    }
  } catch (err) {
    console.warn('[Apify] eBay公式コンディション取得をスキップし、タイトル判定にフォールバックします:', err);
  }

  return conditionMap;
}

/**
 * ポケカジラURLの正規化（相対パス補完・404防止）
 */
function normalizePokecazillaUrl(rawUrl: string | undefined, fallbackSearchUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallbackSearchUrl;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('https://pokecazilla.com/') || trimmed.startsWith('http://pokecazilla.com/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://pokecazilla.com${trimmed}`;
  }
  return fallbackSearchUrl;
}

/**
 * eBay URLの正規化（対象地域に合わせて ebay.com / ebay.de に統一）
 */
function normalizeEbayUrl(
  rawUrl: string | undefined,
  cardNumber: string,
  region: 'us' | 'eu',
  pokemonNameEn?: string
): string {
  const targetOrigin = region === 'eu' ? 'https://www.ebay.de' : 'https://www.ebay.com';
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
    return rawUrl
      .trim()
      .replace(/^https?:\/\/(www\.)?ebay\.(com|co\.uk|de|fr|it|es|ca|com\.au)/i, targetOrigin);
  }
  const kw = [pokemonNameEn, cardNumber, 'Japanese Pokemon'].filter(Boolean).join(' ');
  return `${targetOrigin}/sch/i.html?_nkw=${encodeURIComponent(kw)}&LH_Sold=1&LH_Complete=1`;
}

/**
 * Apify 2段階スクレイピングを実行し、「ポケモン名 ＋ 型番」一致・状態◎最安値の実売サヤ取り候補を返す
 */
export async function fetchRealArbitrageCandidates(
  category: string = 'pokemon',
  exchangeRateJpy: number = 155,
  targetDay: string = 'Thursday',
  region: 'us' | 'eu' = 'us'
): Promise<VerifiedArbitrageCandidate[]> {
  if (!APIFY_TOKEN) {
    console.warn('[Apify] APIFY_API_TOKEN が未設定のため、実データ取得をスキップします');
    return [];
  }

  try {
    const isEu = region === 'eu';
    const targetEbaySite = isEu ? 'ebay.de' : 'ebay.com';
    const expectedCurrency: 'USD' | 'EUR' = isEu ? 'EUR' : 'USD';
    const priceRange = getLocalPriceRangeForDay(targetDay, exchangeRateJpy);

    const ebayKeywords =
      category === 'onepiece'
        ? isEu
          ? [
              'Japanese One Piece Card',
              'Japanisch One Piece Karte',
              'Japanese One Piece Promo',
              'Japanese One Piece PSA',
              'Japanese One Piece Manga',
              'Japanese One Piece Alt Art',
            ]
          : [
              'Japanese One Piece Card',
              'Japanese One Piece Promo',
              'Japanese One Piece PSA',
              'Japanese One Piece Manga',
              'Japanese One Piece Parallel',
              'Japanese One Piece Alt Art',
            ]
        : category === 'yugioh'
        ? isEu
          ? [
              'Japanese Yugioh Card',
              'Japanisch Yugioh Karte',
              'Japanese Yugioh Promo',
              'Japanese Yugioh PSA',
              'Japanese Yugioh 20th',
              'Japanese Yugioh 25th',
            ]
          : [
              'Japanese Yugioh Card',
              'Japanese Yugioh Promo',
              'Japanese Yugioh PSA',
              'Japanese Yugioh 20th',
              'Japanese Yugioh 25th',
              'Japanese Yugioh Ultimate',
            ]
        : isEu
        ? [
            'Japanese Pokemon Card',
            'Japanische Pokemon Karte',
            'Japanese Pokemon Promo',
            'Japanese Pokemon PSA',
            'Pokemon Japanische PSA',
            'Japanese Pokemon XY',
          ]
        : [
            'Japanese Pokemon Card',
            'Japanese Pokemon Promo',
            'Japanese Pokemon PSA',
            'Japanese Pokemon Old Back',
            'Japanese Pokemon Vintage',
            'Japanese Pokemon XY',
          ];

    const ebayTaskPayload: Record<string, any> = {
      ebaySite: targetEbaySite,
      keywords: ebayKeywords,
      count: 20,
      exactMatch: false,
    };
    if (priceRange.minLocal !== undefined) {
      ebayTaskPayload.minPrice = priceRange.minLocal;
    }
    if (priceRange.maxLocal !== undefined) {
      ebayTaskPayload.maxPrice = priceRange.maxLocal;
    }

    // 1. eBay Sold Listings を地域サイト＆曜日価格帯指定で同期実行
    const ebayItems = await runApifySync(
      EBAY_TASK_ID,
      APIFY_TOKEN,
      ebayTaskPayload
    );

    // 複数キーワードでヒットした同一出品（同じ itemId）を重複排除
    const uniqueEbayItems: any[] = [];
    const seenItemIds = new Set<string>();
    for (const item of ebayItems) {
      if (!item) continue;
      const rawUrl = String(item.url || item.itemUrl || '');
      const urlIdMatch = rawUrl.match(/\/itm\/(\d+)/);
      const itemId = String(item.itemId || (urlIdMatch ? urlIdMatch[1] : rawUrl)).trim();
      if (itemId) {
        if (seenItemIds.has(itemId)) continue;
        seenItemIds.add(itemId);
      }
      uniqueEbayItems.push(item);
    }

    // EU加盟国リスト（ドイツ語・英語表記：これ以外の国からの出品にはebay.de上で19%輸入VATが加算される）
    const euMemberCountries = new Set([
      'DEUTSCHLAND', 'GERMANY',
      'FRANKREICH', 'FRANCE',
      'ITALIEN', 'ITALY',
      'SPANIEN', 'SPAIN',
      'NIEDERLANDE', 'NETHERLANDS',
      'BELGIEN', 'BELGIUM',
      'ÖSTERREICH', 'OESTERREICH', 'AUSTRIA',
      'POLEN', 'POLAND',
      'SCHWEDEN', 'SWEDEN',
      'FINNLAND', 'FINLAND',
      'DÄNEMARK', 'DAENEMARK', 'DENMARK',
      'IRLAND', 'IRELAND',
      'PORTUGAL',
      'GRIECHENLAND', 'GREECE',
      'TSCHECHIEN', 'TSCHECHISCHE REPUBLIK', 'CZECH REPUBLIC', 'CZECHIA',
      'UNGARN', 'HUNGARY',
      'RUMÄNIEN', 'RUMAENIEN', 'ROMANIA',
      'BULGARIEN', 'BULGARIA',
      'KROATIEN', 'CROATIA',
      'SLOWAKEI', 'SLOVAKIA',
      'SLOWENIEN', 'SLOVENIA',
      'LITAUEN', 'LITHUANIA',
      'LETTLAND', 'LATVIA',
      'ESTLAND', 'ESTONIA',
      'LUXEMBURG', 'LUXEMBOURG',
      'MALTA',
      'ZYPERN', 'CYPRUS',
    ]);

    // 2. 対象通貨（USならUSD / EUならEUR）かつ「ポケモン名＋型番」が特定できた成約のみ抽出
    const preFilteredEbay = uniqueEbayItems
      .map((item) => {
        const rawCurrency = String(
          item.currency ?? item.soldCurrency ?? item.priceCurrency ?? ''
        )
          .toUpperCase()
          .trim();
        const rawPriceStr = String(item.soldPrice ?? item.price ?? '');
        const rawUrl = String(item.url || item.itemUrl || '');
        const itemPriceCorpus = `${rawCurrency} ${rawPriceStr} ${String(
          item.formattedPrice ?? item.priceText ?? ''
        )}`.toUpperCase();

        const parseLocalizedNumber = (val: unknown): number => {
          if (typeof val === 'number') return val;
          const cleaned = String(val || '').replace(/[^\d.,]/g, '').trim();
          if (!cleaned) return 0;

          const lastComma = cleaned.lastIndexOf(',');
          const lastDot = cleaned.lastIndexOf('.');

          if (lastComma !== -1 && lastDot !== -1) {
            // 欧州式 (1.250,99) vs 米国式 (1,250.99)
            return lastComma > lastDot
              ? Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0
              : Number(cleaned.replace(/,/g, '')) || 0;
          }
          if (lastComma !== -1) {
            const decimals = cleaned.length - lastComma - 1;
            return decimals === 2
              ? Number(cleaned.replace(',', '.')) || 0
              : Number(cleaned.replace(/,/g, '')) || 0;
          }
          if (lastDot !== -1 && isEu && cleaned.length - lastDot - 1 === 3) {
            return Number(cleaned.replace(/\./g, '')) || 0;
          }
          return Number(cleaned) || 0;
        };

        let soldLocal = 0;

        if (isEu) {
          // 「Ca. EUR 37,05」「EUR 19,99」「19,99 €」などEUR表記が含まれていればそのユーロ額を優先抽出
          const eurExplicitMatch =
            itemPriceCorpus.match(/(?:CA\.?\s*)?(?:EUR|€)\s*([\d.,]+)/i) ||
            itemPriceCorpus.match(/([\d.,]+)\s*(?:EUR|€)/i);

          if (eurExplicitMatch) {
            soldLocal = parseLocalizedNumber(eurExplicitMatch[1]);
          } else {
            // EUR明記がない場合（GBP単独など）は除外せずそのままの数値を採用
            soldLocal =
              typeof item.soldPrice === 'number'
                ? item.soldPrice
                : typeof item.price === 'number'
                ? item.price
                : parseLocalizedNumber(rawPriceStr);
          }

          // EU加盟国以外（イギリス・日本・米国等）からの150EUR以下出品はebay.de一覧で19%の輸入VATが上乗せされるため控除
          const locUpper = String(item.itemLocation || '').toUpperCase().trim();
          const isNonEuSeller = locUpper !== '' && !euMemberCountries.has(locUpper);
          if (isNonEuSeller && soldLocal > 0 && soldLocal <= 180) {
            soldLocal = Math.round((soldLocal / 1.19) * 100) / 100;
          }
        } else {
          // 北米（US）は従来通り USD のみ許可
          const isUsdMismatch =
            (rawCurrency !== '' && rawCurrency !== expectedCurrency) ||
            itemPriceCorpus.includes('£') ||
            itemPriceCorpus.includes('€') ||
            /\b(GBP|EUR|CAD|AUD|JPY|CHF|SGD|NZD|HKD|MXN|CNY|KRW)\b/.test(itemPriceCorpus) ||
            /\b(C|AU|NZ|HK|S)\s*\$/.test(itemPriceCorpus) ||
            /ebay\.(co\.uk|de|fr|it|es|ca|com\.au|com\.sg|com\.hk)/i.test(rawUrl);

          if (!isUsdMismatch) {
            soldLocal =
              typeof item.soldPrice === 'number'
                ? item.soldPrice
                : typeof item.price === 'number'
                ? item.price
                : parseLocalizedNumber(rawPriceStr);
          }
        }

      
        const title = String(item.title || '');
        const baseGrade = detectConditionGrade(title);
        const isGraded = baseGrade !== 'Raw' && baseGrade !== 'Sealed Box';
        const isNoise = isNoiseCard(title);
        const allCardNumbers = extractAllCardNumbers(title, isGraded);
        const allPokemonNamesJa = extractAllPokemonNamesJa(title);
        const isSet = isMultiCardSet(title, allCardNumbers);
        return {
          title,
          soldLocal,
          soldJpy: Math.round(soldLocal * exchangeRateJpy),
          cardNumber: allCardNumbers[0] ?? null,
          pokemonNameJa: allPokemonNamesJa[0] ?? null,
          isSet,
          isNoise,
          baseGrade,
          ebayUrl: rawUrl,
        };
      })
      .filter((item) => {
        if (item.isNoise || item.isSet) return false;
        if (item.cardNumber === null || item.pokemonNameJa === null) return false;
        if (item.soldLocal <= 0) return false;
        if (priceRange.minLocal !== undefined && item.soldLocal < priceRange.minLocal) return false;
        if (priceRange.maxLocal !== undefined && item.soldLocal > priceRange.maxLocal) return false;
        return true;
      });

    if (preFilteredEbay.length === 0) return [];

    // 3. ポケカジラ検索用の startUrls を重複なし生成（コンディション取得と並列実行するため先に作成）
    const categoryId = category === 'onepiece' ? 18 : 17;
    const domainPath = category === 'onepiece' ? 'onepiece' : 'pokemon';
    const uniqueQueries = Array.from(
      new Set(preFilteredEbay.map((i) => `${i.pokemonNameJa!} ${i.cardNumber!}`))
    );

    const startUrls = uniqueQueries.map((q) => ({
      url: `https://pokecazilla.com/${domainPath}/products/list?category_id=${categoryId}&name=${encodeURIComponent(q)}`,
    }));

    const rawItemUrls = preFilteredEbay
      .filter((item) => item.baseGrade === 'Raw')
      .map((item) => item.ebayUrl);

    // 2.5 & 4. 「eBay公式コンディション取得」と「ポケカジラ検索」を並列実行して大幅時短
    const [officialConditionsMap, jpResults] = await Promise.all([
      fetchEbayOfficialConditions(rawItemUrls),
      runApifySync(POKECAZILLA_TASK_ID, APIFY_TOKEN, {
        startUrls,
        maxConcurrency: 25,
        maxRequestRetries: 1,
        requestHandlerTimeoutSecs: 15,
      }),
    ]);

    const parsedEbay = preFilteredEbay
      .map((item) => {
        let officialCondition: EbayCardCondition | null = null;
        let displayGrade = item.baseGrade;

        if (item.baseGrade === 'Raw') {
          officialCondition =
            officialConditionsMap[item.ebayUrl] ||
            inferConditionFromTitleFallback(item.title);
          displayGrade = `Raw (${officialCondition})`;
        }

        return {
          ...item,
          officialCondition,
          conditionGrade: displayGrade,
        };
      })
      .filter((item) => item.officialCondition !== 'Heavily played (Poor)');

    if (parsedEbay.length === 0) return [];

    // 同じ「ポケモン名 ＋ 型番 ＋ グレード（公式コンディション含む）」ごとに集計
    const groupedByKey = new Map<
      string,
      {
        cardNumber: string;
        pokemonNameJa: string;
        conditionGrade: string;
        officialCondition: EbayCardCondition | null;
        totalLocal: number;
        count: number;
        ebayUrl: string;
        sampleTitle: string;
      }
    >();

    for (const item of parsedEbay) {
      const key = `${item.pokemonNameJa}_${item.cardNumber}_${item.conditionGrade}`;
      const existing = groupedByKey.get(key);
      if (existing) {
        existing.totalLocal += item.soldLocal;
        existing.count += 1;
      } else {
        groupedByKey.set(key, {
          cardNumber: item.cardNumber!,
          pokemonNameJa: item.pokemonNameJa!,
          conditionGrade: item.conditionGrade,
          officialCondition: item.officialCondition,
          totalLocal: item.soldLocal,
          count: 1,
          ebayUrl: item.ebayUrl,
          sampleTitle: item.title,
        });
      }
    }

    const jpCandidatesMap = new Map<
      string,
      Array<{
        name: string;
        mintPrice: number | null;
        mintShopName: string;
        goodPrice: number | null;
        goodShopName: string;
        playedPrice: number | null;
        playedShopName: string;
        detailUrl: string;
      }>
    >();

    for (const row of jpResults) {
      if (!row || row['#error']) continue;

      const searchUrl = String(row.searchUrl || '');
      const numMatch = searchUrl.match(/name=([^&]+)/);
      const rawQuery = numMatch ? decodeURIComponent(numMatch[1]) : '';
      // スラッシュあり型番だけでなく、末尾の3桁数字（例: "レックウザ 122" -> "122"）も正しく抽出
      const queriedNum =
        extractCardNumber(rawQuery) || rawQuery.trim().split(/\s+/).pop() || rawQuery;
      if (!queriedNum) continue;

      if (row.isDetailResult) {
        const mintPrice =
          typeof row.mintMinPrice === 'number' && row.mintMinPrice > 0
            ? Number(row.mintMinPrice)
            : null;
        const goodPrice =
          typeof row.goodMinPrice === 'number' && row.goodMinPrice > 0
            ? Number(row.goodMinPrice)
            : null;
        const playedPrice =
          typeof row.playedMinPrice === 'number' && row.playedMinPrice > 0
            ? Number(row.playedMinPrice)
            : null;

        if (mintPrice === null && goodPrice === null && playedPrice === null) {
          continue; // 全状態ランクで在庫がない場合のみスキップ
        }

        const cardCode = String(row.cardCode || '');
        if (cardCode) {
          // 3桁数字のみ（例: "083"）で照合する際、分母が一致する別カード（例: "010/083"）の誤爆を防止
          const isThreeDigitOnly = /^\d{3}$/.test(queriedNum);
          const isCodeMatch = isThreeDigitOnly
            ? cardCode === queriedNum || cardCode.startsWith(`${queriedNum}/`)
            : cardCode.includes(queriedNum);
          if (!isCodeMatch) continue;
        }

        const list = jpCandidatesMap.get(queriedNum) || [];
        list.push({
          name: String(row.name || queriedNum),
          mintPrice,
          mintShopName: String(row.mintShopName || 'ポケカジラ'),
          goodPrice,
          goodShopName: String(row.goodShopName || 'ポケカジラ'),
          playedPrice,
          playedShopName: String(row.playedShopName || 'ポケカジラ'),
          detailUrl: normalizePokecazillaUrl(row.detailUrl, searchUrl),
        });
        jpCandidatesMap.set(queriedNum, list);
      }
    }

    // 5. eBay公式コンディションに対応するポケカジラの状態ランク最安値と突合
    const verifiedList: VerifiedArbitrageCandidate[] = [];

    for (const [, ebayGroup] of groupedByKey.entries()) {
      const jpCards = jpCandidatesMap.get(ebayGroup.cardNumber);
      if (!jpCards || jpCards.length === 0) continue;

      const nameMatchedCards = jpCards.filter((c) => c.name.includes(ebayGroup.pokemonNameJa));
      if (nameMatchedCards.length === 0) continue;

      let matchedJpCard = nameMatchedCards[0];
      if (nameMatchedCards.length >= 2) {
        const titleUpper = ebayGroup.sampleTitle.toUpperCase();
        const isEbayPromo = /\bPROMO\b/.test(titleUpper);

        const scored = nameMatchedCards.map((card) => {
          let score = 0;
          // パック・シリーズコード一致加点（例: [WCS23], [XY7], [sv8a]）
          const setBracketMatch = card.name.match(/\[([A-Za-z0-9+-]{2,})\]/);
          if (setBracketMatch) {
            const setCode = setBracketMatch[1].toUpperCase();
            if (titleUpper.includes(setCode)) {
              score += 10;
            }
          }
          // プロモ表記の一致・矛盾判定
          const isJpPromo =
            card.name.includes('プロモ') ||
            /\/(?:[A-Z0-9]+-P|PPP|PLAY|T|P)\b/i.test(card.name);
          if (isEbayPromo && isJpPromo) score += 5;
          else if (isEbayPromo && !isJpPromo) score -= 5;
          else if (!isEbayPromo && isJpPromo) score -= 3;

          return { card, score };
        });

        scored.sort((a, b) => b.score - a.score);
        matchedJpCard = scored[0].card;
      }

      let buyPrice: number | null = null;
      let shopLabel = '';
      const isGradedOrSealed = ebayGroup.officialCondition === null;

      if (isGradedOrSealed) {
        // 鑑定品・未開封は状態◎（Mint）在庫がある場合のみ採用（状態○への妥協を廃止）
        if (matchedJpCard.mintPrice !== null) {
          buyPrice = matchedJpCard.mintPrice;
          shopLabel = `状態◎最安 (${matchedJpCard.mintShopName})`;
        }
      } else if (ebayGroup.officialCondition === 'Moderately played (Very good)') {
        // Very good ➔ 状態△・B・C・傷有り最安を優先（なければ状態○/A-）
        if (matchedJpCard.playedPrice !== null) {
          buyPrice = matchedJpCard.playedPrice;
          shopLabel = `状態△/B最安 (${matchedJpCard.playedShopName})`;
        } else if (matchedJpCard.goodPrice !== null) {
          buyPrice = matchedJpCard.goodPrice;
          shopLabel = `状態○/A-最安 (${matchedJpCard.goodShopName})`;
        }
      } else if (ebayGroup.officialCondition === 'Lightly played (Excellent)') {
        // Excellent ➔ 状態○/A-最安を優先（なければ状態◎）
        if (matchedJpCard.goodPrice !== null) {
          buyPrice = matchedJpCard.goodPrice;
          shopLabel = `状態○/A-最安 (${matchedJpCard.goodShopName})`;
        } else if (matchedJpCard.mintPrice !== null) {
          buyPrice = matchedJpCard.mintPrice;
          shopLabel = `状態◎最安 (${matchedJpCard.mintShopName})`;
        }
      } else {
        // 未鑑定 Near mint or better ➔ 状態◎最安を優先（なければ状態○/A-）
        if (matchedJpCard.mintPrice !== null) {
          buyPrice = matchedJpCard.mintPrice;
          shopLabel = `状態◎最安 (${matchedJpCard.mintShopName})`;
        } else if (matchedJpCard.goodPrice !== null) {
          buyPrice = matchedJpCard.goodPrice;
          shopLabel = `状態○/A-最安 (${matchedJpCard.goodShopName})`;
        }
      }

      if (buyPrice === null || buyPrice <= 0) continue;

      const avgLocal = Math.round((ebayGroup.totalLocal / ebayGroup.count) * 100) / 100;
      const avgJpy = Math.round(avgLocal * exchangeRateJpy);
      const spreadJpy = avgJpy - buyPrice;
      const roi = buyPrice > 0 ? Math.round((spreadJpy / buyPrice) * 100) : 0;

      if (spreadJpy >= priceRange.minSpreadJpy && roi >= 15) {
        verifiedList.push({
          cardName: matchedJpCard.name,
          cardNumber: ebayGroup.cardNumber,
          conditionGrade: ebayGroup.conditionGrade,
          jpBuyPriceJPY: buyPrice,
          jpShopName: shopLabel,
          currency: expectedCurrency,
          ebaySoldForeign: avgLocal,
          ebaySoldJpy: avgJpy,
          netProceedsJpy: avgJpy,
          priceSpreadJPY: spreadJpy,
          spreadROI: roi,
          liquidity: `直近成約 ${ebayGroup.count}件`,
          pokecazillaUrl: matchedJpCard.detailUrl,
          ebayUrl: normalizeEbayUrl(ebayGroup.ebayUrl, ebayGroup.cardNumber, region),
        });
      }
    }

    return verifiedList.sort((a, b) => b.priceSpreadJPY - a.priceSpreadJPY);
  } catch (error) {
    console.error(`[Apify Arbitrage Fetch Error (${region})]:`, error);
    return [];
  }
}