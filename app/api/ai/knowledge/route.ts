// app/api/ai/knowledge/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentKey, content } = body;

    if (!agentKey || !content) {
      return NextResponse.json({ success: false, error: '必要なデータが不足しています' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_knowledge_base')
      .insert({ agent_key: agentKey, content: content });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'ナレッジを保存しました' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}