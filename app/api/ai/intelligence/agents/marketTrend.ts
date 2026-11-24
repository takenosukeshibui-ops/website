// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { parseAIJson, getCategoryName, getAgentRules } from '../helpers';
import {
  fetchDomesticTrendCandidates,
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

const REGION_CURRENCIES: Record<string, { currency: string; name: string }> = {
  us: { currency: 'USD', name: '北米（アメリカ）市場' },
  eu: { currency: 'EUR', name: '欧州（ヨーロッパ）市場' },
  asia: { currency: 'SGD', name: 'アジア（シンガポール・台湾・香港等）市場' },
};

let cachedDomesticTrends: { timestamp: number; category: string; items: DomesticTrendCandidate[] } | null = null;

async function getCachedDomesticTrends(category: string): Promise<DomesticTrendCandidate[]> {
  const now = Date.now();
  if (
    cachedDomesticTrends &&
    cachedDomesticTrends.category === category &&
    now - cachedDomesticTrends.timestamp < 60_000
  ) {
    return cachedDomesticTrends.items;
  }
  const items = await fetchDomesticTrendCandidates(category);
  cachedDomesticTrends = { timestamp: now, category, items };
  return items;
}

export async function runMarketTrend(
  region: 'us' | 'eu' | 'asia',
  category: string = 'pokemon'
): Promise<MarketTrendReport | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;
  const categoryName = getCategoryName(category);

  // 1. 「国内高騰ランキング(torechart.com)」「Supabase海外相場」「社内学習ルール」を並列取得
  const [domesticTrends, overseasContext, agentRules] = await Promise.all([
    getCachedDomesticTrends(category),
    (async () => {
      try {
        const supabase = await createClient();
        const targetRegion = region === 'asia' ? 'us' : region;
        const { data: prices } = await supabase
          .from('overseas_market_prices')
          .select('card_name, platform, condition_grade, sold_price_local, currency, sold_price_jpy, source_evidence_url')
          .eq('region', targetRegion)
          .order('created_at', { ascending: false })
          .limit(30);

        if (prices && prices.length > 0) {
          return prices
            .map(
              (p) =>
                `- ${p.card_name} [${p.platform}] (${p.condition_grade || 'Raw'}): ${p.sold_price_local} ${p.currency} (約¥${p.sold_price_jpy?.toLocaleString()})`
            )
            .join('\n');
        }
      } catch (dbErr) {
        console.warn('[MarketTrend] DB相場コンテキスト取得スキップ:', dbErr);
      }
      return '（最新海外成約相場データなし：国内高騰シグナルと市場知識ベースで推論）';
    })(),
    getAgentRules('trend'),
  ]);

  const hasDomesticData = domesticTrends.length > 0;
  const domesticContext = hasDomesticData
    ? domesticTrends
        .map(
          (d, idx) =>
            `[ID:${idx}] ${d.cardName} | 国内現在相場: ¥${d.currentPriceJpy.toLocaleString()} | 週間変動: ${d.trendMetric} | URL: ${d.detailUrl}`
        )
        .join('\n')
    : '（国内相場ランキング取得なし：海外直近データと市場知識ベースで推論）';

  const defaultPlatform =
    region === 'us'
      ? 'eBay US / TCGplayer'
      : region === 'eu'
      ? 'Cardmarket / eBay DE'
      : 'Shopee / Carousell / eBay';

  const ebayOrigin = region === 'eu' ? 'https://www.ebay.de' : 'https://www.ebay.com';

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  const prompt = `あなたは【${cur.name}】の【${categoryName}】相場動向を分析する専任の市場トレンドアナリストです。
「日本国内の一次・二次流通で先に価格高騰・取引急増が起き、1〜3週間遅れて海外市場へ買いが波及するタイムラグ」を捉え、今後【${cur.name}】で値上がりする可能性が高い注目銘柄を特定します。

【1. 日本国内の直近7日間 高騰ランキング実測データ（トレチャ torechart.com 取得）】
${domesticContext}

【2. 直近の現地プラットフォーム参考相場データ】
${overseasContext}
${agentRules ? `\n【3. 社内運用ルール・過去の学習知見】\n${agentRules}\n` : ''}

【分析任務】
上記の【日本国内の直近7日間 高騰ランキング実測データ】を先行シグナルとして参照し、今後2週間〜1ヶ月以内に【${cur.name}】で需要急増・価格追随高騰が予見される「先行トレンド仮説」を3〜4件立案し、各仮説に紐づく注目銘柄（1仮説あたり1〜3銘柄）を選定してください。

■ 厳格な論理整合性ルール（自律検証義務）
1. 実測データ準拠と捏造の完全禁止（最重要）:
   ${
     hasDomesticData
       ? '- **必ず【1. 日本国内の直近7日間 高騰ランキング実測データ】に記載されている実在カードのみから選出してください。リストに存在しないカード名や、記憶による型番（例: 000/000）を勝手に書き足すことは厳禁です。**\n   - `jpBuyPriceJPY` と `jpEvidenceUrl` には、上記リストの `国内現在相場` と `URL` を正確に転記してください。'
       : '- 架空のカード名・型番・日本語版に存在しない英語版限定仕様（Pokémon Center Stamped 等）を捏造しないでください。'
   }
2. コレクション枠への限定（全地域共通）:
   - 必ず【${categoryName}】のみを選定してください。
   - **北米・欧州・アジアの全地域共通で「SAR・AR・CSR・UR・HR・MUR・プロモ・人気キャラクター」などのコレクション需要カードのみに限定**してください。
   - グッズ・スタジアム・エネルギー・ACE SPEC・ノーマルRR等の「大会プレイ用デッキパーツ」や「公式大会メタ支配」を根拠にした選出は禁止です。
3. 旧裏・クラシック期カードの除外:
   - 「旧裏面・1996〜2006年発売のクラシック期カード」は対象外のため選出しないでください。
4. 先行指標の正しい評価:
   - 国内価格が海外現在相場より高くても（まだ海外に高騰が波及していない先行段階であっても）除外せず、「国内で先行高騰中・海外追随余地あり」として評価してください。
5. 状態の指定:
   - コンディションは ["Raw NM", "PSA 10", "PSA 9", "BGS 9.5", "CGC 10", "Sealed Box", "Sealed Promo"] から選定してください。

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}】市場トレンドインサイトレポート",
  "claim": "今週の${cur.name}先行トレンドと急騰予見銘柄（国内7日間高騰ランキング起点）",
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
          "jpEvidenceUrl": "リストのURLをそのまま転記",
          "currentLocalPrice": "約¥X,XXX (${cur.currency} XX)",
          "impactLogic": "この銘柄が選定された具体的な理由",
          "sourcePlatform": "${defaultPlatform}",
          "evidenceNote": "トレチャ7日間高騰ランキング基準"
        }
      ]
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    const parsed: MarketTrendReport | null = parseAIJson(res.content.toString());
    if (!parsed || !Array.isArray(parsed.hypotheses)) return parsed;

    // 国内実データとの照合 ＆ URL補完（リスト外の架空カード排除）
    for (const hyp of parsed.hypotheses) {
      if (!Array.isArray(hyp.items)) continue;
      const verifiedItems: TrendItem[] = [];

      for (const item of hyp.items) {
        const cleanBaseName = (item.cardName || '')
          .replace(/[\(（].*?[\)）]/g, '')
          .replace(/\[.*?\]/g, '')
          .trim();

        if (hasDomesticData) {
          const matchedDomestic = domesticTrends.find(
            (d) =>
              (item.jpEvidenceUrl && d.detailUrl === item.jpEvidenceUrl) ||
              (cleanBaseName && d.cardName.includes(cleanBaseName)) ||
              (cleanBaseName && cleanBaseName.includes(d.cardName.replace(/[\(（].*?[\)）]/g, '').trim()))
          );
          // 国内実データに存在しない架空カード・型番捏造は除外
          if (!matchedDomestic) continue;

          item.cardName = matchedDomestic.cardName;
          item.jpBuyPriceJPY = `¥${matchedDomestic.currentPriceJpy.toLocaleString()}`;
          item.jpEvidenceUrl = matchedDomestic.detailUrl;
        }

        if (!item.sourceEvidenceUrl || !item.sourceEvidenceUrl.startsWith('http')) {
          const kw = [cleanBaseName, category === 'onepiece' ? 'Japanese One Piece' : 'Japanese Pokemon']
            .filter(Boolean)
            .join(' ');
          item.sourceEvidenceUrl = `${ebayOrigin}/sch/i.html?_nkw=${encodeURIComponent(kw)}&LH_Sold=1&LH_Complete=1`;
        }

        verifiedItems.push(item);
      }

      hyp.items = verifiedItems;
    }

    parsed.hypotheses = parsed.hypotheses.filter((h) => Array.isArray(h.items) && h.items.length > 0);
    return parsed;
  } catch (error) {
    console.error(`[MarketTrend] Failed to generate report for ${region}:`, error);
    return null;
  }
}