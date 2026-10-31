// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export interface TrendItem {
  cardName: string;
  condition: string;
  jpBuyPriceJPY: string;
  currentLocalPrice: string;
  impactLogic: string;
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

export async function runMarketTrend(
  region: 'us' | 'eu' | 'asia',
  category: string = 'pokemon'
): Promise<MarketTrendReport | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const cur = REGION_CURRENCIES[region] || REGION_CURRENCIES.us;

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.1,
    maxOutputTokens: 8192,
    apiKey,
  });

  const prompt = `あなたは【${cur.name}】のトレカ相場動向を分析する専任の市場トレンドアナリストです。
日本のトレカ市場（一次・二次流通）と現地市場（TCGPlayer, Cardmarket, eBay, 各国専門店）の価格差・需要変化を客観的に監視しています。

【分析任務】
今後2週間〜1ヶ月以内に【${cur.name}】で需要急増または価格高騰が予見される「先行トレンド仮説」を3〜5件立案し、それぞれの仮説に紐づく注目銘柄を特定してください。
仮説の切り口やテーマに特定の制約はありません。現在の市場データを観察して最も顕著に現れている変化を自由に捉えてください。

■ 厳格な論理整合性ルール（自律検証義務）:
1. 事実と論理の整合性（ハルシネーションの排除）:
   - 架空のカード名や型番は厳禁。実在するカード名・型番を明記すること。
   - 自ら立てた仮説の「高騰理由」と「カードの属性」が論理的に一致していること。
     * 大会・対戦需要を根拠にする場合：そのカードが現地公式大会で使用可能なレギュレーション準拠であること（大会使用不可のカードを対戦需要として扱わない）。
     * コレクション・希少性需要を根拠にする場合：キャラクター人気、イラストレーター、絶版などコレクター心理に基づいていること。
2. 客観的根拠（Signal）の言語化:
   - 単なる「人気」「注目」といった曖昧な形容詞で済ませず、「何が起きた／起きつつあるのか」という客観的な観測事実を signal に記述すること。
3. 状態の指定:
   - コンディションは商材の流通実態に合わせて以下から客観的に選定すること:
     ["Raw NM", "Raw LP", "PSA 10", "PSA 9", "BGS 9.5", "BGS 10", "CGC 10", "ARS 10", "Sealed Box", "Sealed Pack", "Sealed Promo"]
   - 仕入れ値（jpBuyPriceJPY）と現地見込売価（currentLocalPrice）の状態基準は必ず一致させること。

以下のJSON形式のみを出力してください:
{
  "title": "【${region.toUpperCase()}】市場トレンドインサイトレポート",
  "claim": "今週の${cur.name}先行トレンドと急騰予見銘柄",
  "summary": {
    "headline": "今週の市場全体の核心的トレンド（データから観察される核心を1行で記述）",
    "macroAnalysis": {
      "japanSourcingClimate": "日本国内の市場動向と調達環境分析",
      "localMarketDemand": "自国（現地）での最新需要動向とバイヤー・プレイヤーの関心"
    },
    "microAnalysis": {
      "topImportMarginCard": "仮説群の中で最も価格ギャップ・インパクトが大きい注目銘柄（下記hypothesesから引用）",
      "topLocalVelocityCard": "最も成約ペースが加速している高流動性銘柄（下記hypothesesから引用）",
      "conditionGradingInsight": "市場全体のコンディション需要（素体・鑑定品・未開封など）の傾向"
    },
    "riskAlert": {
      "sourcingQualityTrap": "仕入れ時の注意点（品質・偽物等）",
      "localInventoryRisk": "トレンド終息や価格反落のリスク要因"
    },
    "actionDirectives": [
      "短期的な調達・販売アクション",
      "中長期的な仕込みアクション"
    ]
  },
  "hypotheses": [
    {
      "headline": "トレンド仮説の見出し",
      "signal": "仮説の根拠となる客観的な観測事実",
      "timeframe": "価格へ反映される想定期間",
      "impactLogic": "なぜ日本版カードに需要が波及するのかの論理",
      "items": [
        {
          "cardName": "実在カード名 (型番/弾名)",
          "condition": "指定マスターから選定",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "約¥X,XXX (${cur.currency} XX)",
          "impactLogic": "この銘柄が選定された具体的な理由"
        }
      ]
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
  } catch (error) {
    console.error(`[MarketTrend] Failed to generate report for ${region}:`, error);
    return null;
  }
}