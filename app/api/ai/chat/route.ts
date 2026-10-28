// app/api/ai/chat/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server'; // Supabase追加

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const AGENT_PROFILES: Record<string, { name: string; avatar: string; role: string; instruction: string }> = {
  trend: { name: '市場アナリスト', avatar: '🔮', role: '海外トレンド調査員', instruction: '日本のトレカに関する海外市場トレンドについて答えてください。' },
  arbitrage: { name: 'アービトラージアナリスト', avatar: '💎', role: '仕入れ・サヤ分析担当', instruction: '日米トレカ市場の価格差や仕入れ推奨カードについて答えてください。' },
  account: { name: 'IGアナリスト', avatar: '📊', role: '自社アカウント反応分析担当', instruction: '自社Instagramの反応傾向や改善戦略の視点から答えてください。' },
  sns: { name: 'SNS担当', avatar: '📸', role: 'SNSディレクター', instruction: '海外向けInstagram投稿のトーンやコピーライティングについて答えてください。' },
  sales: { name: '有料コミュニティ担当', avatar: '✉️', role: 'Discord営業担当', instruction: '海外大口バイヤー向けのDiscord営業DMについて答えてください。' },
};

async function getAgentReply(agentKey: string, userMessage: string, contextData: any, supabase: any) {
  const profile = AGENT_PROFILES[agentKey];
  if (!profile) return null;

  try {
    // 🌟 1. このAI専用の過去ナレッジをDBから取得（Step3: RAG実装）
    const { data: knowledgeData } = await supabase
      .from('ai_knowledge_base')
      .select('content')
      .eq('agent_key', agentKey);
    
    const knowledgeText = knowledgeData && knowledgeData.length > 0
      ? knowledgeData.map((k: any) => `・${k.content}`).join('\n')
      : '特になし';

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
- 自社アカウント分析: ${contextData?.accountInsights || 'なし'}

💡【社内ルール・過去の成功ナレッジ（最重要）】
以下のナレッジを必ず遵守・参考にして回答してください：
${knowledgeText}

オーナー（ユーザー）からの指示：
「${userMessage}」

${profile.name}として、敬語かつ親しみやすいビジネス口調で、自身の専門領域から的確に回答してください。
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
    return {
      agentKey,
      sender: profile.name,
      avatar: profile.avatar,
      text: '現在リクエストが混み合っているため、少し時間をおいてお声がけください。',
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target, message, contextData } = body;
    if (!message || !target) return NextResponse.json({ success: false, error: '引数が不足' }, { status: 400 });

    const supabase = await createClient();

    // 🌟 2. ユーザーの送信メッセージをDBに保存（Step1）
    await supabase.from('ai_chat_logs').insert({
      desk_id: target,
      sender: 'あなた',
      avatar: '👤',
      text: message,
      is_user: true
    });

    let targetAgents: string[] = [];
    if (target === 'analysis_team') targetAgents = ['trend', 'arbitrage', 'account'];
    else if (target === 'execution_team') targetAgents = ['sns', 'sales'];
    else {
      const cleanKey = target.replace('desk_', '');
      if (AGENT_PROFILES[cleanKey]) targetAgents = [cleanKey];
    }

    if (targetAgents.length === 0) return NextResponse.json({ success: false, error: '無効な宛先' }, { status: 400 });

    // 各AIの回答を生成
    const replies = (await Promise.all(
      targetAgents.map((agentKey) => getAgentReply(agentKey, message, contextData, supabase))
    )).filter(Boolean);

    // 🌟 3. AIの回答をDBに保存（Step1）
    for (const rep of replies) {
      if (rep) {
        await supabase.from('ai_chat_logs').insert({
          desk_id: target,
          sender: rep.sender,
          avatar: rep.avatar,
          text: rep.text,
          is_user: false
        });
      }
    }

    return NextResponse.json({ success: true, replies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🌟 4. デスク切り替え時に過去のチャット履歴を取得するエンドポイント
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');
  
  if (!target) return NextResponse.json({ success: false, logs: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_chat_logs')
    .select('*')
    .eq('desk_id', target)
    .order('created_at', { ascending: true })
    .limit(50); // 直近50件を取得

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, logs: data });
}