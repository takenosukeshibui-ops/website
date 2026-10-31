// app/api/ai/intelligence/agents/snsAccount.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getInstagramInsights } from '@/lib/instagram';
import { parseAIJson, getCategoryName, getAgentRules } from '../helpers';

// 4. IGアナリスト（自社Instagramグロース＆2股ファネル転換アナリスト）
export async function runAccountAnalysis(category: string = 'pokemon') {
  const rawInsights = await getInstagramInsights(5);
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('account');

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.2,
  });

  const prompt = `あなたは越境【${categoryName}】事業における【自社Instagram専任アカウントアナリスト＆グロースディレクター】です。

【私たちの最終ゴール（KGI）】
1. 「先行情報・相場データ（Reason）」を求めるユーザーを【有料VIP Discord】へ誘導すること。
2. 「今すぐ利ざやを抜くための直送手配（Action）」を求めるユーザーを【自社代理購入サイト】へ誘導すること。
※Instagram投稿はすべてこの2股導線への「撒き餌」であり、プロフ遷移率と保存（Save）率の最大化が至上命題です。

【直近のアカウント実績データ（Meta Graph API）】:
${JSON.stringify(rawInsights)}

【あなたの分析・ディレクション任務】:
過去投稿のエンゲージメント（いいね・コメント・推定保存率）、投稿時間帯、ハッシュタグ、カルーセル構成を分析し、
1. チーフ・キュレーターが今週の7日間のスロット比率（どの商材を増枠すべきか）を決めるための【編成ディレクション】
2. Instagram専任クリエイターが今週作るべき【最高精度の投稿レギュレーション】
の双方を策定してください。

■ 厳格な分析ルール:
1. 事実データに基づく客観判定（バイアスの排除）:
   - 固定の例示には囚われず、上記実績データから観察される生の傾向を反映してください。
   - 【コールドスタート安全策】: 実績データが空または初期段階で分析に足る母数がない場合は、無理な作文をせず、標準ベースライン（全スロット normal、トレンド予測推奨曜日は Tuesday）を適用してください。
2. キュレーター向けスロット傾斜判定（RSI自己回帰の核心）:
   - 以下の5大スロットのうち、保存率・反響が強いものを "high"（増枠推奨）、反応が鈍いものを "low"（縮小/週末集約）、標準を "normal" として判定してください。
     * modern_meta (現行モダン枠)
     * neo_vintage (ネオ・ヴィンテージ枠)
     * promos_exclusive (限定プロモ枠)
     * classic_vintage (クラシック・ヴィンテージ枠)
     * high_end_sealed (高額鑑定・未開封BOX枠)
   - 「先行トレンド予測」を週の初速を獲るために何曜日に配置すべきかも推奨してください。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "title": "自社Instagram 2股ファネル転換＆アカウント診断レポート",
  "claim": "今週の投稿で2股導線（Discord/自社サイト）への送客を最大化するための最重要改善アクション",
  "reasons": [
    "過去投稿のエンゲージメント・保存率ボトルネック分析",
    "最もプロフ遷移を生み出した訴求切り口の検証",
    "海外リーチを最大化するハッシュタグおよび投稿タイミングの相関"
  ],
  "facts": [
    { "label": "最優秀反響パターン", "value": "データから観察された最も効果的なカルーセル構成" },
    { "label": "推奨投稿時間帯", "value": "データから導かれた最適時間帯（例: 日本時間 21:00）" },
    { "label": "ハッシュタグ推奨配分", "value": "推奨ハッシュタグの配分比率" },
    { "label": "2股CTA推奨誘導", "value": "Reason(情報)→Discord / Action(手配)→プロフリンク" }
  ],
  "curatorDirectives": {
    "slotWeights": {
      "modern_meta": "high",
      "neo_vintage": "normal",
      "promos_exclusive": "normal",
      "classic_vintage": "low",
      "high_end_sealed": "normal"
    },
    "recommendedTrendDay": "Tuesday",
    "rationale": "各スロットの重み付けおよびトレンド配信曜日を推奨したデータ的根拠"
  },
  "soWhat": "Instagramクリエイターへの直接制作指示（表紙フックの文字数、スライド展開順、CTA文言の型）",
  "riskAndMitigation": {
    "risk": "ノウハウを投稿本文で喋りすぎてしまいプロフに飛ばずに離脱されるリスク",
    "mitigation": "仕入れ先名・具体的ルートを完全秘匿し、Fact（価格差・成約事実）のみ提示してプロフに誘導する"
  },
  "verificationChecklist": [
    "1枚目（表紙）の価格差フックがスマホ画面で3秒以内に理解できるか",
    "最終スライドの2股CTA（Discord/自社サイト）が明確に分かれているか",
    "海外向け英語ハッシュタグが正しくセットされているか"
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

// 5. Xアナリスト
export async function runXAccountAnalysis(sharedInsights?: any) {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.2,
  });

  const prompt = `あなたは越境トレカ・ホビー販売事業の専任【X (Twitter) アナリスト】です。
Xプラットフォーム特有のアルゴリズム（インプレッション最大化、ブックマーク保存率、リポスト連鎖、外部リンク遷移のペナルティ回避）を分析し、
1. チーフ・キュレーター向けのX視点でのスロット編成示唆
2. Xクリエイター向けの戦術ルール
を策定してください。

【参考インサイト（Instagram・全体市場の反響傾向）】:
${JSON.stringify(sharedInsights || '初期運用のための標準アルゴリズム基準を適用')}

■ 厳格な分析ルール:
1. Xアルゴリズムの最新特性を反映すること（1ポスト目の外部リンク厳禁、画像4枚視認性、140字以内フック）。
2. キュレーター向けに、X上で拡散・ブックマーク（保存）されやすいスロットの重み（high / normal / low）を判定すること。

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
    { "label": "推奨スレッド構成", "value": "全3〜4ポスト構成" },
    { "label": "推奨投稿時間帯", "value": "海外アクティブ時間と国内帰宅時間の重畳帯" },
    { "label": "リンク配置ルール", "value": "スレッド最終ポストまたは固定ポスト" }
  ],
  "curatorDirectives": {
    "slotWeights": {
      "modern_meta": "high",
      "neo_vintage": "normal",
      "promos_exclusive": "normal",
      "classic_vintage": "normal",
      "high_end_sealed": "normal"
    },
    "recommendedTrendDay": "Tuesday",
    "rationale": "X特有の議論性・拡散性から見たスロット推奨理由"
  },
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
}
`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}