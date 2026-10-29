import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getInstagramInsights } from '@/lib/instagram';
import { parseAIJson } from '../helpers';

// 4. IGアナリスト
export async function runAccountAnalysis() {
    const rawInsights = await getInstagramInsights(5);
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは越境トレカ・ホビー販売事業の専任IGアナリストです。
直近データ: ${JSON.stringify(rawInsights)}

答えを教えない撒き餌設計（Fact/Result提示、Action/Reason秘匿）に基づき、改善戦術を分析してください。

以下のJSON形式のみを出力してください:
{
  "title": "自社Instagramアカウントエンゲージメント・ファネル診断",
  "claim": "改善すべき主要フックおよび投稿方針の推奨アクション",
  "reasons": [
    "過去投稿のエンゲージメント分析結果",
    "クリック率・プロフ誘導のボトルネック",
    "最も反響の高かった投稿切り口の法則"
  ],
  "facts": [
    { "label": "平均いいね/保存数", "value": "XX件" },
    { "label": "高反響の訴求軸", "value": "確定利ざや系 or トレンド系" },
    { "label": "推奨投稿時間帯", "value": "日本時間 20:00〜22:00" },
    { "label": "プロフ遷移率", "value": "X.X%" }
  ],
  "soWhat": "次回のInstagramクリエイターへの指示ルール",
  "riskAndMitigation": {
    "risk": "アルゴリズム変更によるリーチ低下",
    "mitigation": "カルーセルスライド複数枚化による滞在時間の向上"
  },
  "verificationChecklist": [
    "プロフURLの計測タグ確認",
    "保存率の高いスライド構成のテンプレ化"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// 5. Xアナリスト
export async function runXAccountAnalysis() {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.2,
    });

    const prompt = `あなたは越境トレカ・ホビー販売事業の専任【X (Twitter) アナリスト】です。
Xプラットフォーム特有のアルゴリズム（インプレッション最大化、ブックマーク保存率、リポスト連鎖、外部リンク遷移のペナルティ回避）を分析し、Xクリエイター向けの戦術ルールを策定してください。

以下のJSON形式のみを出力してください:
{
  "title": "自社X (Twitter) アルゴリズム・エンゲージメント診断",
  "claim": "Xの拡散力・ブックマーク率を最大化する投稿戦術ルールの推奨アクション",
  "reasons": [
    "1ポスト目の文字数・行数とインプレッションの相関",
    "画像4枚構成時のプレビュー視認性ルール",
    "リポストおよびリプライ欄導線のクリック率検証"
  ],
  "facts": [
    { "label": "目標ブックマーク率", "value": "1.5%以上" },
    { "label": "推奨スレッド構成", "value": "全3〜4ポスト" },
    { "label": "推奨投稿時間帯", "value": "日本時間 19:00〜21:00 / 08:00 (米国夕方)" },
    { "label": "リンク配置ルール", "value": "スレッド最終ポストまたは固定ポスト" }
  ],
  "soWhat": "次回のXクリエイターへの制作戦術指示（フック文字数、画像アスペクト比、ツリー展開順）",
  "riskAndMitigation": {
    "risk": "外部リンク貼付による表示回数制限（シャドウリミット）",
    "mitigation": "1ポスト目にはリンクを置かず、完全スレッド完結型にしてリプ欄にURL配置"
  },
  "verificationChecklist": [
    "1ポスト目が140文字以内に収まっているか",
    "画像4枚の視認性チェック",
    "アナリティクスのインプレッション中央値照合"
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}