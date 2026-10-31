// app/api/ai/intelligence/agents/contentCreator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules, getCategoryName } from '../helpers';

// 6. Instagram専任投稿クリエイター（動的週間カレンダー ＆ 2股転換カルーセル特化）
export async function runSnsPosts(chiefPackage: any, accountReport: any, category: string = 'pokemon') {
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('sns');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const prompt = `あなたは越境【${categoryName}】事業における【Instagram専任のトップセールスクリエイター】です。

【私たちの最終ゴール（KGI）】
1. 「先行情報・相場データ（Reason）」を求めるユーザーを【有料VIP Discord】へ誘導すること。
2. 「今すぐ利ざやを抜くための直送手配（Action）」を求めるユーザーを【自社代理購入サイト】へ誘導すること。
※Instagram投稿はすべてこの2股導線への「撒き餌」であり、プロフ遷移と保存（Save）の最大化を狙って制作してください。

【チーフ・キュレーター編成パッケージ（今週の動的週間ラインナップ）】:
${JSON.stringify(chiefPackage, null, 2)}

【IGアナリストからの直近分析＆制作レギュレーション】:
${JSON.stringify(accountReport, null, 2)}

■ 必須制作ルール:
1. 【キュレーターの動的編成への完全準拠】:
   - 曜日のテーマは固定ではありません。上記チーフパッケージ内の weeklyLineup（月〜日の各曜日に割り振られた contentType, slotKey, themeLabel, items）に100%従って各曜日の投稿を執筆してください。
   - 【アービトラージ枠の日】:
     * 必ず配置された【北米（us）・欧州（eu）・アジア（asia）の3商品】の確定価格差（Fact）をすべて盛り込んだ「3市場比較カルーセル」を構成すること。
   - 【先行トレンド予測枠の日】:
     * なぜ今後跳ねるのかの客観的シグナル（大会・在庫枯渇など）と注目銘柄を提示し、「見返せるように保存（Save）」を促す構成にすること。
   - 【的中実績（答え合わせ）枠の日】:
     * 「過去に予測したカードが実際に海外で跳ねた確定事実」を対比提示し、アカウントの権威性を確立してDiscordへ誘導すること。
2. 【答えを教えない撒き餌原則（Hook & Hold）】:
   - 投稿で開示するのは「確定価格差」「海外急騰率」「実成約事実（Fact & Result）」のみ。
   - 日本国内の仕入れ店舗名、仕入れルート、詳細ノウハウ（Action & Reason）は絶対に投稿本文に書かないこと（Gate 2 監査で弾かれます）。
3. 【明確な2股CTA（Dual Funnel）の配置】:
   - 各曜日キャプション末尾および最終スライドで、以下の2つの選択肢を明確に提示すること:
     ① 「なぜこの価格差が生まれたのか？次の急騰シグナルを知りたい方」 ➔ 【VIP Discord】へ
     ② 「この価格差のまま、日本から最速で直送手配したい方」 ➔ 【プロフの自社代理購入URL】へ

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "チーフ選定に基づく今週の週間撒き餌テーマ",
  "recommendedTiming": "アナリスト推奨に基づく最適な投稿時間帯（例: 日本時間 21:00）",
  "hashtags": [
    "#pokemontcg", "#pokemoncards", "#pokemoninvesting", "#psa10", "#japanesepokemon"
  ],
  "visualGuideline": {
    "coverSlide": "看板MVP投稿の表紙画像指示: 3秒で指が止まる価格差フック、文字サイズ・コントラスト比の指定",
    "carouselSlides": [
      "2枚目: 北米市場の実成約・サヤ取り実証画面（Fact提示）",
      "3枚目: 欧州市場の相場実態画面（Fact提示）",
      "4枚目: アジア市場の熱狂・プレミアム画面（Fact提示）",
      "5枚目: 世界3大市場の確定利ざや比較インフォグラフィック",
      "6枚目: 2股CTAスライド（情報→VIP Discord ＆ 直送手配→自社サイト）"
    ]
  },
  "posts": {
    "hybridPost": "今週の看板MVP特集: 世界3大市場比較ハイブリッド投稿キャプション全文（本文＋2股CTA＋ハッシュタグを含む完全版）",
    "arbitragePost": "確定利ざや特化型キャプション全文（ハッシュタグ含む）",
    "trendPost": "市場トレンド・急騰先行特化型キャプション全文（ハッシュタグ含む）"
  },
  "discordCTA": "プロフリンク・ハイライトへ誘導する2股CTAテンプレート文",
  "dailyPosts": [
    {
      "day": "Monday",
      "theme": "weeklyLineupの月曜テーマ（例: 海外先行トレンド急騰予測 または 現行モダン3市場比較）",
      "caption": "月曜フルキャプション全文（本文＋2股CTA＋ハッシュタグを含む完全版）",
      "slides": [
        "1枚目: 表紙（フック）",
        "2枚目: 事実データスライド",
        "3枚目: 比較またはシグナルスライド",
        "4枚目: 2股CTAスライド"
      ]
    },
    { "day": "Tuesday", "theme": "火曜テーマ", "caption": "火曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Wednesday", "theme": "水曜テーマ", "caption": "水曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Thursday", "theme": "木曜テーマ", "caption": "木曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Friday", "theme": "金曜テーマ", "caption": "金曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Saturday", "theme": "土曜テーマ", "caption": "土曜フルキャプション全文", "slides": ["スライド指示"] },
    { "day": "Sunday", "theme": "日曜テーマ", "caption": "日曜フルキャプション全文", "slides": ["スライド指示"] }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

// 7. X (Twitter) 専任クリエイター（140字フック ＆ 4ポストスレッド特化）
export async function runXPosts(chiefPackage: any, xAccountReport?: any, category: string = 'pokemon') {
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('x');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const prompt = `あなたは越境【${categoryName}】事業における【X (Twitter) 専任のプロクリエイター】です。

【チーフ・キュレーター編成パッケージ（今週の動的週間ラインナップ）】:
${JSON.stringify(chiefPackage, null, 2)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {}, null, 2)}

■ 必須発信ルール:
1. 【1ポスト目の140文字制限厳守（最重要）】:
   - 各曜日の mainPost（1ポスト目）は、改行・絵文字・ハッシュタグを含めて【絶対に140文字以内】で執筆すること（Gate 2 監査で自動検知されます）。
   - 1ポスト目には絶対に外部リンク（URL）を貼らないこと（アルゴリズムによる表示回数制限を回避するため）。画像4枚の視認案内とスレッド誘導を含めること。
2. 【キュレーターの動的編成への完全準拠】:
   - チーフパッケージ内の weeklyLineup に従い、全7曜日（Monday〜Sunday）のスレッドを生成してください。
   - アービトラージ枠の日：ツリー2〜3ポスト目で北米・欧州・アジアの3市場相場と国内相場の乖離事実を対比させること。
   - トレンド予測枠の日：海外市場で検知された先行シグナルと注目銘柄の波及ロジックを展開すること。
   - 的中実績枠の日：過去予測と現在確定成約価格の跳ね上がり実績を開示すること。
3. 【リンク配置ルール】:
   - VIP Discord ＆ 自社サイトURLへの誘導は、スレッド最終ポスト（またはリプライ欄想定文）にのみ配置すること。
4. 【撒き餌原則】:
   - 価格差や成約実績の事実（Fact & Result）のみを語り、仕入れ店舗名や具体的仕入れルートは絶対に漏洩させないこと。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "X用拡散フックテーマ",
  "mainPost": "今週の看板MVP 1ポスト目（140字以内厳守、フック＋画像添付案内＋スレッド誘導）",
  "threadPosts": [
    "ツリー2ポスト目: 世界3市場の実成約・相場乖離の事実データ",
    "ツリー3ポスト目: なぜこの歪みが生じているのか（背景示唆のみ、仕入れ先は完全秘匿）",
    "ツリー4ポスト目（CTA）: VIP Discord（先行シグナル）＆ 自社サイト（直送依頼）への誘導文"
  ],
  "imageGuideline": [
    "画像1: 日本国内相場画面（Fact）",
    "画像2: 海外実成約相場画面（Fact）",
    "画像3: 確定利ざや・マージン内訳インフォグラフィック",
    "画像4: 2股導線・サービス概要図"
  ],
  "xCallToAction": "固定ポストまたはリプライ欄に貼る誘導テキスト",
  "dailyThreads": [
    {
      "day": "Monday",
      "mainPost": "月曜1ポスト目（140文字以内厳守、フック＋画像案内＋ツリー誘導）",
      "threadPosts": [
        "ツリー2ポスト目: 事実データ展開",
        "ツリー3ポスト目: 要因分析・示唆",
        "ツリー4ポスト目: 2股CTA"
      ]
    },
    { "day": "Tuesday", "mainPost": "火曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Wednesday", "mainPost": "水曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Thursday", "mainPost": "木曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Friday", "mainPost": "金曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Saturday", "mainPost": "土曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] },
    { "day": "Sunday", "mainPost": "日曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"] }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}