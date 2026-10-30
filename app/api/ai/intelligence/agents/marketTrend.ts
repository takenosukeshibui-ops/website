// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';
import { MarketTrendReport } from '@/app/AiDashboard/types';

export async function runMarketTrend(
  region: 'us' | 'eu' | 'asia' = 'us',
  _category: string = 'pokemon'
): Promise<MarketTrendReport | null> {
  const rules = await getAgentRules('trend');

  // 地域ごとに固定するのは「監視ソースと通貨」のみに留める
  const regionContexts = {
    us: {
      name: '北米市場（アメリカ・カナダ）',
      currency: 'USD',
      targets: 'eBay USA, TCGPlayer, Reddit (r/pkmntcgcollections / r/PokeInvesting), 北米コレクターコミュニティ'
    },
    eu: {
      name: '欧州市場（イギリス・ドイツ・フランス等）',
      currency: 'EUR',
      targets: 'Cardmarket (EU), eBay UK/DE, 欧州コレクターコミュニティ'
    },
    asia: {
      name: 'アジア市場（台湾・香港・韓国・東南アジア）',
      currency: 'USD/HKD',
      targets: 'Shopee, 現地専門店相場, アジア圏トレカコミュニティ'
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
${rules}

【リサーチ任務】
対象地域の市場において、本格的な価格高騰や成約急増が起きる前の先行シグナルを検知してください。
現在日本国内で安値調達可能で、現地市場で将来的な急騰・プレミアムが見込める日本語版カードを発掘します。ジャンルの先入観を持たず、今週その地域で実際に起きている強い波をフラットに捉えてください。

【⚠️ 需要の前提条件と禁止事項】
1. 欧米公式大会（Play! Pokémon）における【プレイ専用カードの選出厳禁】:
   - 欧米の公式大会では日本語版カードの使用が禁止されています。
   - 「大会で流行っているから」という理由で、日本語版の【ノーマルカード、汎用グッズ、ACE SPEC、低レアリティパーツ】を選出することは【完全禁止】です（現地で売れず不良在庫化するため）。
2. 日本語版が海外で高騰する本質的要因（以下のいずれかに該当する波を自由に捉えること）:
   - 【日本限定性・希少性】: ジムプロモ、ポケセン限定、BOX購入特典、絶版シングル
   - 【アート・作家買い】: 特定イラストレーター（人気作家）作品の再評価、AR/CHR/SARの美術的需要
   - 【印刷品質・鑑定需要】: 海外版の初期傷・裁断不良を嫌う層による、日本語版の美品素体（Raw NM）やPSA10需要
   - 【象徴ポケモンのフラッグシップ】: 大会環境や新弾で話題のポケモンであっても、コレクション・鑑賞対象となる【最高レアリティ（SAR / UR）のみ】を選定

【構成ルール】
1. トレンド仮説（親）は【最大3本（2〜3本）】抽出:
   - 同一ジャンルに偏らせず、その地域市場で最も客観的なシグナル（実成約の急増、コミュニティでの言及急増、出品在庫の枯渇など）が出ている波を多角的に抽出してください。
2. 各仮説にぶら下げる波及銘柄（子）は【上位5銘柄（Rank 1〜5）】を抽出:
   - Rank 1: トレンド直撃の最本命カード（主役・フラッグシップ）
   - Rank 2〜3: 連動して動く主力カード
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
      "headline": "🔥 [トレンド核心タイトル] （例: 海外コミュニティでの特定作家買い急増 / 日本限定プロモの現地流通枯渇 / 新弾象徴ポケモンのSAR再評価 など）",
      "signal": "【兆候・事実】 なぜその波が起きているかの証拠（現地実成約の動き、SNS言及、在庫状況など客観的事実）",
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
          "impactLogic": "なぜこのカードが現地で跳ねるのか。現地コレクター需要や市場の歪みの根拠"
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