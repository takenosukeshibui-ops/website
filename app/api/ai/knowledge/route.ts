// app/api/ai/knowledge/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 1. ナレッジ一覧取得 (GET)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agentKey');

    const supabase = await createClient();
    let query = supabase.from('ai_knowledge').select('*').order('created_at', { ascending: false });

    if (agentKey && agentKey !== 'all') {
      query = query.eq('agent_key', agentKey);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, knowledge: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. ナレッジ登録 (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentKey, content } = body;

    if (!agentKey || !content) {
      return NextResponse.json({ success: false, error: '必要なデータが不足しています' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_knowledge')
      .insert({ agent_key: agentKey, content: content })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'ナレッジを保存しました', data: data?.[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. ナレッジ削除 (DELETE)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '削除対象のIDが指定されていません' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('ai_knowledge')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'ナレッジを削除しました' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}