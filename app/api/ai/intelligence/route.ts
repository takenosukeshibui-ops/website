// app/api/ai/intelligence/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { getInstagramInsights } from '@/lib/instagram';

// 🌟 apiKey をファイル先頭で安全に定義
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// ---------------------------------------------------------
// 1. 各AIエージェント処理関数（15秒タイムアウト保護付き）
// ---------------------------------------------------------
async function runMarketTrend() {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 300,
      apiKey: apiKey,
    });

    const prompt = `今海外コレクターの間で熱い日本のトレカトレンドを3つ、JSON配列のみで出力してください。["トレンド1", "トレンド2", "トレンド3"]`;
    
    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
    ]);

    const cleanJson = res.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.warn("MarketTrend fallback used:", e);
    return [
      "Vintage Japanese Holos hype in US/EU markets",
      "Pokemon Card 151 Master Ball Reverse Holos supply shortage",
      "Exclusive Japanese Pikachu promos spiking in raw condition demand"
    ];
  }
}

async function runSayaAnalysis() {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.4,
      maxOutputTokens: 500,
      apiKey: apiKey,
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

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
    ]);

    const cleanJson = res.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.warn("SayaAnalysis fallback used:", e);
    return [
      {
        cardName: "Charizard VMAX SSR (Shiny Star V)",
        jpPriceJPY: 12000,
        usPriceUSD: 145,
        estimatedProfitUSD: 40,
        reason: "High demand in US PSA submissions with persistent JP supply arbitrage.",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080"
      }
    ];
  }
}

async function runAccountAnalysis() {
  try {
    // 🌟 Instagramから直近3件のデータを取得
    const posts = await getInstagramInsights(3);

    let postData = "";
    if (posts && posts.length > 0) {
      postData = posts
        .map((p: any) => `[Likes:${p.like_count || 0}, Comments:${p.comments_count || 0}] ${p.caption?.slice(0, 150) || ''}`)
        .join('\n');
    } else {
      // データが取得できなかった（トークン切れ含む）場合の代替データ
      postData = "Likes: 30, Comments: 5, Caption: Japanese vintage Pokemon booster boxes direct export.";
    }

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.5,
      maxOutputTokens: 250,
      apiKey: apiKey,
    });

    const prompt = `Based on past Instagram posts, provide 2 short bullet points on best hashtags and tone to maximize engagement:\n${postData}`;
    
    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
    ]);

    return res.content.toString();
  } catch (e) {
    console.warn("AccountAnalysis fallback used:", e);
    return "Use relevant trading card hashtags (#PokemonCards #PokemonTCG) and direct buyer CTA.";
  }
}

async function runSnsPosts(trends: string[], cards: any[], advice: string) {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.8,
      maxOutputTokens: 600,
      apiKey: apiKey,
    });

    const trendsStr = (trends || []).slice(0, 2).join(", ");
    const cardsStr = (cards || []).slice(0, 2).map((c: any) => `${c.cardName} (+$${c.estimatedProfitUSD})`).join(", ");

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

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
    ]);

    const cleanJson = res.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.warn("SnsPosts fallback used:", e);
    return {
      trendPost: "Check out the latest hype in Japanese vintage cards! #PokemonTCG",
      arbitragePost: "Massive arbitrage spread available right now! #PokemonCards",
      hybridPost: "Hot market trend meets huge profit margin! Source directly now. #PokemonTCG"
    };
  }
}

async function runSalesDM(trends: string[], cards: any[]) {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 400,
      apiKey: apiKey,
    });

    const trendsStr = (trends || []).slice(0, 2).join(", ");
    const cardsStr = (cards || []).slice(0, 2).map((c: any) => `- ${c.cardName} (+$${c.estimatedProfitUSD})`).join("\n");
    const prompt = `海外の大口バイヤー向けに簡潔なDiscord営業DM（英語）を作成してください。トレンド: ${trendsStr}、カード:\n${cardsStr}`;
    
    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
    ]);

    return res.content.toString();
  } catch (e) {
    console.warn("SalesDM fallback used:", e);
    return "Hi, check out our latest sourced high-spread Japanese Pokémon cards available for wholesale direct export.";
  }
}

// ---------------------------------------------------------
// 2. GET: 最新の保存データと履歴を取得
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
// 3. POST: 個別実行 または 一括パイプライン実行
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    let action: string = 'all';
    let currentData: any = {};
    let triggerType: string = 'manual';

    try {
      const body = await req.json();
      if (body?.action) action = String(body.action);
      if (body?.currentData) currentData = body.currentData;
      if (body?.triggerType) triggerType = String(body.triggerType);
    } catch {
      action = 'all';
    }

    // ==========================================
    // 🌟 単体実行モード
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
    // 🌟 一括実行モード
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