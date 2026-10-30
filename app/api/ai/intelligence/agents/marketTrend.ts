// app/api/ai/intelligence/agents/marketTrend.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';
import { MarketTrendReport } from '../../../../AiDashboard/types';

export async function runMarketTrend(
  region: 'us' | 'eu' | 'asia' = 'us',
  _category: string = 'pokemon'
): Promise<MarketTrendReport | null> {
  const rules = await getAgentRules('trend');

  const regionContexts = {
    us: {
      name: '北米市場（アメリカ・カナダ）',
      currency: 'USD',
      targets: 'eBay USA, TCGPlayer, 北米リージョナル・シティリーグ大会結果, Reddit (r/pkmntcgcollections等), YouTube/TikTok'
    },
    eu: {
      name: '欧州市場（イギリス・ドイツ・フランス等）',
      currency: 'EUR',
      targets: 'Cardmarket (EU), eBay UK/DE, スペシャルイベント結果, 欧州コレクターコミュニティ'
    },
    asia: {
      name: 'アジア市場（台湾・香港・韓国・東南アジア）',
      currency: 'USD/HKD',
      targets: 'Shopee, 現地専門店相場, 各国公式大会結果, アジア圏トレカコミュニティ'
    }
  };

  const cur = regionContexts[region];
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
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
海外市場で本格的な価格高騰・ピークを迎える前の「先行シグナル（大会メタの胎動、新弾ギミックのシナジー、コレクター・作家買いの初動、海外SNSでの話題化など）」をいち早く察知してください。
その上で、現在日本のフリマや店舗でまだ旧相場のまま安値で調達可能であり、かつ現地で将来的に『価格急騰』が見込める高ポテンシャルな日本語版カードを発掘します。

【厳格設計ルール】
1. トレンド仮説（親）は【最大3本】まで厳選すること。
   - 客観的なシグナルが弱い週に無理に枠を埋める必要はありません（確信度の高い波を1〜3本）。
   - 架空の事象ではなく、実在の大会結果、公式発表、コミュニティ動向を根拠にすること。
2. 各仮説にぶら下げる波及銘柄（子）は、そのトレンドに最も合致する【上位5銘柄（Rank 1〜5）】を必ず抽出すること。
   - Rank 1: トレンド直撃の最本命カード（主役・フラッグシップ）
   - Rank 2: 連動して動く必須対抗パーツ
   - Rank 3: 実売を支える主力銘柄
   - Rank 4: 派生効果で化ける過去弾カードやノーマーク品
   - Rank 5: 先行大穴・サプライズ銘柄
3. 価格予測のノイズ排除（厳守）:
   - 到達ピーク予想価格や期待成長率（%）のような当てにならない妄想値は一切出力しないこと。
   - 数字は「🇯🇵 日本調達原価」と「${cur.currency} 現地現在相場」の確定値のみを出力し、「なぜこれから現地で跳ねるのか」の波及ロジックと確信度に集中すること。
4. 国際配送リードタイムの考慮:
   - 日本から現地到着まで約1〜2週間の配送時間がかかる前提で、売り時目安と推奨出口戦略を明記すること。
5. 実在カードの特定:
   - 架空のカード名は絶対に出力せず、カード名・型番（レアリティ）を正確に記述すること。

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "title": "${formattedCreatedAt} 【${region.toUpperCase()}】市場トレンド先行シグナルレポート",
  "claim": "海外市場での急騰先行シグナルと、ピーク前に日本から先回り調達すべき波及銘柄ポートフォリオ",
  "createdAt": "${formattedCreatedAt}",
  "hypotheses": [
    {
      "headline": "🔥 [仮説タイトル] 例: 北米リージョナル大会での〇〇デッキ上位独占によるメタ急変",
      "signal": "【兆候・事実】 なぜそのトレンドが起きているかの証拠・客観的データ",
      "timeframe": "⏳ ピーク想定: 【短期/中期/中長期】〇週間後（〇〇合わせ）",
      "items": [
        {
          "rankLabel": "Rank 1 (最本命)",
          "cardName": "実在カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "High",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "【短期】約2週間後（北米大会前）",
          "exitStrategy": "入荷後、大会前週末の現地店頭・ECで即出し",
          "impactLogic": "デッキの絶対的エース。英語版は初期傷が多く日本語版SARへの需要集中が確実視される。日本国内では旧環境価格で放置されており仕込み推奨。"
        },
        {
          "rankLabel": "Rank 2 (高連動)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "High",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "【短期】約2週間後",
          "exitStrategy": "店頭即売り",
          "impactLogic": "本命カードと必須で組まれる汎用パーツ。低単価のためまとめ買い向き。"
        },
        {
          "rankLabel": "Rank 3 (実売主力)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "Mid",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "【中期】約3週間後",
          "exitStrategy": "現地EC出品",
          "impactLogic": "メタ波及によって現地で安定した成約が見込める主力銘柄。"
        },
        {
          "rankLabel": "Rank 4 (派生注目)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "Raw NM",
          "conviction": "Mid",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "【中期】約1ヶ月後",
          "exitStrategy": "在庫補充",
          "impactLogic": "新ギミックとの相乗効果で過去弾から突如復権したノーマークカード。"
        },
        {
          "rankLabel": "Rank 5 (先行大穴)",
          "cardName": "カード名 (型番 / レアリティ)",
          "condition": "PSA10",
          "conviction": "Speculative",
          "jpBuyPriceJPY": "¥X,XXX",
          "currentLocalPrice": "${cur.currency} XX (約¥X,XXX)",
          "timeframe": "【中長期】1〜2ヶ月後",
          "exitStrategy": "PSA10鑑定出しまたはショーケース展示",
          "impactLogic": "このトレンドが一段と加熱した際に爆発するポテンシャルを秘めた高レバレッジ枠。"
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