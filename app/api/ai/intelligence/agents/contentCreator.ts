// app/api/ai/intelligence/agents/contentCreator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { parseAIJson, getAgentRules, getCategoryName } from '../helpers';

const ARBITRAGE_DAYS = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type ContentDay = (typeof ALL_DAYS)[number];

function normalizeContentDay(targetDay?: string): ContentDay {
  if (!targetDay) return 'Thursday';
  const matched = ALL_DAYS.find((d) => d.toLowerCase() === targetDay.trim().toLowerCase());
  return matched || 'Thursday';
}

const PROXY_SERVICE_CTA_BLOCK = `━━━━━━━━━━━━━━━━━━━━━━
【Japanese Pokémon Card Sourcing & Proxy Service】
━━━━━━━━━━━━━━━━━━━━━━
Looking to source Japanese Pokémon cards for your shop or business?
We buy directly from Japanese markets and ship worldwide to your door!

✅ Flat 5% proxy fee only (No hidden costs)
✅ Low shipping rates: from ~$0.02 / card (approx. ¥3/card for bulk orders)
✅ 1-Click sourcing (We combine items from multiple shops into 1 box)

📌 Click the link in our bio to create your FREE account!
📩 Questions or bulk inquiries? Feel free to DM us on Instagram or send an email!

お問い合わせ・ご相談はインスタDMまたはメールよりお気軽にお問い合わせください。`;

// 6. Instagram専任投稿クリエイター（対象日1日分：火〜土アービトラージ / 日曜5日まとめ / 月曜サービス解説）
export async function runSnsPosts(
  chiefPackage: any,
  accountReport: any,
  category: string = 'pokemon',
  targetDay?: string
) {
  const day = normalizeContentDay(targetDay);
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('sns');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const isSundayDigest = day === 'Sunday';
  const isMondayServiceGuide = day === 'Monday';

  const modeInstruction = isSundayDigest
    ? `■ 本日の作成モード【日曜：火〜土5日分のまとめ（Weekly Digest）】:
   - 対象曜日は "${day}" の1日分のみ（dailyPosts には "${day}" を1件だけ含めてください）。
   - 5日分を無理に個別作文するのではなく、提供されたデータ（週間ラインナップ・選定銘柄・価格差・ROI）をもとに、今週の注目アービトラージハイライト・価格差/ROIの比較ポイントを分かりやすくまとめたダイジェスト投稿を作成してください。
   - キャプション（caption）および hookText は英語（English）で執筆してください。`
    : isMondayServiceGuide
    ? `■ 本日の作成モード【月曜：自社代理購入サービスの解説】:
   - 対象曜日は "${day}" の1日分のみ（dailyPosts には "${day}" を1件だけ含めてください）。
   - 海外のカードショップ・リセラー・大口コレクター向けに、自社の越境代理購入サービス（手数料5%、複数ショップからの一括同梱・1箱まとめ発送、国際送料の目安 from ~$0.02 / card 約¥3/枚〜、1クリック追加・アカウント登録、プロフィールリンク／DM／メール導線）を分かりやすく解説する投稿を作成してください。
   - キャプション（caption）および hookText は英語（English）で執筆してください。`
    : `■ 本日の作成モード【${day}：1日分のアービトラージ投稿】:
   - 対象曜日は "${day}" の1日分のみ（dailyPosts には "${day}" を1件だけ含めてください）。火〜土5日分をまとめて作文・割り当てしないでください。
   - 本日のリサーチ・選定データ（その日の価格帯・実成約実績・粗利/ROI・地域比較）をもとに、${day} 分のアービトラージ投稿1本を作成してください。
   - キャプション（caption）および hookText は英語（English）で執筆してください。`;

  const prompt = `あなたは越境【${categoryName}】事業における【Instagram専任のトップセールスクリエイター】です。

【私たちの最終ゴール（KGI）】
海外で日本語版トレカを取り扱う事業者（カードショップ・リセラー・大口コレクター）に向け、
自社の【越境代理購入サービス】への利用・アカウント登録を促すこと（プロフィールリンクへ誘導）。
※英語非ネイティブのバイヤーでもスムーズに理解できるよう、難解な語彙を避けたシンプルで自然なビジネス英語を用いてください。

${modeInstruction}

【参照データ（チーフパッケージ／週間実績／選定候補）】:
${JSON.stringify(chiefPackage, null, 2)}

【IGアナリストからの直近分析＆制作レギュレーション】:
${JSON.stringify(accountReport, null, 2)}

■ 共通制作ルール:
1. 【答えを教えない撒き餌原則（Hook & Hold）】:
   - 開示するのは価格差・成約実績・サービスメリットなどの事実（Fact & Result）のみ。
   - 日本国内の仕入れ店舗名、仕入れルート、詳細ノウハウ（Action & Reason）は絶対に投稿本文に書かないこと（Gate 2 監査で弾かれます）。
2. 【英語CTA配置（各キャプション末尾にそのまま配置）】:
   - caption 本文の末尾には、以下のブロックをそのまま配置すること:

${PROXY_SERVICE_CTA_BLOCK}
3. 【画像生成データの出力原則（最重要）】:
   - 著作権およびVeRO違反を防ぐため、カードのイラスト画像や他者の撮影画像は絶対に使用しません。
   - システムが「価格差インフォグラフィック」を自動生成（合成）するためのテキストデータ（infographicData）を出力してください。infographicData.type は必ず "arbitrage" としてください。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "${day}の投稿テーマ",
  "recommendedTiming": "アナリスト推奨に基づく最適な投稿時間帯（例: 日本時間 21:00）",
  "hashtags": [
    "#PokemonTCG", "#PokemonCards", "#PokemonWholesale", "#JapanesePokemonCards", "#B2B", "#PokemonReseller", "#WorldwideJaPan"
  ],
  "dailyPosts": [
    {
      "day": "${day}",
      "theme": "${day}の投稿テーマ",
      "caption": "${day}のフルキャプション全文（本文＋CTA＋ハッシュタグを含む完全版）",
      "infographicData": {
        "type": "arbitrage",
        "cardName": "${isMondayServiceGuide ? 'Japan Proxy Sourcing Service' : '実在のカード名または週間ハイライト名'}",
        "region": "US",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "$XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "画像内に大きく印字する短い英語フレーズ"
      }
    }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

// 7. X (Twitter) 専任クリエイター（対象日1日分：火〜土アービトラージ / 日曜5日まとめ / 月曜サービス解説）
export async function runXPosts(
  chiefPackage: any,
  xAccountReport?: any,
  category: string = 'pokemon',
  targetDay?: string
) {
  const day = normalizeContentDay(targetDay);
  const categoryName = getCategoryName(category);
  const rules = await getAgentRules('x');
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3,
    maxOutputTokens: 8192,
  });

  const isSundayDigest = day === 'Sunday';
  const isMondayServiceGuide = day === 'Monday';

  const modeInstruction = isSundayDigest
    ? `■ 本日の作成モード【日曜：火〜土5日分のまとめ（Weekly Digest）】:
   - 対象曜日は "${day}" の1日分のみ（dailyThreads には "${day}" を1件だけ含めてください）。
   - 提供されたデータをもとに、今週の注目アービトラージ銘柄・価格差/ROI・比較ポイントをまとめたスレッドを作成してください。`
    : isMondayServiceGuide
    ? `■ 本日の作成モード【月曜：自社代理購入サービスの解説】:
   - 対象曜日は "${day}" の1日分のみ（dailyThreads には "${day}" を1件だけ含めてください）。
   - 海外バイヤー・リセラー向けに、自社代理購入サービス（手数料5%、複数ショップ一括同梱、国際送料目安 from ~$0.02 / card 約¥3/枚〜、登録・プロフ/DM導線）を分かりやすく解説するスレッドを作成してください。`
    : `■ 本日の作成モード【${day}：1日分のアービトラージスレッド】:
   - 対象曜日は "${day}" の1日分のみ（dailyThreads には "${day}" を1件だけ含めてください）。火〜土5日分をまとめて作文・割り当てしないでください。
   - 本日のリサーチ・選定データをもとに、${day} 分のアービトラージスレッド1本を作成してください。`;

  const prompt = `あなたは越境【${categoryName}】事業における【X (Twitter) 専任のプロクリエイター】です。

${modeInstruction}

【参照データ（チーフパッケージ／週間実績／選定候補）】:
${JSON.stringify(chiefPackage, null, 2)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {}, null, 2)}

■ 必須発信ルール:
1. 【1ポスト目の140文字制限厳守（最重要）】:
   - mainPost（1ポスト目）は、改行・絵文字・ハッシュタグを含めて【絶対に140文字以内】で執筆すること（Gate 2 監査で自動検知されます）。
   - 1ポスト目には絶対に外部リンク（URL）を貼らないこと（アルゴリズムによる表示回数制限を回避するため）。画像視認案内とスレッド誘導を含めること。
2. 【スレッド構成】:
   - dailyThreads には "${day}" の1件のみを含めてください。
   - threadPosts（2〜4ポスト目）で要点を分かりやすく展開してください。
   - infographicData.type は必ず "arbitrage" としてください。
3. 【リンク配置ルール】:
   - 自社サイト・プロフィール・連絡先への誘導は、スレッド最終ポスト（またはリプライ欄想定文）にのみ配置すること。
4. 【撒き餌原則】:
   - 事実（Fact & Result）のみを語り、仕入れ店舗名や具体的仕入れルートは絶対に漏洩させないこと。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "${day}のX投稿テーマ",
  "xCallToAction": "固定ポストまたはリプライ欄に貼る誘導テキスト",
  "dailyThreads": [
    {
      "day": "${day}",
      "mainPost": "${day}の1ポスト目（140文字以内厳守、フック＋画像参照＋ツリー誘導）",
      "threadPosts": [
        "ツリー2ポスト目: 要点解説",
        "ツリー3ポスト目: 比較・補足ポイント",
        "ツリー4ポスト目: CTA・誘導"
      ],
      "infographicData": {
        "type": "arbitrage",
        "cardName": "${isMondayServiceGuide ? 'Japan Proxy Sourcing Service' : '実在のカード名または週間ハイライト名'}",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "$XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "Xのタイムラインで目を引く短い英語フック"
      }
    }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

export { ARBITRAGE_DAYS, ALL_DAYS };