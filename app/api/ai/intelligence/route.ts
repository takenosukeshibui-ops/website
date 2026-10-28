// app/api/ai/intelligence/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { getInstagramInsights } from '@/lib/instagram';

// ---------------------------------------------------------
// 1. State（共有ノート）の定義
// ---------------------------------------------------------
const GraphState = Annotation.Root({
  trendInsights: Annotation<string[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
  profitableCards: Annotation<{
    cardName: string;
    jpPriceJPY: number;
    usPriceUSD: number;
    estimatedProfitUSD: number;
    reason: string;
    imageUrl?: string;
  }[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
  accountInsights: Annotation<string>({
    reducer: (curr, next) => next,
    default: () => "",
  }),
  snsPosts: Annotation<{
    trendPost: string;
    arbitragePost: string;
    hybridPost: string;
  }>({
    reducer: (curr, next) => next,
    default: () => ({ trendPost: "", arbitragePost: "", hybridPost: "" }),
  }),
  salesDM: Annotation<string>({
    reducer: (curr, next) => next,
    default: () => "",
  }),
});

// ---------------------------------------------------------
// 2. 各AIエージェント処理関数
// ---------------------------------------------------------
async function runMarketTrend() {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.7,
    maxOutputTokens: 300,
  });
  const prompt = `今海外コレクターの間で熱い日本のトレカトレンドを3つ、JSON配列のみで出力してください。["トレンド1", "トレンド2", "トレンド3"]`;
  try {
    const res = await llm.invoke(prompt);
    const cleanJson = res.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return [
      "Vintage Japanese Holos hype in US/EU markets",
      "Pokemon Card 151 Master Ball Reverse Holos supply shortage",
      "Exclusive Japanese Pikachu promos spiking in raw condition demand"
    ];
  }
}

async function runSayaAnalysis() {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.4,
    maxOutputTokens: 500,
  });
  const prompt = `
    日米ポケモンカード市場で利鞘が抜けるカードを2〜3枚発掘し、JSON配列形式のみで出力してください。
    [
      {
        "cardName": "Card Name (English)",
        "jpPriceJPY": 10000,
        "usPriceUSD": 120,
        "estimatedProfitUSD": 35,
        "reason": "Short reason",
        "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080"
      }
    ]
  `;
  try {
    const res = await llm.invoke(prompt);
    const cleanJson = res.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return [];
  }
}

async function runAccountAnalysis() {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.5,
    maxOutputTokens: 250,
  });
  try {
    const posts = await Promise.race([
      getInstagramInsights(3),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]).catch(() => []);

    if (!posts || posts.length === 0) {
      return "Use engaging hashtags like #PokemonTCG #PokemonCards and eye-catching emojis.";
    }

    const postData = posts
      .map((p: any) => `[Likes:${p.like_count || 0}] ${p.caption?.slice(0, 150) || ''}`)
      .join('\n');

    const prompt = `Based on past Instagram posts, provide 2 short bullet points on best hashtags and tone to maximize engagement:\n${postData}`;
    const res = await llm.invoke(prompt);
    return res.content.toString();
  } catch {
    return "Use relevant trading card hashtags and direct CTA.";
  }
}

async function runSnsPosts(trends: string[], cards: any[], advice: string) {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.8,
    maxOutputTokens: 600,
  });
  const trendsStr = trends.slice(0, 2).join(", ");
  const cardsStr = cards.slice(0, 2).map((c: any) => `${c.cardName} (+$${c.estimatedProfitUSD})`).join(", ");

  const prompt = `
    日本のトレカB2BポータルのSNSディレクターとして、英語投稿文を3パターン作成してください。
    【アカウント分析アドバイス】${advice || 'Engaging hashtags and tone'}
    【トレンド】${trendsStr || 'General Vintage & Modern Japanese Cards'}
    【サヤ抜きカード】${cardsStr || 'High spread cards'}
    以下のJSONのみ出力してください。
    {
      "trendPost": "トレンド重視（英語、タグ）",
      "arbitragePost": "利益重視（英語、タグ）",
      "hybridPost": "ハイブリッド型（英語、タグ）"
    }
  `;
  try {
    const res = await llm.invoke(prompt);
    const cleanJson = res.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return {
      trendPost: "Check out the latest hype in Japanese vintage cards! #PokemonTCG",
      arbitragePost: "Massive arbitrage spread available right now! #PokemonCards",
      hybridPost: "Hot market trend meets huge profit margin! Source directly now. #PokemonTCG"
    };
  }
}

async function runSalesDM(trends: string[], cards: any[]) {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-3.1-flash-lite',
    temperature: 0.7,
    maxOutputTokens: 400,
  });
  const trendsStr = trends.slice(0, 2).join(", ");
  const cardsStr = cards.slice(0, 2).map((c: any) => `- ${c.cardName} (+$${c.estimatedProfitUSD})`).join("\n");
  const prompt = `海外の大口バイヤー向けに簡潔なDiscord営業DM（英語）を作成してください。トレンド: ${trendsStr}、カード:\n${cardsStr}`;
  const res = await llm.invoke(prompt);
  return res.content.toString();
}

// ---------------------------------------------------------
// 3. GET: 最新の保存データと履歴を取得
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
// 4. POST: 個別実行 または 一括パイプライン実行
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    let action = 'all';
    let currentData: any = {};
    let triggerType = 'manual';

    // リクエストボディの安全な解析
    try {
      const body = await req.json();
      if (body?.action) action = body.action;
      if (body?.currentData) currentData = body.currentData;
      if (body?.triggerType) triggerType = body.triggerType;
    } catch (e) {
      // ボディが無い場合は一括
      action = 'all';
    }

    console.log(`[AI Pipeline] Received Action: ${action}`);

    // ==========================================
    // 🌟 単体実行モード（数秒で終わる軽量ルート）
    // ==========================================
    if (action === 'trend') {
      const trendInsights = await runMarketTrend();
      return NextResponse.json({ success: true, data: { trendInsights } });
    }

    if (action === 'arbitrage') {
      const profitableCards = await runSayaAnalysis();
      return NextResponse.json({ success: true, data: { profitableCards } });
    }

    if (action === 'account') {
      const accountInsights = await runAccountAnalysis();
      return NextResponse.json({ success: true, data: { accountInsights } });
    }

    if (action === 'sns') {
      const trends = currentData.trendInsights || [];
      const cards = currentData.profitableCards || [];
      const advice = currentData.accountInsights || '';
      const snsPosts = await runSnsPosts(trends, cards, advice);
      return NextResponse.json({ success: true, data: { snsPosts } });
    }

    if (action === 'dm') {
      const trends = currentData.trendInsights || [];
      const cards = currentData.profitableCards || [];
      const salesDM = await runSalesDM(trends, cards);
      return NextResponse.json({ success: true, data: { salesDM } });
    }

    // ==========================================
    // 🌟 一括実行モード（ボタンを押した時のみ）
    // ==========================================
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

    const supabase = await createClient();
    const { data: savedRecord, error: insertError } = await supabase
      .from('ai_market_intelligence')
      .insert({
        trend_insights: fullResult.trendInsights,
        profitable_cards: fullResult.profitableCards,
        sns_posts: fullResult.snsPosts,
        sales_dm: fullResult.salesDM,
        trigger_type: triggerType,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase保存エラー:", insertError);
    }

    return NextResponse.json({
      success: true,
      data: fullResult,
      savedRecordId: savedRecord?.id || null,
    });
  } catch (error: any) {
    console.error("API エラー:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}