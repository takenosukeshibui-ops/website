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
【チーフマネージャーからの指示書（7日分カレンダー含む）】:
${JSON.stringify(chiefPackage)}

【IGアナリスト指示】:
${JSON.stringify(accountReport)}

【必須発信ルール】:
1. 【答えを教えない撒き餌設計】:
   - 公開するのは「確定価格差」「海外急騰」「実成約事実（Fact/Result）」のみ。
   - 国内の仕入れ店舗名、仕入れルート、詳細なノウハウ（Action/Reason）は絶対に投稿本文に書かないこと。
2. 【2股導線の配置（Dual CTA）】:
   - 「詳細データ・先行情報（Reason）」を求めるユーザー向けには【有料VIP Discord】へ誘導。
   - 「今すぐこの利ざやを抜くための直送手配（Action）」を求めるユーザー向けには【自社ウェブサイトの代理購入】へ誘導。
3. 【週間カレンダー（月曜〜日曜）の完全展開】:
   - チーフの指示に基づき、週の看板である月曜（総合カタログ）のフルキャプションに加え、火曜〜日曜の各曜日投稿キャプションを生成すること。
${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "チーフ選定に基づく今週の週間撒き餌テーマ",
  "recommendedTiming": "推奨投稿日時（日本時間 20:00〜22:00 等）",
  "visualGuideline": {
    "coverSlide": "1枚目（表紙）画像レイアウト指示（最も目立つ価格差フック）",
    "carouselSlides": [
      "2枚目: 北米市場のサヤ取り＆トレンド実証画面",
      "3枚目: 欧州市場の言語プレミアム・PSA10実証画面",
      "4枚目: アジア市場の限定プロモ熱狂画面",
      "5枚目: 世界3大市場の確定利ざや比較インフォグラフィック",
      "6枚目: 2股CTA（VIP Discord ＆ 自社代理購入直送手配）"
    ]
  },
  "posts": {
    "hybridPost": "月曜看板投稿: 世界3大市場比較ハイブリッド投稿キャプション全文（ハッシュタグ含む）",
    "arbitragePost": "確定利ざや特化型キャプション全文",
    "trendPost": "市場トレンド・急騰先行特化型キャプション全文"
  },
  "discordCTA": "プロフリンクへ誘導する2股CTAテキスト（情報→Discord、行動→自社サイト）",
  "dailyPosts": [
    {
      "day": "月曜 (Monday)",
      "caption": "世界3大市場サヤ比較まとめ投稿キャプション全文",
      "slides": [
        "1枚目: 表紙",
        "2枚目: 北米",
        "3枚目: 欧州",
        "4枚目: アジア",
        "5枚目: 比較まとめ",
        "6枚目: 2股CTA"
      ]
    },
    {
      "day": "火曜 (Tuesday)",
      "caption": "ヴィンテージ特化投稿キャプション全文",
      "slides": ["1枚目: 表紙", "2枚目: 国内相場と海外成約の対比", "3枚目: 2股CTA"]
    },
    {
      "day": "水曜 (Wednesday)",
      "caption": "限定プロモ特化投稿キャプション全文",
      "slides": ["1枚目: 表紙", "2枚目: 海外プレミアム事実", "3枚目: 2股CTA"]
    },
    {
      "day": "木曜 (Thursday)",
      "caption": "現行モダン・メタ特化投稿キャプション全文",
      "slides": ["1枚目: 表紙", "2枚目: タイムラグ価格差", "3枚目: 2股CTA"]
    },
    {
      "day": "金曜 (Friday)",
      "caption": "高額鑑定・未開封BOX特化投稿キャプション全文",
      "slides": ["1枚目: 表紙", "2枚目: PSA10プレミアム", "3枚目: 2股CTA"]
    },
    {
      "day": "土曜 (Saturday)",
      "caption": "的中実績（タイプC）投稿キャプション全文",
      "slides": ["1枚目: 表紙", "2枚目: 当時予測vs現在急騰", "3枚目: Discord誘導"]
    },
    {
      "day": "日曜 (Sunday)",
      "caption": "週間まとめ＆利益ランキング投稿キャプション全文",
      "slides": ["1枚目: 表紙", "2枚目: ランキング表", "3枚目: 2股CTA"]
    }
  ]
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

    const prompt = `あなたはX (Twitter) 専任のプロクリエイターです。
【チーフマネージャーからの指示書（7日分カレンダー含む）】:
${JSON.stringify(chiefPackage)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {})}

【必須発信ルール】:
1. 1ポスト目は140字以内、フック＋画像添付案内＋スレッド誘導（外部リンクは絶対に貼らないこと）。
2. リンク（VIP Discord ＆ 自社サイトURL）はスレッド最終ポスト、またはリプライ欄にのみ配置。
3. 月曜看板スレッドに加え、火曜〜日曜の各曜日スレッドを生成すること。
${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "X用拡散フックテーマ",
  "mainPost": "月曜1ポスト目（140字以内、フック＋画像添付案内＋スレッド誘導）",
  "threadPosts": [
    "ツリー2ポスト目: 北米・欧州・アジアの成約相場と国内相場の事実比較",
    "ツリー3ポスト目: なぜこの価格差が生じているのか（背景の示唆のみ、仕入れ先は秘匿）",
    "ツリー4ポスト目（CTA）: VIP Discord（詳細データ）＆ 自社サイト（直送依頼）への誘導文"
  ],
  "imageGuideline": [
    "画像1: 日本国内実勢相場の画面",
    "画像2: 海外実成約相場（eBay Sold等）の画面",
    "画像3: 実質利幅の内訳インフォグラフィック",
    "画像4: サービス概要・直送フロー図"
  ],
  "xCallToAction": "固定ポストまたはリプライ欄に貼る誘導テキスト",
  "dailyThreads": [
    {
      "day": "月曜 (Monday)",
      "mainPost": "140字以内フック",
      "threadPosts": ["ツリー2", "ツリー3", "ツリー4 (CTA)"]
    },
    {
      "day": "火曜 (Tuesday)",
      "mainPost": "140字以内フック (ヴィンテージ)",
      "threadPosts": ["ツリー2 (事実比較)", "ツリー3 (CTA)"]
    },
    {
      "day": "水曜 (Wednesday)",
      "mainPost": "140字以内フック (限定プロモ)",
      "threadPosts": ["ツリー2 (事実比較)", "ツリー3 (CTA)"]
    },
    {
      "day": "木曜 (Thursday)",
      "mainPost": "140字以内フック (現行モダン)",
      "threadPosts": ["ツリー2 (事実比較)", "ツリー3 (CTA)"]
    },
    {
      "day": "金曜 (Friday)",
      "mainPost": "140字以内フック (鑑定品・BOX)",
      "threadPosts": ["ツリー2 (事実比較)", "ツリー3 (CTA)"]
    },
    {
      "day": "土曜 (Saturday)",
      "mainPost": "140字以内フック (的中実績)",
      "threadPosts": ["ツリー2 (急騰事実)", "ツリー3 (Discord誘導)"]
    },
    {
      "day": "日曜 (Sunday)",
      "mainPost": "140字以内フック (週間まとめ)",
      "threadPosts": ["ツリー2 (ランキング)", "ツリー3 (CTA)"]
    }
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}