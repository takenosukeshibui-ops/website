// app/api/ai/chat/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// 🌟 各AI社員のプロファイル定義
const AGENT_PROFILES: Record<string, { name: string; avatar: string; role: string; instruction: string }> = {
  trend: {
    name: 'アナリスト',
    avatar: '🔮',
    role: '海外トレンド調査員',
    instruction: '日本のトレカに関する海外市場トレンド、米・欧コレクターの関心動向について簡潔かつ的確に答えてください。',
  },
  arbitrage: {
    name: 'バイヤー',
    avatar: '💎',
    role: '仕入れ・サヤ分析担当',
    instruction: '日米トレカ市場の価格差（サヤ）、仕入れ推奨カードや利益試算について具体的に答えてください。',
  },
  account: {
    name: 'IG分析ディレクター',
    avatar: '📊',
    role: '自社アカウント反応分析担当',
    instruction: '自社Instagramの反応傾向やエンゲージメント改善、ハッシュタグ戦略の視点から答えてください。',
  },
  sns: {
    name: 'SNS広報',
    avatar: '📸',
    role: 'SNSディレクター',
    instruction: '海外向けInstagram/X投稿のトーン、表現、コピーライティングについて具体的な投稿案を交えて答えてください。',
  },
  sales: {
    name: '海外営業',
    avatar: '✉️',
    role: 'Discord営業担当',
    instruction: '海外大口バイヤー向けのDiscord営業DMやオファー文の提案・調整について答えてください。',
  },
};

// 🌟 個別エージェントの回答生成（15秒タイムアウト保護付き）
async function getAgentReply(agentKey: string, userMessage: string, contextData: any) {
  const profile = AGENT_PROFILES[agentKey];
  if (!profile) return null;

  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 350,
      apiKey: apiKey,
    });

    const prompt = `
あなたはトレカB2B事業チームの「${profile.name} (${profile.role})」です。
【役割・専門分野】${profile.instruction}

【現在の最新ダッシュボード状況】
- トレンド抽出: ${JSON.stringify(contextData?.trendInsights || [])}
- 発掘サヤカード: ${JSON.stringify(contextData?.profitableCards || [])}
- 自社アカウント分析: ${contextData?.accountInsights || '過去データなし'}

オーナー（ユーザー）から以下の発言・指示を受けました：
「${userMessage}」

${profile.name}として、敬語かつ親しみやすいビジネス口調で、自身の専門領域から的確に回答してください（150〜250文字程度）。
`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000)),
    ]);

    return {
      agentKey,
      sender: profile.name,
      avatar: profile.avatar,
      text: res.content.toString().trim(),
    };
  } catch (error) {
    console.warn(`[Chat API] ${profile.name} reply failed:`, error);
    return {
      agentKey,
      sender: profile.name,
      avatar: profile.avatar,
      text: '現在リクエストが混み合っているため、少し時間をおいてからお声がけください。',
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target, message, contextData } = body;

    if (!message || !target) {
      return NextResponse.json({ success: false, error: '引数が不足しています' }, { status: 400 });
    }

    // 🌟 宛先判定（チーム全体か、個別デスクか）
    let targetAgents: string[] = [];

    if (target === 'analysis_team') {
      targetAgents = ['trend', 'arbitrage', 'account'];
    } else if (target === 'execution_team') {
      targetAgents = ['sns', 'sales'];
    } else {
      // 個別デスク（例: desk_trend -> trend）
      const cleanKey = target.replace('desk_', '');
      if (AGENT_PROFILES[cleanKey]) {
        targetAgents = [cleanKey];
      }
    }

    if (targetAgents.length === 0) {
      return NextResponse.json({ success: false, error: '無効な宛先です' }, { status: 400 });
    }

    // 各担当AIの回答を並列で実行
    const replies = await Promise.all(
      targetAgents.map((agentKey) => getAgentReply(agentKey, message, contextData))
    );

    return NextResponse.json({
      success: true,
      replies: replies.filter(Boolean),
    });
  } catch (error: any) {
    console.error('[Chat API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}