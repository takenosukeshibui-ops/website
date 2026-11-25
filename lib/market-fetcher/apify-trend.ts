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

    console.log(
      '[TrendDebug] candidateSpecs:',
      candidateSpecs.map((s) => ({
        idx: s.idx,
        cardName: s.cardName,
        candCardNum: s.cardNum,
        enChar: s.enChar,
        query: s.query,
      }))
    );

    const uniqueKeywords = Array.from(
      new Set(candidateSpecs.map((q) => q.query).filter(Boolean))
    );
    if (uniqueKeywords.length === 0) return candidates;

    console.log('[TrendDebug] keywordsToSend:', uniqueKeywords);

    // 1. アービトラージと同じ runApifySync（Task ➔ 404時 Actor フォールバック）で取得
    const ebayItems = await runApifySync(EBAY_TASK_ID, APIFY_TOKEN, {
      ebaySite: targetEbaySite,
      keywords: uniqueKeywords,
      count: 20,
      exactMatch: false,
    });

    console.log(
      '[TrendDebug] ebayRawSample:',
      ebayItems.slice(0, 2).map((it) => ({
        title: it?.title,
        url: it?.url,
        itemUrl: it?.itemUrl,
        link: it?.link,
        itemId: it?.itemId,
      }))
    );

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

    console.log(
      '[TrendDebug] preFilteredEbay:',
      preFilteredEbay.map((it) => ({
        title: it.title,
        cardNumber: it.cardNumber,
        charNamesJa: it.charNamesJa,
        soldLocal: it.soldLocal,
        ebayUrl: it.ebayUrl,
      }))
    );

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

    console.log('[TrendDebug] matchedEntries:', matchedEntries);

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

    const enriched = candidates.map((c, idx) => {
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

    console.log(
      '[TrendDebug] finalEbayUrls:',
      enriched.slice(0, 12).map((c) => ({
        cardName: c.cardName,
        cardNumber: c.cardNumber,
        ebaySoldCount: c.ebaySoldCount,
        ebayItemUrl: c.ebayItemUrl,
      }))
    );

    return enriched;
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
  const rankingUrl = `https://torechart.com/${domainCategory}/priceup?dayType=7&rankingType=0`;

  const listPageFunction = `async function pageFunction(context) {
    const { page, request } = context;
    await page.waitForTimeout(500);

    return await page.evaluate(({ reqUrl, domainCat }) => {
      const scripts = Array.from(document.querySelectorAll('script'));
      let rows = [];

      for (const s of scripts) {
        const txt = s.textContent || '';
        if (!txt.includes('originalData')) continue;

        const keyIdx = txt.indexOf('originalData');
        const arrStart = txt.indexOf('[', keyIdx);
        if (arrStart === -1) continue;

        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let arrEnd = -1;

        for (let i = arrStart; i < txt.length; i++) {
          const ch = txt[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (ch === '\\\\') {
            escapeNext = true;
            continue;
          }
          if (ch === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (ch === '[') depth++;
            else if (ch === ']') {
              depth--;
              if (depth === 0) {
                arrEnd = i;
                break;
              }
            }
          }
        }

        if (arrEnd !== -1) {
          const arrStr = txt.slice(arrStart, arrEnd + 1);
          try {
            const parsed = new Function('return (' + arrStr + ')')();
            if (Array.isArray(parsed)) {
              rows = parsed;
              break;
            }
          } catch (err) {
            console.warn('[ApifyTrend] originalData 評価エラー:', err);
          }
        }
      }

      if (rows.length === 0) {
        console.warn('[ApifyTrend] rows が 0 件 | title:', document.title, '| url:', location.href);
      }

      return rows.map((r, i) => {
        const id = String(r.id || '').trim();
        const name = String(r.name || '').trim();
        const price = Number(r.price) || 0;
        const priceOld = Number(r.priceOld) || 0;
        const resultVal = Number(r.result) || 0;
        const rarity = r.rarity_name && r.rarity_name !== 'なし' ? String(r.rarity_name).trim() : '';
        const diffSign = resultVal > 0 ? '+' : '';
        const trendMetric = resultVal !== 0
          ? \`\${diffSign}\${resultVal.toLocaleString()}円 (7日前: ¥\${priceOld.toLocaleString()})\`
          : '週間高騰ランキング上位';

        return {
          rank: i + 1,
          id,
          cardName: name,
          rarity,
          currentPriceJpy: price,
          trendMetric,
          detailUrl: id ? \`https://torechart.com/\${domainCat}/detail?cardid=\${encodeURIComponent(id)}\` : reqUrl,
        };
      });
    }, { reqUrl: request.url, domainCat: '${domainCategory}' });
  }`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 95_000);

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~playwright-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90&memory=1024`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: rankingUrl }],
          pageFunction: listPageFunction,
          waitUntil: 'domcontentloaded',
          proxyConfiguration: { useApifyProxy: true },
          maxRequestsPerCrawl: 1,
          maxConcurrency: 1,
          maxRequestRetries: 0,
          requestHandlerTimeoutSecs: 45,
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
    console.log(
      '[TrendDebug] torechart rawItems count:',
      Array.isArray(rawItems) ? rawItems.length : typeof rawItems
    );

    const filteredCandidates: Array<DomesticTrendCandidate & { cardId: string }> = [];
    const seenUrls = new Set<string>();

    let skipPriceOrUrl = 0;
    let skipDup = 0;
    let skipClassic = 0;
    let skipPlayable = 0;
    let skipRarity = 0;

    for (const item of rawItems) {
      if (!item || !item.cardName) continue;
      const cardId = String(item.id || '').trim();
      const cardName = String(item.cardName).trim();
      const rarity = String(item.rarity || '').trim();
      const price = Number(item.currentPriceJpy) || 0;
      const detailUrl = String(item.detailUrl || '');

      if (price <= 0 || !detailUrl) {
        skipPriceOrUrl++;
        continue;
      }
      if (seenUrls.has(detailUrl)) {
        skipDup++;
        continue;
      }
      if (isClassicVintageTitle(cardName)) {
        skipClassic++;
        continue;
      }
      if (isPlayableNonCollectible(cardName)) {
        skipPlayable++;
        continue;
      }
      if (!isCollectibleRarity(rarity, cardName, price)) {
        skipRarity++;
        continue;
      }

      seenUrls.add(detailUrl);

      const displayName =
        rarity && !cardName.toUpperCase().includes(rarity.toUpperCase())
          ? `${cardName} (${rarity})`
          : cardName;

      filteredCandidates.push({
        cardId,
        cardName: displayName,
        cardNumber: undefined,
        rarity: rarity || 'コレクション枠',
        currentPriceJpy: price,
        trendMetric: String(item.trendMetric || '週間高騰ランキング上位'),
        detailUrl,
        sourceSite: 'トレチャ (torechart.com)',
      });

      if (filteredCandidates.length >= 12) break;
    }

    console.log('[TrendDebug] filteredCandidates count:', filteredCandidates.length);
    if (filteredCandidates.length === 0) return [];

    // 絞り込んだ上位候補（最大12件）の詳細ページから「カード型番」を取得
    const detailTargets = filteredCandidates.filter((c) => Boolean(c.cardId));
    if (detailTargets.length > 0) {
      const detailPageFunction = `async function pageFunction(context) {
        const { $, request } = context;
        let cardNumber = '';

        $('dl.cardstatuslist dt').each((_, dtEl) => {
          const label = $(dtEl).text().replace(/\\s+/g, '').trim();
          if (label.includes('カード型番') || label.includes('型番')) {
            const val = $(dtEl).next('dd').text().replace(/\\s+/g, ' ').trim();
            if (val && val !== '-' && val !== 'なし') {
              cardNumber = val;
            }
          }
        });

        return {
          url: request.url,
          cardNumber,
        };
      }`;

      const detailRows = await runApifySync('apify/cheerio-scraper', APIFY_TOKEN, {
        startUrls: detailTargets.map((c) => ({ url: c.detailUrl })),
        pageFunction: detailPageFunction,
        proxyConfiguration: { useApifyProxy: true },
        maxRequestsPerCrawl: detailTargets.length,
        maxConcurrency: 10,
        maxRequestRetries: 1,
        requestHandlerTimeoutSecs: 15,
        ignoreSslErrors: true,
      });

      const cardNumByUrl = new Map<string, string>();
      for (const row of detailRows) {
        if (row && row.url && row.cardNumber) {
          cardNumByUrl.set(String(row.url), String(row.cardNumber).trim());
        }
      }

      for (const cand of filteredCandidates) {
        const fetchedNum = cardNumByUrl.get(cand.detailUrl);
        if (fetchedNum) {
          cand.cardNumber = fetchedNum;
        }
      }
    }

    console.log(
      '[TrendDebug] detailCardNumbers:',
      filteredCandidates.map((c) => ({
        cardId: c.cardId,
        cardName: c.cardName,
        cardNumber: c.cardNumber,
        detailUrl: c.detailUrl,
      }))
    );

    return filteredCandidates.map(({ cardId: _cardId, ...rest }) => rest);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[ApifyTrend] torechart.com 取得が95秒でタイムアウトしたためスキップしました');
    } else {
      console.warn('[ApifyTrend] 国内トレンドスクレイピングエラー:', err);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}