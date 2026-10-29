// app/api/ai/intelligence/agents/contentCreator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules } from '../helpers';

// 6. Instagramクリエイター
export async function runSnsPosts(chiefPackage: any, accountReport: any) {
    const rules = await getAgentRules('sns');
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.3,
    });

    const prompt = `あなたはInstagram専任のSNS投稿クリエイターです。
【チーフマネージャーからの指示書】:
${JSON.stringify(chiefPackage)}

【IGアナリスト指示】:
${JSON.stringify(accountReport)}

【必須発信ルール】:
- 答えを教えない撒き餌設計（Fact/Resultを提示し、具体的なAction/Reasonは伏せる）
${rules}

以下のJSON形式のみを出力してください:
{
  "theme": "チーフ選定に基づく今週のメイン撒き餌テーマ",
  "recommendedTiming": "推奨投稿日時",
  "visualGuideline": {
    "coverSlide": "1枚目（表紙）画像指示",
    "carouselSlides": [
      "2枚目: 価格差・高騰事実の提示",
      "3枚目: 証拠画面",
      "4枚目: VIP Discord/自社サイト誘導"
    ]
  },
  "posts": {
    "hybridPost": "推奨ハイブリッド投稿キャプション全文",
    "arbitragePost": "タイプA: 確定利ざや特化投稿キャプション全文",
    "trendPost": "タイプB: 市場トレンド特化投稿キャプション全文"
  },
  "discordCTA": "VIP Discordおよび自社サイトへの明確なアクション用誘導文"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// 7. X (Twitter) クリエイター
export async function runXPosts(chiefPackage: any, xAccountReport?: any) {
    const rules = await getAgentRules('sns');
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.3,
    });

    const prompt = `あなたはX (Twitter) 専任のクリエイターです。
【チーフマネージャーからの指示書】:
${JSON.stringify(chiefPackage)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {})}

【必須発信ルール】:
- 1ポスト目は140字以内、フック＋画像添付案内＋スレッド誘導
- 1ポスト目に外部リンクを置かず、スレッド最後またはリプ欄に配置
${rules}

以下のJSON形式のみを出力してください:
{
  "theme": "X用拡散フックテーマ",
  "mainPost": "1ポスト目（140字以内、フック＋画像添付案内＋スレッド誘導）",
  "threadPosts": [
    "ツリー2ポスト目: 国内相場と海外成約相場の事実比較",
    "ツリー3ポスト目: なぜ今この価格差が生じているのか（背景の示唆のみ）",
    "ツリー4ポスト目（CTA）: VIP Discord（詳細データ）＆ 自社サイト（直送依頼）への誘導文"
  ],
  "imageGuideline": [
    "画像1: 日本国内フリマ相場（メルカリ/スニダン等）の画面",
    "画像2: 海外実成約価格（eBay Sold等）の画面",
    "画像3: 実質利幅の内訳インフォグラフィック",
    "画像4: サービス概要・直送フロー図"
  ],
  "xCallToAction": "固定ポストまたはリプ欄に貼る誘導テキスト"
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}