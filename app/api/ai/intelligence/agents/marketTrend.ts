// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';
import { MarketTrendReport } from '@/app/AiDashboard/types';

export async function runMarketTrend(
  region: 'us' | 'eu' | 'asia' = 'us',
  _category: string = 'pokemon'
): Promise<MarketTrendReport | null> {
  const rules = await getAgentRules('trend');

  const regionContexts = {
    us: {
      name: '北米市場（アメリカ・カナダ）',
      currency: 'USD',
      targets: 'eBay USA, TCGPlayer, Reddit (r/pkmntcgcollections / r/PokeInvesting), YouTube/TikTokコレクターコミュニティ',
      coreDemand: '英語版の印刷・裁断不良（初期傷・白欠け）に伴う日本語版美品（PSA10候補）需要、日本限定プロモ、特定イラストレーター（作家買い）、象徴的エースポケモンの最高レア（SAR）鑑賞需要'
    },
    eu: {
      name: '欧州市場（イギリス・ドイツ・フランス等）',
      currency: 'EUR',
      targets: 'Cardmarket (EU), eBay UK/DE, 欧州ハイエンドコレクターコミュニティ',
      coreDemand: 'Cardmarketでの流通在庫枯渇、初期クラシック・ヴィンテージ（旧裏〜XY）、言語版差異プレミアム、鑑定品（PSA10）需要'
    },
    asia: {
      name: 'アジア市場（台湾・香港・韓国・東南アジア）',
      currency: 'USD/HKD',
      targets: 'Shopee, 現地旗艦店相場, アジア圏トレカ投資コミュニティ',
      coreDemand: '女性サポートSR/SAR、ピカチュウ・御三家限定プロモ、ハイレアリティ美術アート、日本国内とリアルタイム連動する投機資金流入'
    }
  };

  const cur = regionContexts[region];
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 8192,
  });

  const formattedCreatedAt = new Date().toLocaleString('ja-JP', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const prompt = `あなたは【${cur.name}】で日本語版ポケモンカードを輸入・販売する現地カードショップ事業者専属の「市場トレンドアナリスト」です。
対象通貨: ${cur.currency}。
監視ソース: ${cur.targets}
現地顧客の核心需要: ${cur.coreDemand}
${rules}

【リサーチ任務】
海外市場で本格的な価格高騰・在庫蒸発が起きる前の先行シグナルを検知し、現在日本国内で安値調達可能で、現地で大きなプレミアムが見込める日本語版カードを発掘してください。

【⚠️ 最重要：日本語版カードの需要特性と禁止事項】
1. 欧米公式大会（Play! Pokémon）における【プレイ専用カードの選出厳禁】:
   - 欧米の公式大会では、裏面デザインの違いおよび言語ルールにより【日本語版カードの使用は全面禁止】です。
   - したがって、「大会メタで流行しているから」という理由で、日本語版の【ノーマルカード、汎用グッズ、ACE SPEC、低レアリティパーツ】を選出することは【完全禁止】とします（現地で売れず不良在庫化するため）。
2. 海外バイヤーが日本語版を輸入する「真の購入動機」に集中すること:
   - ①【日本限定性・希少性】: ジムプロモ、ポケセン限定、BOX購入特典、絶版シングル
   - ②【アート・作家買い】: 特定人気イラストレーター（Tomokazu Komiya, sowsow, Yuka Morii 等）の作品、AR/CHR/SARの美術評価
   - ③【印刷品質・PSA鑑定需要】: 海外版は初期傷が多いため、印刷・センタリングが極めて優秀な「日本語版のRaw NM / PSA10」を求めるコレクター需要
   - ④【象徴ポケモンのフラッグシップ】: 大会環境を象徴するエースポケモンであっても、選出はコレクション対象となる【最高レアリティ（SAR / UR）のみ】に限定（記念品・バインダー鑑賞需要）。

【仮説と銘柄の構成ルール】
1. トレンド仮説（親）は【最大3本（2〜3本）】を多角的に抽出:
   - 大会関連ばかりに偏ることを固く禁じます。「アート・作家買いの初動」「日本限定プロモの供給枯渇」「新弾発表に伴う過去弾SARの再評価」など、異なる領域から波を捉えてください。
2. 各仮説にぶら下げる波及銘柄（子）は【上位5銘柄（Rank 1〜5）】を抽出:
   - Rank 1: トレンド直撃の最本命カード（主役・フラッグシップ）
   - Rank 2〜3: 連動して動く主力コレクション
   - Rank 4〜5: 派生効果で化ける過去弾カードや先行大穴
3. 価格予測のノイズ排除:
   - ピーク予想価格や成長率（%）は出力せず、「🇯🇵 日本調達原価」と「${cur.currency} 現地現在相場」の確定値のみを出力すること。

以下の厳格なJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要）:
{
  "title": "${formattedCreatedAt} 【${region.toUpperCase()}】市場トレンド先行シグナルレポート",
  "claim": "今週の${cur.name}における急騰先行シグナルと波及銘柄ポートフォリオ",
  "createdAt": "${formattedCreatedAt}",
  "hypotheses": [
    {
      "headline": "🔥 [トレンド核心タイトル] （例: 海外SNSでの特定作家買いバズ / 日本限定プロモの海外流通枯渇 など）",
      "signal": "【兆候・事実】 なぜその波が起きているかの証拠（海外コミュニティ、成約急増、市場データなど）",
      "timeframe": "⏳ ピーク想定: 【短期/中期/中長期】〇週間後",
      "items": [
        {
          "rankLabel": "Rank 1 (最本命)",
          "cardName": "実在カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "High",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "売り時目安（例: 【短期】約2週間後）",
          "exitStrategy": "推奨出口戦略（例: 店頭ショーケース展示 / EC即出し / PSA鑑定出し）",
          "impactLogic": "なぜこのカードが海外で跳ねるのか。海外版との差異や現地コレクター心理の根拠"
        },
        {
          "rankLabel": "Rank 2 (高連動)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "High",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "売り時目安",
          "exitStrategy": "推奨出口戦略",
          "impactLogic": "波及ロジック"
        },
        {
          "rankLabel": "Rank 3 (実売主力)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "Mid",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "売り時目安",
          "exitStrategy": "推奨出口戦略",
          "impactLogic": "波及ロジック"
        },
        {
          "rankLabel": "Rank 4 (派生注目)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "Mid",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "売り時目安",
          "exitStrategy": "推奨出口戦略",
          "impactLogic": "波及ロジック"
        },
        {
          "rankLabel": "Rank 5 (先行大穴)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "PSA10",
          "conviction": "Speculative",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "売り時目安",
          "exitStrategy": "推奨出口戦略",
          "impactLogic": "波及ロジック"
        }
      ]
    }
  ]
}`;

  try {
    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
  } catch (e) {
    console.error(`Market trend analysis failed for ${region}:`, e);
    return null;
  }
}