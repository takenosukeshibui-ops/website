// app/api/ai/intelligence/route.ts
import { NextResponse } from 'next/server';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

// ---------------------------------------------------------
// 1. State（共有ノート）の定義
// ---------------------------------------------------------
const GraphState = Annotation.Root({
  trends: Annotation<string[]>({
    reducer: (curr, next) => next, // 常に新しい配列で上書き
    default: () => [],
  }),
  profitableCards: Annotation<{ cardName: string; jpPriceJPY: number; usPriceUSD: number; estimatedProfitUSD: number }[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
});

// ---------------------------------------------------------
// 2. Node 1: 予言者AI (marketTrendAgent)
// ---------------------------------------------------------
async function marketTrendAgent(state: typeof GraphState.State) {
  console.log("--- 実行中: 予言者AI (marketTrendAgent) ---");
  
  // OpenAIモデルの初期化 (ここでは軽量・高速な gpt-4o-mini を使用)
  const llm = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
  });

  // LLMにトレンド予測を依頼し、JSON配列形式で返すように指示
  const prompt = `
    あなたは優秀なポケモンカード市場のアナリストです。
    今、海外のポケモンカードコレクターやリセラーの間で熱い（需要が高い、またはこれから高騰しそうな）日本のカードや未開封BOXを3つ予測してください。
    出力は以下の形式のJSON配列のみにしてください。他のテキストは一切含めないでください。
    ["カード名またはBOX名1", "カード名またはBOX名2", "カード名またはBOX名3"]
  `;

  try {
    const response = await llm.invoke(prompt);
    let trendsData: string[] = [];
    
    // LLMの返答からJSONをパース（余計なマークダウン記号などを除去）
    const cleanJsonText = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
    trendsData = JSON.parse(cleanJsonText);
    
    console.log("予言者AIの予測:", trendsData);
    
    // Stateの trends を更新して次のノードへ渡す
    return { trends: trendsData };
  } catch (error) {
    console.error("予言者AIのエラー:", error);
    // エラー時のフォールバックダミーデータ
    return { trends: ["151 Booster Box (Japanese)", "Charizard ex SAR", "Iono SAR"] };
  }
}

// ---------------------------------------------------------
// 3. Node 2: ハンターAI (sayaAnalysisAgent)
// ---------------------------------------------------------
async function sayaAnalysisAgent(state: typeof GraphState.State) {
  console.log("--- 実行中: ハンターAI (sayaAnalysisAgent) ---");
  
  const trends = state.trends;
  const profitableCards = [];
  const EXCHANGE_RATE = 150; // 1USD = 150JPY
  const PROXY_FEE = 1.05;    // 5%の手数料
  const SHIPPING_FEE = 20;   // 送料(USD)

  // トレンドAIから渡されたカードごとにサヤ（利益）を計算
  for (const cardName of trends) {
    // ※今回はテストのため、現実的だがランダムなダミー相場を生成
    // 日本相場: 5,000円 〜 15,000円
    const jpPriceJPY = Math.floor(Math.random() * 10000) + 5000;
    
    // 米国相場: 日本相場をドル換算したものに、+ $10 〜 $80 のプレミアムを乗せる
    const baseUSD = jpPriceJPY / EXCHANGE_RATE;
    const usPriceUSD = Math.floor(baseUSD + (Math.random() * 70 + 10));

    // 利益計算: 米国相場 - ((日本相場 / 150) * 1.05) - 送料20ドル
    const costUSD = (jpPriceJPY / EXCHANGE_RATE) * PROXY_FEE;
    const estimatedProfitUSD = usPriceUSD - costUSD - SHIPPING_FEE;

    // 利益がプラス（0ドルより大きい）の場合のみ、リストに追加
    if (estimatedProfitUSD > 0) {
      profitableCards.push({
        cardName,
        jpPriceJPY,
        usPriceUSD,
        // 小数点以下2桁に丸める
        estimatedProfitUSD: Math.round(estimatedProfitUSD * 100) / 100,
      });
    }
  }

  return { profitableCards };
}