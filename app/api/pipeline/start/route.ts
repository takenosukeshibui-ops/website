// app/api/pipeline/start/route.ts
import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = body.category || 'pokemon';
    const triggerType = body.triggerType || 'manual';

    const supabase = await createClient();

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const targetMonday = new Date(now.setDate(diff)).toISOString().split('T')[0];

    // 1. パイプラインサイクルの作成
    const { data: cycle, error } = await supabase
      .from('ai_pipeline_cycles')
      .insert({
        category,
        target_week: targetMonday,
        status: 'initialized',
        trigger_type: triggerType,
      })
      .select('id')
      .single();

    if (error || !cycle) throw error;

    // 🌟 Vercel / ローカル双方で正しい公開URLを自動判定
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // 2. 正しい本番URLへワーカーをキック (after() によりレスポンス後も通信切断を防ぐ)
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/pipeline/worker`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cycleId: cycle.id }),
        });
      } catch (err) {
        console.error('Worker dispatch trigger error in background:', err);
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'パイプライン処理を開始しました。',
        cycleId: cycle.id,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Pipeline start error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}