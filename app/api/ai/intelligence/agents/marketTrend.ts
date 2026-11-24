// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { parseAIJson, getCategoryName, getAgentRules } from '../helpers';
import {
  fetchDomesticTrendCandidates,
  enrichTrendCandidatesWithEbaySold,
  buildEnglishEbayQueryForTrend,
  DomesticTrendCandidate,
} from '@/lib/market-fetcher/apify-trend';

export interface TrendItem {
  cardName: string;
  condition: string;
  jpBuyPriceJPY: string;
  jpEvidenceUrl?: string;
  currentLocalPrice: string;
  impactLogic: string;
  sourcePlatform?: string;
  evidenceNote?: string;
  sourceEvidenceUrl?: string;
}

export interface TrendHypothesis {
  headline: string;
  signal: string;
  timeframe: string;
  impactLogic: string;
  items: TrendItem[];
}

export interface MarketTrendReport {
  title: string;
  claim: string;
  summary: {
    headline: string;
    macroAnalysis: {
      japanSourcingClimate: string;
      localMarketDemand: string;
    };
    microAnalysis: {
      topImportMarginCard: string;
      topLocalVelocityCard: string;
      conditionGradingInsight: string;
    };
    riskAlert: {
      sourcingQualityTrap: string;
      localInventoryRisk: string;
    };
    actionDirectives: string[];
  };
  hypotheses: TrendHypothesis[];
}

const REGION_CURRENCIES: Record<string, { currency: string; name: string; defaultRate: number }> = {
  us: { currency: 'USD', name: '北米（アメリカ）市場', defaultRate: 155 },
  eu: { currency: 'EUR', name: '欧州（ヨーロッパ）市場', defaultRate: 165 },
  asia: { currency: 'USD', name: 'アジア（シンガポール・台湾・香港等）市場', defaultRate: 155 },
};

let cachedDomesticTrends: { timestamp: number; category: string; items: DomesticTrendCandidate[] } | null = null;

async function getCachedDomesticTrends(category: string): Promise<DomesticTrendCandidate[]> {
  const now = Date.now();
  if (
    cachedDomesticTrends &&
    cachedDomesticTrends.category === category &&
    now - cachedDomesticTrends.timestamp < 60_000 &&
    cachedDomesticTrends.items.length > 0
  ) {
    return cachedDomesticTrends.items;
  }
  const items = await fetchDomesticTrendCandidates(category);
  if (items.length > 0) {
    cachedDomesticTrends = { timestamp: now, category, items };
  }
  return items;
}

async function getRealtimeRate(currency: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.JPY) return Number(data.rates.JPY);
    }
  } catch {}
  return fallback;
}

export async function runMarketTrend(
  region: 'us' | 'eu' | 'asia',
  category: string = 'pokemon'
): Promise<MarketTrendReport | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;
  const categoryName = getCategoryName(category);

  // 1. 「国内高騰ランキング(torechart.com)」「為替レート」「社内学習ルール」を並列取得
  const [rawDomesticTrends, exchangeRate, agentRules] = await Promise.all([
    getCachedDomesticTrends(category),
    getRealtimeRate(cur.currency, cur.defaultRate),
    getAgentRules('trend'),
  ]);

  // AIの記憶だけでのカード生成を完全禁止
  if (!rawDomesticTrends || rawDomesticTrends.length === 0) {
    console.warn(`[MarketTrend] ${region.toUpperCase()}: 国内実測データ(torechart.com)が0件のため生成を中止しました`);
    return null;
  }

  // 2. トレチャ上位銘柄のeBay直近実成約価格と個別 /itm/ URLを取得
  const domesticTrends = await enrichTrendCandidatesWithEbaySold(
    rawDomesticTrends,
    region,
    category,
    exchangeRate
  );

  const domesticContext = domesticTrends
    .map((d, idx) => {
      const ebayInfo = d.ebaySoldLocalText
        ? `eBay実成約現在相場: ${d.ebaySoldLocalText} (${d.ebayCondition} / 直近成約${d.ebaySoldCount}件) | eBay成約URL: ${d.ebayItemUrl}`
        : `eBay直近成約: まだ海外流通少（国内先行高騰フェーズ）`;
      return `[ID:${idx}] ${d.cardName} | 国内現在相場: ¥${d.currentPriceJpy.toLocaleString()} | 週間変動: ${d.trendMetric} | ${ebayInfo} | 国内URL: ${d.detailUrl}`;
    })
    .join('\n');

  const defaultPlatform =
    region === 'us'
      ? 'eBay US'
      : region === 'eu'
      ? 'eBay DE'
      : 'eBay Global';

  const ebayOrigin = region === 'eu' ? 'https://www.ebay.de' : 'https://www.ebay.com';

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  const prompt = `あなたは【${cur.name}】の【${categoryName}】相場動向を分析する専任の市場トレンドアナリストです。
「日本国内の一次・二次流通で先に価格高騰・取引急増が起き、1〜3週間遅れて海外市場へ買いが波及するタイムラグ」を捉え、今後【${cur.name}】で値上がりする可能性が高い注目銘柄を特定します。

【1. 日本国内7日間高騰ランキング（トレチャ） ＆ eBay直近実成約照合データ】
${domesticContext}
${agentRules ? `\n【2. 社内運用ルール・過去の学習知見】\n${agentRules}\n` : ''}

【分析任務】
上記の【実測データ】を先行シグナルとして参照し、今後2週間〜1ヶ月以内に【${cur.name}】で需要急増・価格追随高騰が予見される「先行トレンド仮説」を3〜4件立案し、各仮説に紐づく注目銘柄（1仮説あたり1〜3銘柄）を選定してください。

■ 厳格な論理整合性ルール（自律検証義務）
1. 実測データ準拠と記憶ベース生成の完全禁止（最重要）:
   - **必ず上記リストに記載されている実在カードのみから選出してください。リストに存在しないカード名や、記憶による型番を勝手に書き足すことは厳禁です。**
   - eBay実成約現在相場が記載されている銘柄を優先して選出し、その数値をそのまま反映してください。
2. コレクション枠への限定（全地域共通）:
   - 必ず【${categoryName}】のみを選定してください。
   - **北米・欧州・アジアの全地域共通で「SAR・AR・CSR・UR・HR・MUR・プロモ・人気キャラクター」などのコレクション需要カードのみに限定**してください。
   - グッズ・スタジアム・エネルギー・ACE SPEC・ノーマルRR等の「大会プレイ用デッキパーツ」や「公式大会メタ支配」を根拠にした選出は禁止です。
3. 旧裏・クラシック期カードの除外:
   - 「旧裏面・1996〜2006年発売のクラシック期カード」は対象外のため選出しないでください。
4. 先行指標の正しい評価:
   - 国内価格が海外現在相場より高くても（まだ海外に高騰が波及していない先行段階であっても）除外せず、「国内で先行高騰中・海外追随余地あり」として評価してください。

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}】市場トレンドインサイトレポート",
  "claim": "今週の${cur.name}先行トレンドと急騰予見銘柄（国内7日間高騰ランキング×eBay実成約照合）",
  "summary": {
    "headline": "今週の市場全体の核心的トレンド（国内の先行高騰と海外波及の核心を1行で記述）",
    "macroAnalysis": {
      "japanSourcingClimate": "日本国内の7日間高騰ランキングから見える仕入れ・相場動向",
      "localMarketDemand": "${cur.name}でのコレクター需要・価格追随動向"
    },
    "microAnalysis": {
      "topImportMarginCard": "仮説群の中で最も上昇余地・インパクトが大きい注目銘柄",
      "topLocalVelocityCard": "国内の上昇額・変動率が最も強い初動銘柄",
      "conditionGradingInsight": "素体（Raw NM）と鑑定品（PSA 10）の需要傾向"
    },
    "riskAlert": {
      "sourcingQualityTrap": "国内高騰局面での高値掴み・検品上の注意点",
      "localInventoryRisk": "トレンド一巡後の反落リスク要因"
    },
    "actionDirectives": [
      "短期的な先行仕込みアクション",
      "中長期的な出品・価格設定アクション"
    ]
  },
  "hypotheses": [
    {
      "headline": "トレンド仮説の見出し",
      "signal": "国内相場データから観測された客観的シグナル（上昇額・変動率・7日前比較等）",
      "timeframe": "海外相場へ波及する想定期間（例: 2週間〜1ヶ月）",
      "impactLogic": "なぜ日本国内の高騰が海外市場に波及するのかの論理",
      "items": [
        {
          "cardName": "リストのカード名をそのまま転記",
          "condition": "Raw NM",
          "jpBuyPriceJPY": "¥X,XXX",
          "jpEvidenceUrl": "リストの国内URLをそのまま転記",
          "currentLocalPrice": "リストのeBay実成約現在相場をそのまま転記",
          "impactLogic": "この銘柄が選定された具体的な理由",
          "sourcePlatform": "${defaultPlatform}",
          "evidenceNote": "トレチャ7日間高騰ランキング × eBay実成約照合"
        }
      ]
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed: MarketTrendReport | null = parseAIJson(res.content.toString());
    if (!parsed || !Array.isArray(parsed.hypotheses)) return null;

    // 国内実データ ＆ eBay実成約データとの厳格照合・確定バインド
    for (const hyp of parsed.hypotheses) {
      if (!Array.isArray(hyp.items)) continue;
      const verifiedItems: TrendItem[] = [];

      for (const item of hyp.items) {
        const cleanBaseName = (item.cardName || '')
          .replace(/[\(（].*?[\)）]/g, '')
          .replace(/\[.*?\]/g, '')
          .trim();

        const matchedDomestic = domesticTrends.find(
          (d) =>
            (item.jpEvidenceUrl && d.detailUrl === item.jpEvidenceUrl) ||
            (cleanBaseName && d.cardName.includes(cleanBaseName)) ||
            (cleanBaseName && cleanBaseName.includes(d.cardName.replace(/[\(（].*?[\)）]/g, '').trim()))
        );

        if (!matchedDomestic) continue;

        item.cardName = matchedDomestic.cardName;
        item.jpBuyPriceJPY = `¥${matchedDomestic.currentPriceJpy.toLocaleString()}`;
        item.jpEvidenceUrl = matchedDomestic.detailUrl;

        // eBay実成約が取れている場合は価格・状態・個別 /itm/ URLを確定上書き
        if (matchedDomestic.ebaySoldLocalText && matchedDomestic.ebayItemUrl) {
          item.currentLocalPrice = matchedDomestic.ebaySoldLocalText;
          item.condition = matchedDomestic.ebayCondition || item.condition || 'Raw NM';
          item.sourceEvidenceUrl = matchedDomestic.ebayItemUrl;
        } else {
          // eBay成約0件の場合は、英語化した検索クエリで成約済み一覧URLを生成
          const enQuery = buildEnglishEbayQueryForTrend(
            matchedDomestic.cardName,
            matchedDomestic.rarity,
            category
          );
          item.sourceEvidenceUrl = `${ebayOrigin}/sch/i.html?_nkw=${encodeURIComponent(enQuery)}&LH_Sold=1&LH_Complete=1&_sop=13`;
          if (!item.currentLocalPrice || item.currentLocalPrice === '$0') {
            item.currentLocalPrice = '海外直近成約なし（国内先行高騰中）';
          }
        }

        verifiedItems.push(item);
      }

      hyp.items = verifiedItems;
    }

    parsed.hypotheses = parsed.hypotheses.filter((h) => Array.isArray(h.items) && h.items.length > 0);
    if (parsed.hypotheses.length === 0) return null;

    return parsed;
  } catch (error) {
    console.error(`[MarketTrend] Failed to generate report for ${region}:`, error);
    return null;
  }
}