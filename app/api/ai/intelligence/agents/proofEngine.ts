import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson } from '../helpers';

export async function runHitProofEngine(pastLogs: any[]) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const pastPredictions = pastLogs.map(log => ({
        date: log.created_at,
        trends: log.trend_insights,
        chiefPackage: log.chief_package
    })).filter(p => Boolean(p.trends || p.chiefPackage));

    const prompt = `あなたは越境トレカ代理購入組織のチーフ直下に組み込まれた【的中実績・証明投稿エンジン】です。
設計書第5章に基づき、過去に蓄積されたトレンド予測履歴と現在の海外市場実相場を照合し、
実際に高騰が的中したキラー実績を1件特定して「タイプC（的中実績・証明投稿）」パッケージを作成してください。

以下のJSON形式のみを出力してください:
{
  "cardName": "的中したカード名・商品名",
  "predictedDate": "予測時期 (例: 3週間前 / 2026年9月上旬)",
  "predictedPrice": "当時の相場 ($XXX / ¥XX,XXX)",
  "currentPrice": "現在の海外成約相場 ($XXX / ¥XX,XXX)",
  "growthRate": "急騰上昇率 (例: +45.8%)",
  "hitReasonPattern": "的中要因 (先行需要 / コレクター波及 / 日本限定希少性)",
  "proofPost": "タイプC投稿キャプション全文（当時の予測事実と現在の急騰結果を並べ、圧倒的な証拠を提示するテキスト。ハッシュタグ含む）",
  "visualGuideline": {
    "beforeImageDesc": "左側/1枚目: 当時の予測レポート画面のキャプチャ指示",
    "afterImageDesc": "右側/2枚目: 現在の海外実成約（Sold Listings）急騰画面のスクショ指示",
    "comparisonLayout": "ビフォーアフター対比レイアウト指示"
  },
  "discordCTA": "今後の先行一次情報を受け取るためのVIP Discord誘導文"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}