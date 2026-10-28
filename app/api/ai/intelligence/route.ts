// app/api/ai/intelligence/route.ts
import { NextResponse } from 'next/server';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// 1. State（共有ノート）の定義
const GraphState = Annotation.Root({
  trends: Annotation<string[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
  profitableCards: Annotation<{ cardName: string; jpPriceJPY: number; usPriceUSD: number; estimatedProfitUSD: number }[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
});

// 2. Node 1: 予言者AI (marketTrendAgent)
async function marketTrendAgent(state: typeof GraphState.State) {
  console.log("--- 実行中: 予言者AI (Gemini) ---");
  
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash', 
    temperature: 0.7,
  });

  const prompt = `
    あなたは優秀なポケモンカード市場のアナリストです。
    今、海外のポケモンカードコレクターやリセラーの間で熱い（需要が高い、またはこれから高騰しそうな）日本のカードや未開封BOXを3つ予測してください。
    出力は以下の形式のJSON配列のみにしてください。他のテキストは一切含めないでください。
    ["カード名またはBOX名1", "カード名またはBOX名2", "カード名またはBOX名3"]
  `;

  try {
    const response = await llm.invoke(prompt);
    let trendsData: string[] = [];
    
    const cleanJsonText = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    trendsData = JSON.parse(cleanJsonText);
    
    console.log("予言者AIの予測:", trendsData);
    return { trends: trendsData };
  } catch (error) {
    console.error("予言者AIのエラー:", error);
    return { trends: ["151 Booster Box (Japanese)", "Charizard ex SAR", "Iono SAR"] };
  }
}

// 3. Node 2: ハンターAI (sayaAnalysisAgent)
async function sayaAnalysisAgent(state: typeof GraphState.State) {
  console.log("--- 実行中: ハンターAI (計算) ---");
  
  const trends = state.trends;
  const profitableCards = [];
  const EXCHANGE_RATE = 150; 
  const PROXY_FEE = 1.05;    
  const SHIPPING_FEE = 20;   

  for (const cardName of trends) {
    const jpPriceJPY = Math.floor(Math.random() * 10000) + 5000;
    const baseUSD = jpPriceJPY / EXCHANGE_RATE;
    const usPriceUSD = Math.floor(baseUSD + (Math.random() * 70 + 10));

    const costUSD = (jpPriceJPY / EXCHANGE_RATE) * PROXY_FEE;
    const estimatedProfitUSD = usPriceUSD - costUSD - SHIPPING_FEE;

    if (estimatedProfitUSD > 0) {
      profitableCards.push({
        cardName,
        jpPriceJPY,
        usPriceUSD,
        estimatedProfitUSD: Math.round(estimatedProfitUSD * 100) / 100,
      });
    }
  }

  console.log("ハンターAIの計算結果:", profitableCards);
  return { profitableCards };
}

// 4. APIエンドポイント（🌟この部分が欠けていた原因です）
export async function POST(req: Request) {
  try {
    const workflow = new StateGraph(GraphState)
      .addNode("marketTrendAgent", marketTrendAgent)
      .addNode("sayaAnalysisAgent", sayaAnalysisAgent)
      .addEdge(START, "marketTrendAgent")
      .addEdge("marketTrendAgent", "sayaAnalysisAgent")
      .addEdge("sayaAnalysisAgent", END);

    const app = workflow.compile();

    const result = await app.invoke({
      trends: [],
      profitableCards: []
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error("LangGraph API エラー:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}