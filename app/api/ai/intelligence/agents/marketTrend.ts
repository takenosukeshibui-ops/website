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
    model: 'gemini-3.1-flash-lite',
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
1. 【エグゼクティブ・サマリー】の生成:
   - レポート全体の潮流、最注目カタリスト銘柄、売り抜け時間軸、警戒リスク、今週のアクション指針を総括すること。
2. トレンド仮説（親）は【最大3本（2〜3本）】抽出:
   - 同一ジャンルに偏らせず、客観的なシグナル（実成約急増、SNS言及急増、出品枯渇等）が出ている波を多角的に抽出すること。
3. 各仮説にぶら下げる波及銘柄（子）は【上位5銘柄（Rank 1〜5）】を抽出:
   - Rank 1: トレンド直撃の最本命カード（主役・フラッグシップ）
   - Rank 2〜3: 連動して動く主力カード
   - Rank 4〜5: 派生効果で化ける過去弾カードや先行大穴
4. 価格予測のノイズ排除:
   - ピーク予想価格や成長率（%）は出力せず、「🇯🇵 日本調達原価」と「${cur.currency} 現地現在相場」の確定値のみを出力すること。

以下の厳格なJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要）:
{
  "title": "${formattedCreatedAt} 【${region.toUpperCase()}】市場トレンドレポート",
  "claim": "今週の${cur.name}における急騰先行シグナルと波及銘柄ポートフォリオ",
  "createdAt": "${formattedCreatedAt}",
  "summary": {
    "headline": "今週のトレンド総括見出し（例: 海外コレクターによる特定作家ARの現地買い戻し過熱と初期SARの在庫蒸発）",
    "trendDynamics": {
      "catalystOverview": "海外市場での急騰トリガー・資金流入口の解説（1〜2文）",
      "japanPriceLag": "なぜ日本国内で安値放置されているのか・相場ラグの背景解説（1〜2文）"
    },
    "strategicHighlights": {
      "mvpCatalystCard": "今週の最注目カタリスト銘柄名とその理由",
      "optimalExitWindow": "売り抜け推奨期間（例: 到着後2〜3週間以内 / 次弾海外発売直前）"
    },
    "riskAlert": {
      "hypeTrapWarning": "一時的煽りバブルや日本国内での急な再販リスクへの警戒点",
      "gradingVsRawStrategy": "素体NM即売りかPSA10鑑定出しかの推奨指針"
    },
    "actionDirectives": [
      "最優先で日本から確保すべき銘柄・仕入れ方のアクション指針",
      "現地到着後の販売・売り抜けスピードに関するアクション指針"
    ]
  },
  "hypotheses": [
    {
      "headline": "🔥 [トレンド核心タイトル]",
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