// app/api/ai/intelligence/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { getInstagramInsights } from '@/lib/instagram'; // 🌟 追加: Instagramデータ取得関数

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
  accountInsights: Annotation<string>({ // 🌟 追加: アカウント分析結果を保存するステート
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
// 2. 各AIエージェント
// ---------------------------------------------------------
async function marketTrendAgent(state: typeof GraphState.State) {
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-3.1-flash-lite', temperature: 0.7 });
  const prompt = `今、海外のコレクターの間で熱い日本のカードや現象を3つ予測し、JSON配列のみで出力してください。["トレンド1", "トレンド2", "トレンド3"]`;
  try {
    const response = await llm.invoke(prompt);
    const cleanJson = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return { trendInsights: JSON.parse(cleanJson) };
  } catch (error) {
    return {
      trendInsights: [
        "Vintage Japanese Gengar & Alakazam Holo hype in US/EU markets",
        "Pokemon Card 151 Master Ball Reverse Holos seeing supply shortage",
        "Exclusive Japanese Pikachu promos spiking in raw condition demand"
      ]
    };
  }
}

async function sayaAnalysisAgent(state: typeof GraphState.State) {
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-3.1-flash-lite', temperature: 0.4 });
  const prompt = `
    あなたは日米のポケモンカード市場の価格差（サヤ）を突き詰めるアービトラージ専門AIです。
    日本国内（駿河屋、メルカリ等）で仕入れ、米国（eBay等）へ販売することで、現在実際に利鞘が大きく抜ける具体的な日本のカードを3枚独自に発掘してください。
    以下のJSON配列形式のみで出力してください。
    [
      {
        "cardName": "カード名（英語）",
        "jpPriceJPY": 日本想定仕入相場(円),
        "usPriceUSD": 米国想定売価(ドル),
        "estimatedProfitUSD": 想定純利益(ドル: 1ドル=150円計算、送料等考慮),
        "reason": "サヤの理由",
        "imageUrl": "公式データベースや一般的なトレカ販売サイトでアクセス可能な、高画質な実際のカード画像のHTTPS URL。もし取得が難しい場合は https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080 を使用してください"
      }
    ]
  `;
  try {
    const response = await llm.invoke(prompt);
    const cleanJson = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return { profitableCards: JSON.parse(cleanJson) };
  } catch (error) {
    return { profitableCards: [] };
  }
}

// 🌟 新規追加: アカウント分析担当AI
async function accountAnalysisAgent(state: typeof GraphState.State) {
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-3.1-flash-lite', temperature: 0.5 });
  try {
    // 過去15件の投稿データを取得
    const posts = await getInstagramInsights(15);
    
    if (!posts || posts.length === 0) {
      return { accountInsights: "過去の投稿データがありません。一般的なベストプラクティス（関連ハッシュタグの多用、絵文字での視覚的アピール）に従って投稿を作成してください。" };
    }

    // AIに読ませるためにデータをテキスト化
    const postData = posts.map((p: any) => `[いいね: ${p.like_count || 0}, コメント: ${p.comments_count || 0}]\n内容: ${p.caption}`).join('\n---\n');

    const prompt = `あなたはInstagramマーケティングのプロです。以下の自社アカウントの過去投稿データ（エンゲージメント結果）を分析し、SNS投稿作成担当者に向けて「今反応が良いハッシュタグ」「ウケる文章のトーン」「エンゲージメントを高めるためのアドバイス」を2〜3行の簡潔なインサイトとしてまとめてください。
    【過去の投稿データ】\n${postData}`;

    const response = await llm.invoke(prompt);
    return { accountInsights: response.content.toString() };
  } catch (error) {
    console.error("Account Analysis Error:", error);
    return { accountInsights: "過去データの分析に失敗しました。通常通り魅力的な投稿を作成してください。" };
  }
}

// 🌟 修正: SNS投稿AIが、アカウント分析AIからのアドバイスを受け取るように変更
async function snsPostAgent(state: typeof GraphState.State) {
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-3.1-flash-lite', temperature: 0.8 });
  const trends = state.trendInsights.join("\n- ");
  const cards = state.profitableCards.map(c => 
    `- ${c.cardName}: ¥${c.jpPriceJPY.toLocaleString()} ➔ $${c.usPriceUSD} (+$${c.estimatedProfitUSD}) / 理由: ${c.reason}`
  ).join("\n");
  const advice = state.accountInsights; // 🌟 分析担当からのアドバイス

  const prompt = `
    日本のトレカB2BポータルのSNSディレクターとして、XやInstagram用の英語投稿を3パターン作成してください。
    【自社アカウント分析からの指示（最優先で反映してください）】\n${advice}\n
    【トレンド情報】\n- ${trends}\n
    【サヤ抜きカード】\n${cards}\n
    以下のJSON形式のみで出力してください。
    {
      "trendPost": "トレンドに焦点を当てた熱狂的な投稿（英語、絵文字、タグ）",
      "arbitragePost": "利益額とスプレッドに焦点を当てたリセラー向け投稿（英語、絵文字、タグ）",
      "hybridPost": "トレンドと実利を掛け合わせた成約率重視の投稿（英語、絵文字、タグ）"
    }
  `;
  try {
    const response = await llm.invoke(prompt);
    const cleanJson = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    return { snsPosts: JSON.parse(cleanJson) };
  } catch (error) {
    return {
      snsPosts: {
        trendPost: "Check out the latest hype in Japanese vintage cards! #PokemonTCG",
        arbitragePost: "Massive arbitrage spread available right now! #PokemonCards",
        hybridPost: "Hot market trend meets huge profit margin! Source directly now. #PokemonTCG"
      }
    };
  }
}

async function salesDMAgent(state: typeof GraphState.State) {
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-3.1-flash-lite', temperature: 0.7 });
  const trends = state.trendInsights.join(", ");
  const cards = state.profitableCards.map(c => `- ${c.cardName} (+$${c.estimatedProfitUSD})`).join("\n");
  const prompt = `海外の大口VIPバイヤー向けにDiscord/Email用営業DM（英語）を作成してください。トレンド（${trends}）と具体カード（${cards}）を交えポータル発注を促してください。`;
  const response = await llm.invoke(prompt);
  return { salesDM: response.content.toString() };
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
// 4. POST: AIパイプライン実行 & Supabase保存
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    let triggerType = 'manual';
    try {
      const body = await req.json();
      if (body?.triggerType) triggerType = body.triggerType;
    } catch {
      // ボディがない場合は manual
    }

    // 🌟 修正: ワークフローにアカウント分析AIを追加し、並列実行・合流を設定
    const workflow = new StateGraph(GraphState)
      .addNode("marketTrendAgent", marketTrendAgent)
      .addNode("sayaAnalysisAgent", sayaAnalysisAgent)
      .addNode("accountAnalysisAgent", accountAnalysisAgent) // 追加
      .addNode("snsPostAgent", snsPostAgent)
      .addNode("salesDMAgent", salesDMAgent)
      .addEdge(START, "marketTrendAgent")
      .addEdge(START, "sayaAnalysisAgent")
      .addEdge(START, "accountAnalysisAgent") // 追加：3つを同時に並列スタート
      .addEdge(["marketTrendAgent", "sayaAnalysisAgent", "accountAnalysisAgent"], "snsPostAgent") // 修正：3つのAIのタスクが全て完了したら投稿作成へ進む
      .addEdge("snsPostAgent", "salesDMAgent")
      .addEdge("salesDMAgent", END);

    const app = workflow.compile();
    const result = await app.invoke({
      trendInsights: [],
      profitableCards: [],
      accountInsights: "", // 追加
      snsPosts: { trendPost: "", arbitragePost: "", hybridPost: "" },
      salesDM: ""
    });

    // 💡 Supabaseへ保存
    const supabase = await createClient();
    const { data: savedRecord, error: insertError } = await supabase
      .from('ai_market_intelligence')
      .insert({
        trend_insights: result.trendInsights,
        profitable_cards: result.profitableCards,
        sns_posts: result.snsPosts,
        sales_dm: result.salesDM,
        trigger_type: triggerType,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase保存エラー:", insertError);
    }

    return NextResponse.json({
      success: true,
      data: result,
      savedRecordId: savedRecord?.id || null,
    });
  } catch (error: any) {
    console.error("LangGraph API エラー:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}