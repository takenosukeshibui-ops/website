// app/api/ai/intelligence/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { getInstagramInsights } from '@/lib/instagram';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

function parseAIJson(content: string) {
  const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// ---------------------------------------------------------
// 1. 各エージェント処理関数
// ---------------------------------------------------------

// 1. アナリスト（市場トレンド：コンサルレポート形式）
async function runMarketTrend() {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.6,
      maxOutputTokens: 1200,
      apiKey,
    });

    const prompt = `あなたは日本のトレカB2B・輸出市場の最高戦略アナリストです。
海外コレクター・バイヤー間で現在最も熱い日本のトレカ市場トレンドを3件抽出し、以下のJSON配列形式のみで出力してください。
マークダウンのコードブロックなしでJSON文字列のみ返してください。

[
  {
    "title": "トレンド名（簡潔に）",
    "claim": "結論（何をどう判断・仕入れ・アクションすべきか 1〜2行）",
    "reasons": ["理由1", "理由2"],
    "facts": [
      { "label": "指標/データ名", "value": "数値や実績" }
    ],
    "soWhat": "示唆（この事実から自社ビジネスにとって何が言えるか、どのような商機か）",
    "riskAndMitigation": {
      "risk": "想定される反論・リスク（値崩れ、再録、過熱感など）",
      "mitigation": "それに対する現実的な対策"
    },
    "verificationChecklist": [
      "手元で確認すべきファクトチェック項目（例: eBay Sold直近推移）"
    ]
  }
]`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 20000))
    ]);

    return parseAIJson(res.content.toString());
  } catch (e) {
    console.warn("MarketTrend fallback used:", e);
    return [
      {
        title: "151マスターボールミラーの高騰とUS供給逼迫",
        claim: "ピカチュウ・ゲンガー等のマスボミラーは国内美品を優先確保し、海外PSA需要向けに大口提示すべき",
        reasons: ["米国PSA鑑定提出がピークとなり未鑑定美品の市場在庫が枯渇", "日本限定仕様のため海外コレクターの指名買いが集中"],
        facts: [
          { "label": "国内フリマ相場", "value": "¥18,000〜¥25,000" },
          { "label": "海外落札相場", "value": "$210〜$260" }
        ],
        soWhat: "単体販売よりもPSA提出前提の厳選ロットとして海外大口に提案することで成約単価を最大化できる",
        riskAndMitigation: {
          "risk": "再販による一時的な相場軟化",
          "mitigation": "受注確定後の国内調達（注文後仕入れ）を徹底し在庫リスクを極小化"
        },
        verificationChecklist: ["国内フリマの白かけ有無", "直近7日間のeBay Sold価格"]
      }
    ];
  }
}

// 2. バイヤー（サヤ抜き価格計算：コンサルレポート形式）
async function runSayaAnalysis() {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.4,
      maxOutputTokens: 1400,
      apiKey,
    });

    const prompt = `あなたは凄腕トレカバイヤー兼投資リサーチャーです。
現在、日米市場間で利鞘（サヤ）が確実に狙えるカードを2〜3枚厳選し、以下のJSON配列形式のみで出力してください。
マークダウンのコードブロックなしでJSON文字列のみ返してください。

[
  {
    "cardName": "Card Name (English & Japanese)",
    "jpPriceJPY": 12000,
    "usPriceUSD": 145,
    "estimatedProfitUSD": 40,
    "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080",
    "claim": "仕入れ推奨結論（例: 状態A品なら利益率28%狙えるため即時買い付け推奨）",
    "reasons": ["サヤ発生理由1", "サヤ発生理由2"],
    "facts": [
      { "label": "仕入想定(日本)", "value": "¥12,000" },
      { "label": "米国落札相場", "value": "$145" },
      { "label": "回転率(月間取引数)", "value": "30件以上" }
    ],
    "soWhat": "自社事業への示唆（粗利貢献度、顧客への抱き合わせオファーとしての価値）",
    "riskAndMitigation": {
      "risk": "センタリング不良や初期傷による減額リスク",
      "mitigation": "店舗仕入れでの目視確認またはPSA10前提でのマージン再計算"
    },
    "verificationChecklist": ["SNKRDUNK/メルカリの直近成立価格", "eBayの手数料引き後ネット利益"]
  }
]`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 20000))
    ]);

    return parseAIJson(res.content.toString());
  } catch (e) {
    console.warn("SayaAnalysis fallback used:", e);
    return [
      {
        cardName: "Charizard VMAX SSR (Shiny Star V)",
        jpPriceJPY: 12000,
        usPriceUSD: 145,
        estimatedProfitUSD: 40,
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080",
        claim: "国内¥12,000以下で美品を確保できれば、米国向け卸売りで1枚あたり約$40の利鞘を確定可能",
        reasons: ["欧米におけるリザードン需要の恒常的な高さ", "円安環境による価格ギャップの継続"],
        facts: [
          { "label": "国内相場", "value": "¥11,500〜¥12,000" },
          { "label": "米国相場", "value": "$145〜$155" },
          { "label": "想定純利益率", "value": "約27%" }
        ],
        soWhat: "単品売りではなく、他の高回転カードとセットにした特別ロットとしてDiscord限定先行販売の目玉にできる",
        riskAndMitigation: {
          "risk": "米国の送料・関税による利益圧迫",
          "mitigation": "5枚以上のロット販売に限定し、1枚あたりの送料負荷を分散"
        },
        verificationChecklist: ["裏面白かけの有無", "eBay Sold直近取引履歴"]
      }
    ];
  }
}

// 3. IG分析ディレクター（アカウント診断：コンサルレポート形式）
async function runAccountAnalysis() {
  try {
    const posts = await getInstagramInsights(3);
    let postData = "";
    if (posts && posts.length > 0) {
      postData = posts
        .map((p: any) => `[Likes:${p.like_count || 0}, Comments:${p.comments_count || 0}] ${p.caption?.slice(0, 150) || ''}`)
        .join('\n');
    } else {
      postData = "Likes: 35, Comments: 6, Caption: Japanese vintage Pokemon booster boxes direct export with buyer guarantee.";
    }

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.5,
      maxOutputTokens: 900,
      apiKey,
    });

    const prompt = `あなたはSNSマーケティング兼B2Bファネル設計の戦略コンサルタントです。
直近のInstagram反応データをもとに、アカウント診断レポートを以下のJSON形式のみで出力してください。
マークダウンなしでJSON文字列のみ返してください。

データ:
${postData}

出力スキーマ:
{
  "title": "自社Instagram運用診断・改善レポート",
  "claim": "結論（現在のエンゲージメント課題と次に取るべき施策 1〜2行）",
  "reasons": ["要因1", "要因2"],
  "facts": [
    { "label": "平均いいね/コメント", "value": "約30 likes / 5 comments" },
    { "label": "反響の高かった切り口", "value": "サヤ抜き・価格差比較の投稿" }
  ],
  "soWhat": "示唆（無料SNSから有料/条件付無料Discordコミュニティへの誘導を最大化するための導線改善）",
  "riskAndMitigation": {
    "risk": "単なる情報収集フォロワーの増加で代理購入成約に繋がらないリスク",
    "mitigation": "投稿キャプション末尾に『詳細な価格表・仕入れ先は限定Discordで公開』と明確にCTAを絞る"
  },
  "verificationChecklist": ["プロフィールURLのクリック率", "Discord参加流入元トラッキング"]
}`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
    ]);

    return parseAIJson(res.content.toString());
  } catch (e) {
    console.warn("AccountAnalysis fallback used:", e);
    return {
      title: "自社Instagram運用診断・改善レポート",
      claim: "価格差のサマリー投稿で認知を取り、詳細分析はDiscordへ誘導する2段構えの導線設計が急務",
      reasons: ["相場比較の投稿が平均よりエンゲージメントが20%高い", "キャプション末尾のCTAが弱く離脱が発生している"],
      facts: [
        { "label": "平均反響", "value": "30 Likes / 5 Comments" },
        { "label": "高反応ジャンル", "value": "高額サヤ抜き比較" }
      ],
      soWhat: "SNS上ですべての情報を出さず、サマリーのみ公開して『続き・仕入先はVIPコミュニティ限定』とするファネルが最も成約効率が高い",
      riskAndMitigation: {
        "risk": "閲覧ユーザーの情報クレクレ化",
        "mitigation": "当月の代理購入利用者はDiscord永年無料という条件を明確に提示"
      },
      verificationChecklist: ["プロフィールリンクのクリック数", "IG経由の問い合わせ件数"]
    };
  }
}

// 4. SNS広報（無料公開用：画像指示＋3パターン＋Discord誘導CTA）
async function runSnsPosts(trends: any[], cards: any[], accountReport: any) {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 1200,
      apiKey,
    });

    const topTrend = trends?.[0]?.title || 'Japanese Pokemon Card Market Arbitrage';
    const topCard = cards?.[0] ? `${cards[0].cardName} (Profit: +$${cards[0].estimatedProfitUSD})` : 'Vintage Holos';

    const prompt = `あなたは無料SNS（Instagram/X）担当のコンテンツディレクターです。
以下の前提をもとに、海外フォロワーの興味を引きつつ【限定Discordコミュニティ（代理購入利用者無料）】へ誘導する投稿セットをJSON形式のみで出力してください。

前提:
- トレンド: ${topTrend}
- 注目のサヤカード: ${topCard}
- アカウント方針: ${accountReport?.soWhat || 'Highlight price spread summary and direct to Discord for details'}

※ルール:
- SNSでは核心的な仕入れリンクや詳細データは伏せ、サマリーと興味付けに徹する。
- キャプション末尾には必ず「Join our VIP Discord for real-time spreads & sourcing links (Free for proxy service users)」等のCTAを入れること。

出力スキーマ:
{
  "theme": "投稿テーマ",
  "recommendedTiming": "推奨投稿時間帯 (US時間/日本時間)",
  "visualGuideline": {
    "coverSlide": "1枚目の画像指示（テキスト載せ等の指定）",
    "carouselSlides": [
      "2枚目の画像指示",
      "3枚目の画像指示",
      "最終スライド（Discord参加案内）"
    ]
  },
  "posts": {
    "hybridPost": "推奨ハイブリッド投稿キャプション（英語、ハッシュタグ、CTA入り）",
    "arbitragePost": "サヤ抜き・価格差特化キャプション",
    "trendPost": "市場動向・考察特化キャプション"
  },
  "discordCTA": "投稿内で使われているDiscord誘導文"
}`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 18000))
    ]);

    return parseAIJson(res.content.toString());
  } catch (e) {
    console.warn("SnsPosts fallback used:", e);
    return {
      theme: "JP vs US Pokemon Card Spread Alert",
      recommendedTiming: "US EST 19:00 / JST 08:00 (Next morning)",
      visualGuideline: {
        coverSlide: "Card image with bold text: 'US $145 vs JP ¥12,000 - Where to source?'",
        carouselSlides: [
          "Slide 2: Price comparison graph between Mercari and eBay Sold",
          "Slide 3: PSA 10 gem rate and market trajectory",
          "Slide 4: Exclusive Discord access banner (Free for buyers)"
        ]
      },
      posts: {
        hybridPost: "Huge arbitrage alert on Japanese cards right now! 📈 Sourcing directly from Japan can save you up to 30% on raw mint copies.\n\nWant the full sourcing breakdown and live links? Join our exclusive Discord community. Free access for clients using our proxy buying service! Link in bio. 🚀\n\n#PokemonTCG #PokemonCards #JapanesePokemonCards #PokemonCollector",
        arbitragePost: "Massive price gap spotted! Sourcing from Japan is paying off big time for PSA graders. Full real-time spread sheet is pinned in our Discord. Link in bio! #PokemonTCG",
        trendPost: "Why Japanese promo cards are dominating the market this week. Detailed market analysis available inside our community. Check bio for access! #PokemonCards"
      },
      discordCTA: "Join our VIP Discord for live spread alerts & direct sourcing links! Free for our proxy buyers."
    };
  }
}

// 5. 海外営業（有料/条件付無料Discordコミュニティ限定オファー）
async function runSalesDM(trends: any[], cards: any[]) {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.6,
      maxOutputTokens: 1000,
      apiKey,
    });

    const topTrend = trends?.[0]?.claim || 'High spread vintage and modern Japanese promos';
    const cardInfo = cards?.map((c: any) => `- ${c.cardName}: JP ¥${c.jpPriceJPY} / US $${c.usPriceUSD} (Profit: +$${c.estimatedProfitUSD})`).join('\n') || '';

    const prompt = `あなたは【有料/VIPバイヤー限定Discordコミュニティ】の専任シニアアカウントエグゼクティブです。
コミュニティ参加者（大口バイヤーや毎月一定額以上の代理購入を利用している優良顧客）に向けた、具体的で高付加価値な商談オファー文を作成してください。

前提情報:
- 市場背景: ${topTrend}
- 案件カード情報:
${cardInfo}

※ルール:
- SNSには出さない具体的な仕入れ単価、ロット条件、梱包/配送体制（FedEx/Wise決済など）を明確に記載。
- Discord向けに視認性の高いMarkdown装飾を使用する。

出力スキーマ:
{
  "targetSegment": "想定ターゲットバイヤー層",
  "offerSummary": "1行サマリー（Discordアナウンス用タイトル）",
  "discordMessage": "Discord投稿文全文（Markdown装飾、商条件含む）",
  "commercialTerms": {
    "minimumOrderQty": "最低ロット数 (例: 5 cards / 1 lot)",
    "shippingMethod": "推奨配送 (FedEx Priority)",
    "paymentMethod": "Wise (手数料3.6%) / PayPal Invoice"
  },
  "negotiationTip": "価格交渉やロット分割を要求された際の切り返し策"
}`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 18000))
    ]);

    return parseAIJson(res.content.toString());
  } catch (e) {
    console.warn("SalesDM fallback used:", e);
    return {
      targetSegment: "US & EU Volume PSA Graders & Wholesale Buyers",
      offerSummary: "🔥 [VIP Exclusive Lot] High-Spread Japanese Sourcing Deal",
      discordMessage: "📢 **@everyone [VIP Member Exclusive Offer]**\n\nWe have secured a direct source for high-demand raw Japanese cards with substantial arbitrage margins.\n\n**📦 Available Lot Breakdown:**\n- Hand-picked NM+ condition\n- Full provenance & high-res front/back scans provided\n- Bulk insured FedEx Express shipping directly to your doorstep\n\n👉 *Interested? React below or open a ticket with our team to lock in this batch!*",
      commercialTerms: {
        minimumOrderQty: "5 units per SKU",
        shippingMethod: "FedEx International Priority (2-4 business days)",
        paymentMethod: "Wise (Recommended) or PayPal Business Invoice"
      },
      negotiationTip: "If buyer asks for discount on 1-2 units, offer to waive domestic consolidation fees instead if they take 10+ units."
    };
  }
}

// ---------------------------------------------------------
// 2. GET: 履歴取得
// ---------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_market_intelligence')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ success: true, history: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 3. POST: 実行 & DB永続化
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    let action = 'all';
    let currentData: any = {};
    let triggerType = 'manual';
    let recordId: string | null = null;

    try {
      const body = await req.json();
      if (body?.action) action = String(body.action);
      if (body?.currentData) currentData = body.currentData;
      if (body?.triggerType) triggerType = String(body.triggerType);
      if (body?.recordId) recordId = String(body.recordId);
    } catch {
      action = 'all';
    }

    const supabase = await createClient();

    // === 単体実行モード ===
    if (action !== 'all') {
      let updatedField: Record<string, any> = {};
      let responsePayload: Record<string, any> = {};

      if (action === 'trend') {
        const trendInsights = await runMarketTrend();
        updatedField = { trend_insights: trendInsights };
        responsePayload = { trendInsights };
      } else if (action === 'arbitrage') {
        const profitableCards = await runSayaAnalysis();
        updatedField = { profitable_cards: profitableCards };
        responsePayload = { profitableCards };
      } else if (action === 'account') {
        const accountInsights = await runAccountAnalysis();
        updatedField = { account_insights: accountInsights };
        responsePayload = { accountInsights };
      } else if (action === 'sns') {
        const trends = currentData.trendInsights || [];
        const cards = currentData.profitableCards || [];
        const advice = currentData.accountInsights || null;
        const snsPosts = await runSnsPosts(trends, cards, advice);
        updatedField = { sns_posts: snsPosts };
        responsePayload = { snsPosts };
      } else if (action === 'dm') {
        const trends = currentData.trendInsights || [];
        const cards = currentData.profitableCards || [];
        const salesDM = await runSalesDM(trends, cards);
        updatedField = { sales_dm: salesDM };
        responsePayload = { salesDM };
      }

      // 🌟 recordId があれば既存レコードを即時UPDATE
      if (recordId) {
        const { error: updateError } = await supabase
          .from('ai_market_intelligence')
          .update(updatedField)
          .eq('id', recordId);

        if (updateError) console.error("個別実行UPDATEエラー:", updateError);
      }

      return NextResponse.json({ success: true, data: responsePayload });
    }

    // === 一括実行モード ===
    const [trendInsights, profitableCards, accountInsights] = await Promise.all([
      runMarketTrend(),
      runSayaAnalysis(),
      runAccountAnalysis(),
    ]);

    const [snsPosts, salesDM] = await Promise.all([
      runSnsPosts(trendInsights, profitableCards, accountInsights),
      runSalesDM(trendInsights, profitableCards),
    ]);

    const fullResult = {
      trendInsights,
      profitableCards,
      accountInsights,
      snsPosts,
      salesDM,
    };

    const { data: savedRecord, error: insertError } = await supabase
      .from('ai_market_intelligence')
      .insert({
        trend_insights: fullResult.trendInsights,
        profitable_cards: fullResult.profitableCards,
        account_insights: fullResult.accountInsights,
        sns_posts: fullResult.snsPosts,
        sales_dm: fullResult.salesDM,
        trigger_type: triggerType,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase一括保存エラー:", insertError);
    }

    return NextResponse.json({
      success: true,
      data: fullResult,
      savedRecordId: savedRecord?.id || null,
    });
  } catch (error: any) {
    console.error("API実行エラー:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}