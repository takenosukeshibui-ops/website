// app/api/ai/intelligence/route.ts
import { NextResponse } from 'next/server';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// ---------------------------------------------------------
// 1. State（共有ノート）の定義
// ---------------------------------------------------------
const GraphState = Annotation.Root({
  // 予言者AIの調査結果（市場の熱狂・テーマ・過熱しているジャンル）
  trendInsights: Annotation<string[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
  // サヤ分析AIの調査結果（具体的に日米差益が抜ける実利カード群）
  profitableCards: Annotation<{
    cardName: string;
    jpPriceJPY: number;
    usPriceUSD: number;
    estimatedProfitUSD: number;
    reason: string;
  }[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
  // SNS運用AIの作成結果（3パターンの投稿）
  snsPosts: Annotation<{
    trendPost: string;      // トレンド特化型
    arbitragePost: string;  // サヤ特化型
    hybridPost: string;     // トレンド×サヤ掛け合わせ型
  }>({
    reducer: (curr, next) => next,
    default: () => ({ trendPost: "", arbitragePost: "", hybridPost: "" }),
  }),
  // 営業DMAIの作成結果
  salesDM: Annotation<string>({
    reducer: (curr, next) => next,
    default: () => "",
  }),
});

// ---------------------------------------------------------
// 2. Node 1: 予言者AI (marketTrendAgent)
// ---------------------------------------------------------
async function marketTrendAgent(state: typeof GraphState.State) {
  console.log("--- [調査員1] 実行中: 予言者AI (トレンド分析) ---");
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash', temperature: 0.7 });

  const prompt = `
    あなたは世界のポケモンカード市場に精通したトレンドアナリストです。
    今、海外のコレクターやバイヤーの間で過熱感がある、またはこれから高騰の兆候がある日本のカードジャンルや具体的な現象を3つ挙げてください。
    （例: 「旧裏（Vintage）のゲンガーやフーディンのホロ過熱」「151のエリカやピカチュウのマスターボールミラー高騰」「PSA10のプロモカード枯渇」など）

    出力はJSON配列形式のみにしてください。
    ["トレンド・過熱情報1", "トレンド・過熱情報2", "トレンド・過熱情報3"]
  `;

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

// ---------------------------------------------------------
// 3. Node 2: サヤ分析AI (sayaAnalysisAgent)
// ---------------------------------------------------------
async function sayaAnalysisAgent(state: typeof GraphState.State) {
  console.log("--- [調査員2] 実行中: サヤ分析AI (利鞘カード発掘) ---");
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash', temperature: 0.4 });

  const prompt = `
    あなたは日米のポケモンカード市場の価格差（サヤ）を突き詰めるアービトラージ専門AIです。
    日本国内（駿河屋、メルカリ、ヤフオク、秋葉原相場など）で安く仕入れ、米国（eBay、TCGplayerなど）へ販売することで、
    現在実際に利鞘（サヤ）が大きく抜ける具体的な日本のカードを3枚独自に発掘・選定してください。

    以下のJSON配列形式のみで出力してください。
    [
      {
        "cardName": "カード名（英語）",
        "jpPriceJPY": 日本での想定仕入相場(円),
        "usPriceUSD": 米国での想定売価(ドル),
        "estimatedProfitUSD": 想定純利益(ドル: 1ドル=150円、送料$20と代理手数料等を考慮した概算),
        "reason": "なぜサヤが生まれているのかの簡潔な理由"
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

// ---------------------------------------------------------
// 4. Node 3: SNS運用AI (snsPostAgent)
// ---------------------------------------------------------
async function snsPostAgent(state: typeof GraphState.State) {
  console.log("--- [コンテンツ生成1] 実行中: SNS運用AI ---");
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash', temperature: 0.8 });

  const trends = state.trendInsights.join("\n- ");
  const cards = state.profitableCards.map(c => 
    `- ${c.cardName}: 日本仕入 ¥${c.jpPriceJPY.toLocaleString()} ➔ 米相場 $${c.usPriceUSD} (利鞘: 利益 約+$${c.estimatedProfitUSD}) / 理由: ${c.reason}`
  ).join("\n");

  const prompt = `
    あなたは日本のトレカB2B越境輸出ポータルのSNSディレクターです。
    手元に【市場トレンド情報（予言者AI調査）】と【日米サヤ抜きカード情報（サヤ分析AI調査）】が集まりました。
    海外バイヤー・リセラー向けに、X（旧Twitter）用の英語投稿を「3パターン」作成してください。

    【予言者AIのトレンド情報】
    - ${trends}

    【サヤ分析AIの発掘カード情報】
    ${cards}

    ---
    以下のJSON形式のみで出力してください。
    {
      "trendPost": "予言者AIのトレンド情報に焦点を当てた、熱狂感を煽るインサイト投稿文（英語、絵文字、タグあり）",
      "arbitragePost": "サヤ分析AIの発掘カードに焦点を当てた、具体的な金額差と利益率でリセラーを刺激する実利重視の投稿文（英語、絵文字、タグあり）",
      "hybridPost": "トレンドの熱狂と、サヤ抜きの実利情報を巧みに融合させ『今この過熱ジャンルで、実際にこれだけの利鞘が抜ける！』と伝える最もコンバージョン率の高い投稿文（英語、絵文字、タグあり）"
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
        arbitragePost: "Massive arbitrage spread available right now between Japan & US! #PokemonCards",
        hybridPost: "Hot market trend meets huge profit margin! Source directly from Japan now. #PokemonTCG"
      }
    };
  }
}

// ---------------------------------------------------------
// 5. Node 4: 営業DMAI (salesDMAgent)
// ---------------------------------------------------------
async function salesDMAgent(state: typeof GraphState.State) {
  console.log("--- [コンテンツ生成2] 実行中: 営業DMAI ---");
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash', temperature: 0.7 });

  const trends = state.trendInsights.join(", ");
  const cards = state.profitableCards.map(c => `- ${c.cardName} (Est. Profit: +$${c.estimatedProfitUSD})`).join("\n");

  const prompt = `
    海外の大口リセラー顧客（VIPバイヤー）宛てに送るDiscord/Email向けの短い個別営業DM（英語）を作成してください。
    市場トレンド（${trends}）に触れて関心を惹きつつ、具体的に今すぐ利鞘が取れるカード（${cards}）の仕入れをオファーし、
    「弊社のB2Bポータルから即発注できます」とクローズしてください。
  `;

  const response = await llm.invoke(prompt);
  return { salesDM: response.content.toString() };
}

// ---------------------------------------------------------
// 6. APIエンドポイント (並行調査 ➔ 統合生成グラフ)
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    // 💡 予言者とサヤ分析を並行して動かし、揃ったらSNSとDMを動かす構造
    const workflow = new StateGraph(GraphState)
      .addNode("marketTrendAgent", marketTrendAgent)
      .addNode("sayaAnalysisAgent", sayaAnalysisAgent)
      .addNode("snsPostAgent", snsPostAgent)
      .addNode("salesDMAgent", salesDMAgent)
      
      // スタートから2つの調査AIへ分岐
      .addEdge(START, "marketTrendAgent")
      .addEdge(START, "sayaAnalysisAgent")
      
      // 2つの調査結果が揃ったらSNS生成へ合流
      .addEdge(["marketTrendAgent", "sayaAnalysisAgent"], "snsPostAgent")
      
      // SNS生成後にDM作成を実行して完了
      .addEdge("snsPostAgent", "salesDMAgent")
      .addEdge("salesDMAgent", END);

    const app = workflow.compile();

    const result = await app.invoke({
      trendInsights: [],
      profitableCards: [],
      snsPosts: { trendPost: "", arbitragePost: "", hybridPost: "" },
      salesDM: ""
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("LangGraph API エラー:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}