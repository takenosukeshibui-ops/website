// app/api/ai/intelligence/agents/contentCreator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules, getCategoryName } from '../helpers';

// 6. Instagram専任投稿クリエイター（2股転換・カルーセル特化）
export async function runSnsPosts(chiefPackage: any, accountReport: any, category: string = 'pokemon') {
    const categoryName = getCategoryName(category);
    const rules = await getAgentRules('sns');
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.3,
    });

    const prompt = `あなたは越境【${categoryName}】事業における【Instagram専任のトップセールスクリエイター】です。

【私たちの最終ゴール（KGI）】
1. 「詳細データ・先行情報（Reason）」を求めるユーザーを【有料VIP Discord】へ誘導すること。
2. 「今すぐ利ざやを抜くための直送手配（Action）」を求めるユーザーを【自社代理購入サイト】へ誘導すること。
※Instagram投稿はすべてこの2股導線への「撒き餌」であり、プロフ遷移と保存（Save）の最大化を狙って制作してください。

【チーフマネージャーからのディレクション（7日分カレンダー含む）】:
${JSON.stringify(chiefPackage, null, 2)}

【IGアナリストからの直近分析＆制作レギュレーション】:
${JSON.stringify(accountReport, null, 2)}

【必須制作ルール】:
1. 【IGアナリストのレギュレーション遵守】:
   - アナリストが指定した「推奨投稿時間」「表紙フックの文字数」「スライド構成順」「ハッシュタグ比率」を厳密に反映すること。
2. 【答えを教えない撒き餌設計（Hook & Hold）】:
   - 投稿で開示するのは「確定価格差」「海外急騰率」「実成約事実（Fact / Result）」のみ。
   - 日本国内の仕入れ店舗名、仕入れルート、詳細ノウハウ（Action / Reason）は絶対に投稿本文に書かないこと。
3. 【明確な2股CTA（Dual Funnel）の配置】:
   - キャプション末尾および最終スライドで、以下の2つの選択肢を明確に提示すること:
     ① 「なぜこの価格差が生まれたのか？次の急騰シグナルを知りたい方」 ➔ 【VIP Discord】へ
     ② 「この価格差のまま、日本から最速で直送手配したい方」 ➔ 【プロフの自社代理購入URL】へ
4. 【週間カレンダー（全7日分）の完全生成】:
   - 月曜の看板総合カタログに加え、火曜〜日曜の各曜日投稿キャプション・スライド指示を完全に出力すること。
${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "チーフ選定に基づく今週の週間撒き餌テーマ",
  "recommendedTiming": "アナリスト推奨に基づく最適な投稿時間帯（例: 日本時間 21:00 / 米国東部 08:00）",
  "hashtags": [
    "#pokemontcg", "#pokemoncards", "#pokemoninvesting", "#psa10", "#japanesepokemon"
  ],
  "visualGuideline": {
    "coverSlide": "1枚目（表紙）画像指示: 3秒で指が止まる価格差フック、文字サイズ・コントラスト比の指定",
    "carouselSlides": [
      "2枚目: 北米市場の実成約・サヤ取り実証画面（Fact提示）",
      "3枚目: 欧州市場の言語版プレミアム・PSA10実証画面（Fact提示）",
      "4枚目: アジア市場の限定プロモ・コレクション熱狂画面（Fact提示）",
      "5枚目: 世界3大市場の確定利ざや比較インフォグラフィック",
      "6枚目: 2股CTAスライド（情報→VIP Discord ＆ 直送手配→自社サイト）"
    ]
  },
  "posts": {
    "hybridPost": "月曜看板投稿: 世界3大市場比較ハイブリッド投稿キャプション全文（本文＋2股CTA＋ハッシュタグを含む完全版）",
    "arbitragePost": "確定利ざや特化型キャプション全文（ハッシュタグ含む）",
    "trendPost": "市場トレンド・急騰先行特化型キャプション全文（ハッシュタグ含む）"
  },
  "discordCTA": "プロフリンク・ハイライトへ誘導する2股CTAテンプレート文",
  "dailyPosts": [
    {
      "day": "月曜 (Monday)",
      "theme": "世界3大市場サヤ比較まとめ (MVP特集)",
      "caption": "月曜フルキャプション全文（2股CTA＋ハッシュタグ含む）",
      "slides": [
        "1枚目: 表紙（価格差フック）",
        "2枚目: 北米実績",
        "3枚目: 欧州実績",
        "4枚目: アジア実績",
        "5枚目: 比較まとめ表",
        "6枚目: 2股CTA"
      ]
    },
    {
      "day": "火曜 (Tuesday)",
      "theme": "ヴィンテージ特化（旧裏〜DP絶版）",
      "caption": "火曜フルキャプション全文（2股CTA＋ハッシュタグ含む）",
      "slides": ["1枚目: 表紙", "2枚目: 国内相場と海外成約の対比事実", "3枚目: 2股CTA"]
    },
    {
      "day": "水曜 (Wednesday)",
      "theme": "限定プロモ特化（日本限定希少品）",
      "caption": "水曜フルキャプション全文（2股CTA＋ハッシュタグ含む）",
      "slides": ["1枚目: 表紙", "2枚目: 海外プレミアム事実", "3枚目: 2股CTA"]
    },
    {
      "day": "木曜 (Thursday)",
      "theme": "現行モダン・メタ特化（新弾先行・WCS需要）",
      "caption": "木曜フルキャプション全文（2股CTA＋ハッシュタグ含む）",
      "slides": ["1枚目: 表紙", "2枚目: タイムラグ価格差事実", "3枚目: 2股CTA"]
    },
    {
      "day": "金曜 (Friday)",
      "theme": "高額鑑定・未開封BOX特化（週末大口オファー）",
      "caption": "金曜フルキャプション全文（2股CTA＋ハッシュタグ含む）",
      "slides": ["1枚目: 表紙", "2枚目: PSA10成約プレミアム事実", "3枚目: 2股CTA"]
    },
    {
      "day": "土曜 (Saturday)",
      "theme": "的中実績（タイプC・社会的証明）",
      "caption": "土曜フルキャプション全文（過去予測vs現在急騰の証拠提示＋Discord誘導）",
      "slides": ["1枚目: 表紙（的中バナー）", "2枚目: 当時予測画面と現在高騰画面の対比", "3枚目: Discord誘導CTA"]
    },
    {
      "day": "日曜 (Sunday)",
      "theme": "週間まとめ＆利益ランキング（来週への布石）",
      "caption": "日曜フルキャプション全文（利益率ランキング振り返り＋2股CTA）",
      "slides": ["1枚目: 表紙", "2枚目: 週間利益ランキング表", "3枚目: 2股CTA"]
    }
  ]
}`;

    const res = await model.invoke(prompt);
    return parseAIJson(res.content.toString());
}

// 7. X (Twitter) 専任クリエイター
export async function runXPosts(chiefPackage: any, xAccountReport?: any, category: string = 'pokemon') {
    const categoryName = getCategoryName(category);
    const rules = await getAgentRules('x');
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-3.1-flash-lite",
        temperature: 0.3,
    });

    const prompt = `あなたは越境【${categoryName}】事業における【X (Twitter) 専任のプロクリエイター】です。
【チーフマネージャーからの指示書（7日分カレンダー含む）】:
${JSON.stringify(chiefPackage, null, 2)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {}, null, 2)}

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
