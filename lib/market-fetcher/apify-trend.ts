// lib/market-fetcher/apify-trend.ts
import { extractAllPokemonNamesJa, extractPokemonNameEn } from './pokemon-dictionary';
import {
  EbayCardCondition,
  runApifySync,
  deduplicateEbayItems,
  parseEbaySoldPriceLocal,
  isNoiseCard,
  isClassicVintageCard,
  extractAllCardNumbers,
  extractCardNumber,
  isMultiCardSet,
  detectConditionGrade,
  inferConditionFromTitleFallback,
  fetchEbayOfficialConditions,
  normalizeEbayUrl,
} from './apify-arbitrage';

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

function resolveCharacterNameEn(jaText: string, category: string = 'pokemon'): string {
  const pokeEn = extractPokemonNameEn(jaText, category);
  if (pokeEn) return pokeEn;
  for (const [ja, en] of CHARACTER_EN_MAP) {
    if (jaText.includes(ja)) return en;
  }
  return '';
}

/**
 * eBayタイトルから日本語キャラクター名を抽出（pokemon-dictionary ＋ CHARACTER_EN_MAP 対応）
 */
function extractCharacterNamesJaFromEbayTitle(ebayTitle: string): string[] {
  const names = new Set<string>(extractAllPokemonNamesJa(ebayTitle));
  const upper = ebayTitle.toUpperCase();
  for (const [ja, en] of CHARACTER_EN_MAP) {
    const tokens = en.toUpperCase().split(/\s+/).filter(Boolean);
    if (tokens.length > 0 && tokens.every((t) => new RegExp(`\\b${t}\\b`).test(upper))) {
      names.add(ja);
    }
  }
  return Array.from(names);
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
  const enChar = resolveCharacterNameEn(baseJa, category);
  const suffix = extractMechanicSuffix(baseJa);
  const cardNum = extractCardNumber(`${cardNumber || ''} ${cardName}`) || '';

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

function isCardNumberMatched(ebayCardNum: string, candidateCardNum: string): boolean {
  const eUpper = ebayCardNum.toUpperCase();
  const cUpper = candidateCardNum.toUpperCase();
  if (/^\d{3}$/.test(cUpper)) {
    return eUpper === cUpper || eUpper.startsWith(`${cUpper}/`);
  }
  return eUpper === cUpper;
}

function getConditionPriorityScore(
  conditionGrade: string,
  officialCondition: EbayCardCondition | null
): number {
  if (officialCondition === 'Near mint or better') return 100;
  if (officialCondition === 'Lightly played (Excellent)') return 90;
  if (officialCondition === 'Moderately played (Very good)') return 80;
  if (/^PSA\s*10\b/i.test(conditionGrade)) return 50;
  return 40;
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
  if (!APIFY_TOKEN || !EBAY_TASK_ID || candidates.length === 0) {
    return candidates;
  }

  try {
    const targetCount = Math.min(candidates.length, 12);
    const targetCandidates = candidates.slice(0, targetCount);
    const isEu = region === 'eu';
    const ebayRegion: 'us' | 'eu' = isEu ? 'eu' : 'us';
    const targetEbaySite = isEu ? 'ebay.de' : 'ebay.com';
    const targetOrigin = isEu ? 'https://www.ebay.de' : 'https://www.ebay.com';
    const expectedCurrency: 'USD' | 'EUR' = isEu ? 'EUR' : 'USD';

    const candidateSpecs = targetCandidates.map((c, idx) => {
      const baseJa = c.cardName.replace(/[\(（].*?[\)）]/g, '').replace(/\[.*?\]/g, '').trim();
      const candCardNum = extractCardNumber(`${c.cardNumber || ''} ${c.cardName}`);
      const setBracketMatch = c.cardName.match(/\[([A-Za-z0-9+-]{2,})\]/);
      const isJpPromo =
        c.cardName.includes('プロモ') ||
        c.rarity.toUpperCase() === 'PROMO' ||
        /\/(?:[A-Z0-9]+-P|PPP|PLAY|T|P)\b/i.test(`${c.cardNumber || ''} ${c.cardName}`);

      return {
        idx,
        cardName: c.cardName,
        query: buildEnglishEbayQueryForTrend(c.cardName, c.rarity, category, c.cardNumber),
        enChar: resolveCharacterNameEn(baseJa, category),
        suffix: extractMechanicSuffix(baseJa),
        rarityUpper: (/^(SAR|AR|CSR|CHR|UR|HR|MUR|BWR|SR|SP|SEC|PROMO)$/i.test(c.rarity)
          ? c.rarity
          : ''
        ).toUpperCase(),
        cardNum: candCardNum,
        setCode: setBracketMatch ? setBracketMatch[1].toUpperCase() : null,
        isJpPromo,
      };
    });

    const uniqueKeywords = Array.from(new Set(candidateSpecs.map((q) => q.query).filter(Boolean)));
    if (uniqueKeywords.length === 0) return candidates;

    // 1. アービトラージと同じ runApifySync（Task ➔ 404時 Actor フォールバック）で取得
    const ebayItems = await runApifySync(EBAY_TASK_ID, APIFY_TOKEN, {
      ebaySite: targetEbaySite,
      keywords: uniqueKeywords,
      count: 20,
      exactMatch: false,
    });

    const uniqueEbayItems = deduplicateEbayItems(ebayItems);

    // 2. アービトラージと同一のノイズ・まとめ売り・クラシック期・通貨＆VATフィルタを適用
    const preFilteredEbay = uniqueEbayItems
      .map((item) => {
        const rawUrl = String(
          item.url ||
            item.itemUrl ||
            item.link ||
            (item.itemId ? `${targetOrigin}/itm/${item.itemId}` : '')
        ).trim();
        const soldLocal = parseEbaySoldPriceLocal(item, isEu);
        const title = String(item.title || '').trim();
        const baseGrade = detectConditionGrade(title);
        const isGraded = baseGrade !== 'Raw' && baseGrade !== 'Sealed Box';
        const isNoise = isNoiseCard(title);
        const allCardNumbers = extractAllCardNumbers(title, isGraded);
        const charNamesJa = extractCharacterNamesJaFromEbayTitle(title);
        const isSet = isMultiCardSet(title, allCardNumbers);
        const isClassicVintage = isClassicVintageCard(title, allCardNumbers);

        return {
          title,
          soldLocal,
          cardNumber: allCardNumbers[0] ?? null,
          charNamesJa,
          isSet,
          isNoise,
          isClassicVintage,
          baseGrade,
          ebayUrl: rawUrl,
        };
      })
      .filter((item) => {
        if (item.isNoise || item.isSet || item.isClassicVintage) return false;
        if (item.baseGrade === 'Sealed Box') return false;
        if (item.cardNumber === null || item.charNamesJa.length === 0) return false;
        if (item.soldLocal <= 0) return false;
        return true;
      });

    if (preFilteredEbay.length === 0) return candidates;

    // 3. 国内トレンド候補と「キャラ名 ＋ 型番」で照合（パックコード・プロモ加点ルール準拠）
    const matchedEntries: Array<{
      candidateIdx: number;
      title: string;
      soldLocal: number;
      cardNumber: string;
      baseGrade: string;
      ebayUrl: string;
    }> = [];

    for (const item of preFilteredEbay) {
      const titleUpper = item.title.toUpperCase();
      const isEbayPromo = /\bPROMO\b/.test(titleUpper);

      const numberMatchedSpecs = candidateSpecs.filter(
        (spec) =>
          spec.cardNum !== null &&
          isCardNumberMatched(item.cardNumber!, spec.cardNum) &&
          item.charNamesJa.some((ja) => spec.cardName.includes(ja))
      );

      let winningSpec = numberMatchedSpecs[0] ?? null;

      if (numberMatchedSpecs.length >= 2) {
        const scored = numberMatchedSpecs.map((spec) => {
          let score = 0;
          if (spec.setCode && titleUpper.includes(spec.setCode)) score += 10;
          if (isEbayPromo && spec.isJpPromo) score += 5;
          else if (isEbayPromo && !spec.isJpPromo) score -= 5;
          else if (!isEbayPromo && spec.isJpPromo) score -= 3;
          return { spec, score };
        });
        scored.sort((a, b) => b.score - a.score);
        winningSpec = scored[0].spec;
      }

      if (!winningSpec) {
        const itemSuffix = extractMechanicSuffix(item.title);
        const fallbackSpecs = candidateSpecs.filter((spec) => {
          if (spec.cardNum !== null) return false;
          if (!item.charNamesJa.some((ja) => spec.cardName.includes(ja))) return false;
          if (spec.suffix !== itemSuffix) return false;
          if (!matchesRarityInTitle(titleUpper, spec.rarityUpper)) return false;
          if (isEbayPromo !== spec.isJpPromo) return false;
          return true;
        });
        if (fallbackSpecs.length > 0) {
          winningSpec = fallbackSpecs[0];
        }
      }

      if (winningSpec) {
        matchedEntries.push({
          candidateIdx: winningSpec.idx,
          title: item.title,
          soldLocal: item.soldLocal,
          cardNumber: item.cardNumber!,
          baseGrade: item.baseGrade,
          ebayUrl: item.ebayUrl,
        });
      }
    }

    if (matchedEntries.length === 0) return candidates;

    // 4. 未鑑定品（Raw）の eBay 個別商品ページから公式 Card condition を一括取得（Heavily played は除外）
    const rawItemUrls = matchedEntries
      .filter((entry) => entry.baseGrade === 'Raw')
      .map((entry) => entry.ebayUrl);

    const officialConditionsMap = await fetchEbayOfficialConditions(rawItemUrls);

    const conditionVerifiedEntries = matchedEntries
      .map((entry) => {
        let officialCondition: EbayCardCondition | null = null;
        let conditionGrade = entry.baseGrade;

        if (entry.baseGrade === 'Raw') {
          officialCondition =
            officialConditionsMap[entry.ebayUrl] ||
            inferConditionFromTitleFallback(entry.title);
          conditionGrade = `Raw (${officialCondition})`;
        }

        return {
          ...entry,
          officialCondition,
          conditionGrade,
        };
      })
      .filter((entry) => entry.officialCondition !== 'Heavily played (Poor)');

    if (conditionVerifiedEntries.length === 0) return candidates;

    // 5. 「候補 × グレード（公式コンディション含む）」単位で合計・件数を集計し平均値を算出
    const groupedByCandidateAndGrade = new Map<
      number,
      Map<
        string,
        {
          cardNumber: string;
          conditionGrade: string;
          officialCondition: EbayCardCondition | null;
          totalLocal: number;
          count: number;
          ebayUrl: string;
        }
      >
    >();

    for (const entry of conditionVerifiedEntries) {
      let gradeMap = groupedByCandidateAndGrade.get(entry.candidateIdx);
      if (!gradeMap) {
        gradeMap = new Map();
        groupedByCandidateAndGrade.set(entry.candidateIdx, gradeMap);
      }

      const existing = gradeMap.get(entry.conditionGrade);
      if (existing) {
        existing.totalLocal += entry.soldLocal;
        existing.count += 1;
      } else {
        gradeMap.set(entry.conditionGrade, {
          cardNumber: entry.cardNumber,
          conditionGrade: entry.conditionGrade,
          officialCondition: entry.officialCondition,
          totalLocal: entry.soldLocal,
          count: 1,
          ebayUrl: entry.ebayUrl,
        });
      }
    }

    return candidates.map((c, idx) => {
      const gradeMap = groupedByCandidateAndGrade.get(idx);
      if (!gradeMap || gradeMap.size === 0) return c;

      const groups = Array.from(gradeMap.values()).sort((a, b) => {
        const prioDiff =
          getConditionPriorityScore(b.conditionGrade, b.officialCondition) -
          getConditionPriorityScore(a.conditionGrade, a.officialCondition);
        if (prioDiff !== 0) return prioDiff;
        return b.count - a.count;
      });

      const bestGroup = groups[0];
      const avgLocal = Math.round((bestGroup.totalLocal / bestGroup.count) * 100) / 100;
      const avgJpy = Math.round(avgLocal * exchangeRateJpy);
      const spec = candidateSpecs[idx];

      return {
        ...c,
        cardNumber: c.cardNumber || bestGroup.cardNumber,
        ebaySoldLocalText: `${expectedCurrency} ${avgLocal} (約¥${avgJpy.toLocaleString()})`,
        ebaySoldJpy: avgJpy,
        ebayCondition: bestGroup.conditionGrade,
        ebayItemUrl: normalizeEbayUrl(
          bestGroup.ebayUrl,
          bestGroup.cardNumber,
          ebayRegion,
          spec?.enChar
        ),
        ebaySoldCount: bestGroup.count,
      };
    });
  } catch (error) {
    console.error(`[Apify Trend eBay Enrich Error (${region})]:`, error);
    return candidates;
  }
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

        const numMatch = blockText.match(/\\b(\\d{2,3}\\/\\d{2,3}|(?:OP|ST|EB|PRB)\\d{2}-\\d{3}|\\d{1,3}\\/(?:[A-Z0-9]+-P|PPP|PLAY|T|P))\\b/i);
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