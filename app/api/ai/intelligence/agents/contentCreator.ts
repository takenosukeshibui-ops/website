// app/api/ai/intelligence/agents/contentCreator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules, getCategoryName } from '../helpers';

// 6. Instagram専任投稿クリエイター（火曜〜土曜 5日分アービトラージ特化）
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
海外で日本語版ポケモンカードを取り扱う事業者（カードショップ・リセラー・大口コレクター）に向け、
自社の【越境代理購入サービス】への利用・アカウント登録を促すこと（プロフィールリンクへ誘導）。
※海外バイヤー向けのため、【キャプション本文（caption）および hookText はすべて英語（English）で執筆すること】を厳守してください。英語非ネイティブのバイヤーでもスムーズに理解できるよう、難解な語彙を避けたシンプルで自然なビジネス英語を用いてください。
※現在「市場トレンド」および「的中実績」は保留中のため動作停止としています。**火曜日〜土曜日（Tuesday〜Saturday）の5日分をすべて「アービトラージ（日米/日欧/日亜の価格差・実成約実績）」投稿**として作成してください。

【チーフ・キュレーター編成パッケージ（火曜〜土曜のアービトラージ週間ラインナップ）】:
${JSON.stringify(chiefPackage, null, 2)}

【IGアナリストからの直近分析＆制作レギュレーション】:
${JSON.stringify(accountReport, null, 2)}

■ 必須制作ルール:
1. 【火曜〜土曜 5日分のアービトラージ投稿作成】:
   - dailyPosts には "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" の5日分のみを含めてください。
   - 各日の投稿はすべてアービトラージ（国内調達価格と海外実成約価格の乖離・粗利事実）を中心に構成し、北米（us）・欧州（eu）・アジア（asia）の比較事実を盛り込んでください。
2. 【答えを教えない撒き餌原則（Hook & Hold）】:
   - 投稿で開示するのは「確定価格差」「海外実成約価格」「ROI・成約実績（Fact & Result）」のみ。
   - 日本国内の仕入れ店舗名、仕入れルート、詳細ノウハウ（Action & Reason）は絶対に投稿本文に書かないこと（Gate 2 監査で弾かれます）。
3. 【自社代理購入サービスへの英語CTA配置（最重要・各キャプション末尾にそのまま配置）】:
   - 各曜日の caption 本文の末尾には、以下のブロックをそのまま配置すること:

━━━━━━━━━━━━━━━━━━━━━━
【Japanese Pokémon Card Sourcing & Proxy Service】
━━━━━━━━━━━━━━━━━━━━━━
Looking to source Japanese Pokémon cards for your shop or business?
We buy directly from Japanese markets and ship worldwide to your door!

✅ Flat 5% proxy fee only (No hidden costs)
✅ Low shipping rates: from ~$0.02 / card (approx. ¥3/card for bulk orders)
✅ 1-Click sourcing (We combine items from multiple shops into 1 box)

📌 Click the link in our bio to create your FREE account!
📩 Questions or bulk inquiries? Feel free to DM us on Instagram or send an email!

お問い合わせ・ご相談はインスタDMまたはメールよりお気軽にお問い合わせください。
4. 【画像生成データの出力原則（最重要）】:
   - 著作権およびVeRO違反を防ぐため、カードのイラスト画像や他者の撮影画像は絶対に使用しません。
   - 代わりに、システムが「価格差インフォグラフィック」を自動生成（合成）するための正確なテキストデータ（infographicData）を出力してください。infographicData.type は必ず "arbitrage" としてください。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "火〜土5日間のアービトラージ撒き餌テーマ",
  "recommendedTiming": "アナリスト推奨に基づく最適な投稿時間帯（例: 日本時間 21:00）",
  "hashtags": [
    "#PokemonTCG", "#PokemonCards", "#PokemonWholesale", "#JapanesePokemonCards", "#B2B", "#PokemonReseller", "#WorldwideJaPan"
  ],
  "discordCTA": "プロフリンク・ハイライトへ誘導する2股CTAテンプレート文",
  "dailyPosts": [
    {
      "day": "Tuesday",
      "theme": "火曜アービトラージテーマ",
      "caption": "火曜フルキャプション全文（本文＋2股CTA＋ハッシュタグを含む完全版）",
      "infographicData": {
        "type": "arbitrage",
        "cardName": "実在のカード名（※イラストではなく文字として画像に印字します）",
        "region": "US または EU または ASIA",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "$XX または €XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "画像内に大きく印字する短い英語の煽り文句（例: Massive Spread!）"
      }
    },
    { "day": "Wednesday", "theme": "水曜アービトラージテーマ", "caption": "水曜フルキャプション全文", "infographicData": { "type": "arbitrage", "cardName": "", "region": "US", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } },
    { "day": "Thursday", "theme": "木曜アービトラージテーマ", "caption": "木曜フルキャプション全文", "infographicData": { "type": "arbitrage", "cardName": "", "region": "US", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } },
    { "day": "Friday", "theme": "金曜アービトラージテーマ", "caption": "金曜フルキャプション全文", "infographicData": { "type": "arbitrage", "cardName": "", "region": "US", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } },
    { "day": "Saturday", "theme": "土曜アービトラージテーマ", "caption": "土曜フルキャプション全文", "infographicData": { "type": "arbitrage", "cardName": "", "region": "US", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

// 7. X (Twitter) 専任クリエイター（火曜〜土曜 5日分アービトラージ特化・140字フック ＆ 4ポストスレッド）
export async function runXPosts(chiefPackage: any, xAccountReport?: any, category: string = 'pokemon') {
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('x');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const prompt = `あなたは越境【${categoryName}】事業における【X (Twitter) 専任のプロクリエイター】です。
※現在「市場トレンド」および「的中実績」は保留中のため動作停止としています。**火曜日〜土曜日（Tuesday〜Saturday）の5日分をすべて「アービトラージ（価格差・実成約実績）」スレッド**として作成してください。

【チーフ・キュレーター編成パッケージ（火曜〜土曜のアービトラージ週間ラインナップ）】:
${JSON.stringify(chiefPackage, null, 2)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {}, null, 2)}

■ 必須発信ルール:
1. 【1ポスト目の140文字制限厳守（最重要）】:
   - 各曜日の mainPost（1ポスト目）は、改行・絵文字・ハッシュタグを含めて【絶対に140文字以内】で執筆すること（Gate 2 監査で自動検知されます）。
   - 1ポスト目には絶対に外部リンク（URL）を貼らないこと（アルゴリズムによる表示回数制限を回避するため）。画像4枚の視認案内とスレッド誘導を含めること。
2. 【火曜〜土曜 5日分のアービトラージスレッド作成】:
   - dailyThreads には "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" の5日分のみを含めてください。
   - ツリー2〜3ポスト目で北米・欧州・アジアの相場と国内相場の乖離・成約実績を対比させてください。
   - infographicData.type は必ず "arbitrage" としてください。
3. 【リンク配置ルール】:
   - VIP Discord ＆ 自社サイトURLへの誘導は、スレッド最終ポスト（またはリプライ欄想定文）にのみ配置すること。
4. 【撒き餌原則】:
   - 価格差や成約実績の事実（Fact & Result）のみを語り、仕入れ店舗名や具体的仕入れルートは絶対に漏洩させないこと。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "X用アービトラージ拡散フックテーマ",
  "xCallToAction": "固定ポストまたはリプライ欄に貼る誘導テキスト",
  "dailyThreads": [
    {
      "day": "Tuesday",
      "mainPost": "火曜1ポスト目（140文字以内厳守、フック＋インフォグラフィック画像参照＋ツリー誘導）",
      "threadPosts": [
        "ツリー2ポスト目: アービトラージ価格差・成約事実データ展開",
        "ツリー3ポスト目: 地域別乖離・注目ポイント",
        "ツリー4ポスト目: 2股CTA"
      ],
      "infographicData": {
        "type": "arbitrage",
        "cardName": "実在のカード名",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "$XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "Xのタイムラインで目を引く短い英語フック"
      }
    },
    { "day": "Wednesday", "mainPost": "水曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"], "infographicData": { "type": "arbitrage", "cardName": "", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } },
    { "day": "Thursday", "mainPost": "木曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"], "infographicData": { "type": "arbitrage", "cardName": "", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } },
    { "day": "Friday", "mainPost": "金曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"], "infographicData": { "type": "arbitrage", "cardName": "", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } },
    { "day": "Saturday", "mainPost": "土曜1ポスト目（140字以内）", "threadPosts": ["ツリー2", "ツリー3", "ツリー4"], "infographicData": { "type": "arbitrage", "cardName": "", "jpPrice": "", "overseasPrice": "", "spread": "", "roi": "", "hookText": "" } }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}