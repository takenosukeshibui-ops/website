// app/api/ai/chat/route.ts
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createClient } from '@/lib/supabase/server';
import { getCategoryName } from '../intelligence/helpers';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// 🌟 全エージェントのプロファイルを完全網羅
const AGENT_PROFILES: Record<string, { name: string; avatar: string; role: string; instruction: string }> = {
  chief: {
    name: 'チーフマネージャー',
    avatar: '👑',
    role: '最高意思決定・全体戦略ディレクター',
    instruction: '全体戦略、案件選定理由、週間コンテンツカレンダー（7日分）の編成、各SNSや営業部隊へのディレクション方針について答えてください。'
  },
  trend: {
    name: '市場アナリスト',
    avatar: '🔮',
    role: '海外トレンド調査員',
    instruction: '日本のトレカに関する海外市場トレンド（5スロット：ヴィンテージ、プロモ、モダン、BOX等）について答えてください。'
  },
  arbitrage: {
    name: 'アービトラージアナリスト',
    avatar: '💎',
    role: '仕入れ・サヤ分析担当',
    instruction: '日米・日欧・日亜トレカ市場の実質価格差、諸経費・為替バッファ、仕入れ推奨カードについて答えてください。'
  },
  account: {
    name: 'IGアナリスト',
    avatar: '📊',
    role: '自社Instagram反応分析担当',
    instruction: '自社Instagramの反応傾向や改善戦略、カルーセル構成の視点から答えてください。'
  },
  x_account: {
    name: 'Xアナリスト',
    avatar: '🐦',
    role: '自社Xアルゴリズム分析担当',
    instruction: '自社X (Twitter) のインプレッション・ブックマーク率改善、140字フックやスレッド戦術について答えてください。'
  },
  sns: {
    name: 'Instagram担当',
    avatar: '📸',
    role: 'Instagram投稿クリエイター',
    instruction: '海外向けInstagram投稿のカルーセル構成、キャプション、トーンや2股導線（Discord/自社サイト）について答えてください。'
  },
  x: {
    name: 'Xクリエイター',
    avatar: '🐦',
    role: 'X (Twitter) 専任クリエイター',
    instruction: 'X (Twitter) の140字フック、ツリー展開、添付画像レイアウトやリプ欄導線について答えてください。'
  },
  sales: {
    name: '有料コミュニティ担当',
    avatar: '✉️',
    role: 'Discord営業担当',
    instruction: '海外大口バイヤー向けのDiscord実務商談メッセージ、ロットオファー、交渉対策について答えてください。'
  },
};

async function getAgentReply(agentKey: string, userMessage: string, contextData: any, category: string, region: string | undefined, supabase: any) {
  const profile = AGENT_PROFILES[agentKey];
  if (!profile) return null;

  try {
    let knowledgeText = '特になし';
    try {
      const { data: knowledgeData } = await supabase
        .from('ai_knowledge_base')
        .select('content')
        .eq('agent_key', agentKey)
        .order('created_at', { ascending: false })
        .limit(5);

      if (knowledgeData && knowledgeData.length > 0) {
        knowledgeText = knowledgeData.map((k: any) => `・${k.content}`).join('\n');
      }
    } catch (kErr) {
      console.warn('knowledge fetch warning:', kErr);
    }

    const categoryName = getCategoryName(category || 'pokemon');
    const regionName = region ? (region === 'us' ? '北米市場' : region === 'eu' ? '欧州市場' : 'アジア市場') : '';

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      temperature: 0.7,
      maxOutputTokens: 500,
      apiKey: apiKey,
    });

    const prompt = `
あなたは越境【${categoryName}】代理購入・販売事業チームの「${profile.name} (${profile.role})」です。
${regionName ? `【担当地域】${regionName}` : ''}
【役割・専門分野】${profile.instruction}

【現在の最新ダッシュボード状況】
- チーフパッケージ: ${JSON.stringify(contextData?.chiefPackage?.mvpHighlight || contextData?.chiefPackage?.chosenCardOrItem || '未選定')}
- トレンド抽出状況: ${JSON.stringify(contextData?.trendInsights ? Object.keys(contextData.trendInsights) : [])}
- 発掘サヤカード: ${JSON.stringify(contextData?.profitableCards ? Object.keys(contextData.profitableCards) : [])}

💡【社内ルール・過去の学習ナレッジ（最優先で遵守すること）】
${knowledgeText}

オーナー（ユーザー）からの指示・質問：
「${userMessage}」

${profile.name}として、敬語かつ頼もしいプロフェッショナルの口調で、自身の持ち場の視点から具体的かつ的確に回答してください。
`;

    const res = await Promise.race([
      llm.invoke(prompt),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 25000)),
    ]);

    return {
      agentKey,
      sender: profile.name,
      avatar: profile.avatar,
      text: res.content.toString().trim(),
    };
  } catch (error: any) {
    console.error(`Agent ${agentKey} chat error:`, error);
    return {
      agentKey,
      sender: profile.name,
      avatar: profile.avatar,
      text: '現在リクエストが混み合っているか、モデル接続待機中です。少し時間をおいて再度お試しください。',
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target, message, contextData, category, region } = body;
    if (!message || !target) {
      return NextResponse.json({ success: false, error: '引数（target または message）が不足しています' }, { status: 400 });
    }

    const supabase = await createClient();

    // ユーザーメッセージをDBに安全に保存
    try {
      await supabase.from('ai_chat_logs').insert({
        desk_id: target,
        sender: 'あなた',
        avatar: '👤',
        text: message,
        is_user: true
      });
    } catch (dbErr) {
      console.warn('ai_chat_logs insert warning (user):', dbErr);
    }

    // ターゲットの柔軟なマッピング
    let targetAgents: string[] = [];
    if (target === 'analysis_team') {
      targetAgents = ['trend', 'arbitrage', 'account'];
    } else if (target === 'execution_team') {
      targetAgents = ['sns', 'x', 'sales'];
    } else {
      let cleanKey = target.replace('desk_', '');
      if (cleanKey.startsWith('trend')) cleanKey = 'trend';
      else if (cleanKey.startsWith('arbitrage')) cleanKey = 'arbitrage';
      else if (cleanKey === 'x_account') cleanKey = 'x_account';
      else if (cleanKey === 'x') cleanKey = 'x';
      else if (cleanKey === 'account') cleanKey = 'account';
      else if (cleanKey === 'sns') cleanKey = 'sns';
      else if (cleanKey === 'sales') cleanKey = 'sales';
      else if (cleanKey === 'chief') cleanKey = 'chief';

      if (AGENT_PROFILES[cleanKey]) {
        targetAgents = [cleanKey];
      }
    }

    if (targetAgents.length === 0) {
      return NextResponse.json({ success: false, error: `無効な宛先デスクです: ${target}` }, { status: 400 });
    }

    // 各AIの回答を生成
    const replies = (await Promise.all(
      targetAgents.map((agentKey) => getAgentReply(agentKey, message, contextData, category, region, supabase))
    )).filter(Boolean);

    // AIの回答をDBに安全に保存
    try {
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
    } catch (dbErr) {
      console.warn('ai_chat_logs insert warning (replies):', dbErr);
    }

    return NextResponse.json({ success: true, replies });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 過去のチャット履歴を取得するエンドポイント
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target');

    if (!target) return NextResponse.json({ success: false, logs: [] });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_chat_logs')
      .select('*')
      .eq('desk_id', target)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.warn('ai_chat_logs fetch warning:', error.message);
      return NextResponse.json({ success: true, logs: [] });
    }

    return NextResponse.json({ success: true, logs: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}