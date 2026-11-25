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

// 6. Instagram専任投稿クリエイター
// - 火〜土: 北米(US)レポートベース1投稿 ＋ 欧州(EU)レポートベース1投稿（1日2投稿・各投稿に個別ハッシュタグ）
// - 日曜: 5日まとめ / 月曜: 代理購入サービス解説
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
   - 対象曜日は "${day}" です。
   - 提供されたデータ（週間ラインナップ・選定銘柄・価格差・ROI）をもとに、今週の注目アービトラージハイライト・価格差/ROIの比較ポイントをまとめたダイジェスト投稿を作成してください。
   - dailyPosts には "${day}" の投稿を1件以上含め、各投稿に個別の hashtags 配列を付与してください。
   - キャプション（caption）および hookText は英語（English）で執筆してください。`
    : isMondayServiceGuide
    ? `■ 本日の作成モード【月曜：自社代理購入サービスの解説】:
   - 対象曜日は "${day}" です。
   - 海外のカードショップ・リセラー・大口コレクター向けに、自社の越境代理購入サービス（手数料5%、複数ショップからの一括同梱・1箱まとめ発送、国際送料の目安 from ~$0.02 / card 約¥3/枚〜、1クリック追加・アカウント登録、プロフィールリンク／DM／メール導線）を分かりやすく解説する投稿を作成してください。
   - dailyPosts には "${day}" の投稿を1件以上含め、各投稿に個別の hashtags 配列を付与してください。
   - キャプション（caption）および hookText は英語（English）で執筆してください。`
    : `■ 本日の作成モード【${day}：1日2投稿（北米USレポートベース1本 ＋ 欧州EUレポートベース1本）】:
   - 対象曜日は "${day}" です。5日分をまとめて作文・割り当てしないでください。
   - 1つ目は【北米（US）向けアービトラージレポート／候補（region: "US"）】をもとに1投稿を作成してください。
   - 2つ目は【欧州（EU）向けアービトラージレポート／候補（region: "EU"）】をもとに1投稿を作成してください。
   - 各投稿（US投稿・EU投稿）ごとに、その地域・対象カード・価格帯・仕様に合わせた【個別の hashtags 配列】を生成してください（US向けとEU向けで同じタグの丸写しにせず、各市場に最適化したタグを選定してください）。
   - キャプション（caption）および hookText は英語（English）で執筆してください。`;

  const prompt = `あなたは越境【${categoryName}】事業における【Instagram専任のトップセールスクリエイター】です。

【私たちの最終ゴール（KGI）】
海外で日本語版トレカを取り扱う事業者（カードショップ・リセラー・大口コレクター）に向け、
自社の【越境代理購入サービス】への利用・アカウント登録を促すこと（プロフィールリンクへ誘導）。
※英語非ネイティブのバイヤーでもスムーズに理解できるよう、難解な語彙を避けたシンプルで自然なビジネス英語を用いてください。

${modeInstruction}

【参照データ（US/EUレポート・チーフパッケージ・選定候補）】:
${JSON.stringify(chiefPackage, null, 2)}

【IGアナリストからの直近分析＆制作レギュレーション】:
${JSON.stringify(accountReport, null, 2)}

■ 共通制作ルール:
1. 【答えを教えない撒き餌原則（Hook & Hold）】:
   - 開示するのは価格差・成約実績・サービスメリットなどの事実（Fact & Result）のみ。
   - 日本国内の仕入れ店舗名、仕入れルート、詳細ノウハウや攻略法・解説（Action & Reason）は絶対に投稿本文に書かないこと（Gate 2 監査で弾かれます）。
   - ノーマルとミラー/鑑定品など仕様差がある場合は、誤解のないよう状態・仕様の事実を簡潔に明記してください。
2. 【英語CTA配置（各キャプション末尾にそのまま配置）】:
   - 各投稿の caption 本文の末尾には、以下のブロックをそのまま配置すること:

${PROXY_SERVICE_CTA_BLOCK}
3. 【画像生成データの出力原則（最重要）】:
   - 著作権およびVeRO違反を防ぐため、カードのイラスト画像や他者の撮影画像は絶対に使用しません。
   - システムが「価格差インフォグラフィック」を自動生成（合成）するためのテキストデータ（infographicData）を各投稿に出力してください。infographicData.type は必ず "arbitrage" としてください。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "${day}の投稿テーマ",
  "recommendedTiming": "アナリスト推奨に基づく最適な投稿時間帯（例: 日本時間 21:00）",
  "hashtags": ["#PokemonTCG", "#JapanesePokemonCards", "#PokemonWholesale"],
  "dailyPosts": [
    {
      "day": "${day}",
      "region": "US",
      "theme": "${day} 北米(US)アービトラージ投稿テーマ",
      "hashtags": ["#PokemonTCG", "#eBayUS", "#USD", "#JapanesePokemonCards", "#PokemonWholesale", "#PokemonReseller"],
      "caption": "${day} 北米(US)向けフルキャプション全文（本文＋CTA＋この投稿のhashtags）",
      "infographicData": {
        "type": "arbitrage",
        "cardName": "USレポートから選んだ実在のカード名",
        "region": "US",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "$XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "US投稿用の短い英語フック"
      }
    },
    {
      "day": "${day}",
      "region": "EU",
      "theme": "${day} 欧州(EU)アービトラージ投稿テーマ",
      "hashtags": ["#PokemonTCG", "#Cardmarket", "#EUR", "#JapanesePokemonCards", "#PokemonWholesale", "#TCGCollector"],
      "caption": "${day} 欧州(EU)向けフルキャプション全文（本文＋CTA＋この投稿のhashtags）",
      "infographicData": {
        "type": "arbitrage",
        "cardName": "EUレポートから選んだ実在のカード名",
        "region": "EU",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "€XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "EU投稿用の短い英語フック"
      }
    }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

// 7. X (Twitter) 専任クリエイター
// - 火〜土: 北米(US)レポートベース1スレッド ＋ 欧州(EU)レポートベース1スレッド（1日2スレッド・各投稿に個別ハッシュタグ）
// - 日曜: 5日まとめ / 月曜: 代理購入サービス解説
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
   - 対象曜日は "${day}" です。
   - 提供されたデータをもとに、今週の注目アービトラージ銘柄・価格差/ROI・比較実績を事実ベースでまとめたスレッドを作成してください。
   - dailyThreads の各エントリに個別の hashtags 配列を付与してください。`
    : isMondayServiceGuide
    ? `■ 本日の作成モード【月曜：自社代理購入サービスの解説】:
   - 対象曜日は "${day}" です。
   - 海外バイヤー・リセラー向けに、自社代理購入サービス（手数料5%、複数ショップ一括同梱、国際送料目安 from ~$0.02 / card 約¥3/枚〜、登録・プロフ/DM/メール導線）の仕様とメリットを事実ベースで案内するスレッドを作成してください。
   - dailyThreads の各エントリに個別の hashtags 配列を付与してください。`
    : `■ 本日の作成モード【${day}：1日2スレッド（北米USレポートベース1本 ＋ 欧州EUレポートベース1本）】:
   - 対象曜日は "${day}" です。5日分をまとめて作文・割り当てしないでください。
   - 1つ目は【北米（US）向けアービトラージレポート／候補（region: "US"）】をもとに1スレッドを作成してください。
   - 2つ目は【欧州（EU）向けアービトラージレポート／候補（region: "EU"）】をもとに1スレッドを作成してください。
   - 各スレッド（US向け・EU向け）ごとに、その地域・対象カード・価格帯・仕様に合わせた【個別の hashtags 配列】を生成してください。`;

  const prompt = `あなたは越境【${categoryName}】事業における【X (Twitter) 専任のプロクリエイター】です。

${modeInstruction}

【参照データ（US/EUレポート・チーフパッケージ・選定候補）】:
${JSON.stringify(chiefPackage, null, 2)}

【Xアナリストの戦術指示】:
${JSON.stringify(xAccountReport || {}, null, 2)}

■ 必須発信ルール:
1. 【1ポスト目の140文字制限厳守（最重要）】:
   - 各スレッドの mainPost（1ポスト目）は、改行・絵文字・ハッシュタグを含めて【絶対に140文字以内】で執筆すること（Gate 2 監査で自動検知されます）。
   - 1ポスト目には絶対に外部リンク（URL）を貼らないこと（アルゴリズムによる表示回数制限を回避するため）。
   - 「解説します」「攻略法」「始め方」「ノウハウ」などの解説・指南表現は使わず、価格差・成約実績などの事実と画像・ツリー参照の案内のみを書いてください。
2. 【スレッド構成】:
   - threadPosts（2〜4ポスト目）では、ノウハウ解説や指南・コツの説明は行わず、対象銘柄の価格差・成約実績・仕様事実と、代理購入サービス／プロフィールリンク・DM・メール導線のみを簡潔に提示してください。
   - infographicData.type は必ず "arbitrage" としてください。
3. 【リンク配置ルール】:
   - 自社サイト・プロフィール・連絡先への誘導は、スレッド最終ポスト（またはリプライ欄想定文）にのみ配置すること。
4. 【撒き餌原則】:
   - 事実（Fact & Result）のみを語り、仕入れ店舗名や具体的仕入れルート、仕入れノウハウ・解説は絶対に書かないこと。
   - ノーマルとミラー/鑑定品など仕様差がある場合は、誤解のないよう状態・仕様の事実を簡潔に明記してください。

${rules}

以下のJSON形式のみを出力してください（Markdown装飾や前後の解説テキストは不要です）:
{
  "theme": "${day}のX投稿テーマ",
  "xCallToAction": "固定ポストまたはリプライ欄に貼る誘導テキスト",
  "dailyThreads": [
    {
      "day": "${day}",
      "region": "US",
      "hashtags": ["#PokemonTCG", "#eBayUS", "#USD", "#JapanesePokemonCards", "#PokemonWholesale"],
      "mainPost": "${day} 北米(US)1ポスト目（140文字以内厳守・事実と画像/ツリー案内のみ・解説表現禁止）",
      "threadPosts": [
        "ツリー2ポスト目: US市場の銘柄・価格・成約実績の事実",
        "ツリー3ポスト目: 仕様・グレード・差額/ROIの事実",
        "ツリー4ポスト目: 代理購入サービス概要・プロフ/DM/メール導線"
      ],
      "infographicData": {
        "type": "arbitrage",
        "cardName": "USレポートから選んだ実在のカード名",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "$XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "US投稿用の短い英語フック"
      }
    },
    {
      "day": "${day}",
      "region": "EU",
      "hashtags": ["#PokemonTCG", "#Cardmarket", "#EUR", "#JapanesePokemonCards", "#PokemonWholesale"],
      "mainPost": "${day} 欧州(EU)1ポスト目（140文字以内厳守・事実と画像/ツリー案内のみ・解説表現禁止）",
      "threadPosts": [
        "ツリー2ポスト目: EU市場の銘柄・価格・成約実績の事実",
        "ツリー3ポスト目: 仕様・グレード・差額/ROIの事実",
        "ツリー4ポスト目: 代理購入サービス概要・プロフ/DM/メール導線"
      ],
      "infographicData": {
        "type": "arbitrage",
        "cardName": "EUレポートから選んだ実在のカード名",
        "jpPrice": "¥X,XXX",
        "overseasPrice": "€XX",
        "spread": "+¥X,XXX",
        "roi": "XX%",
        "hookText": "EU投稿用の短い英語フック"
      }
    }
  ]
}`;

  const res = await model.invoke(prompt);
  return parseAIJson(res.content.toString());
}

export { ARBITRAGE_DAYS, ALL_DAYS };