import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = body.category || 'pokemon';
    const triggerType = body.triggerType || 'manual';

    const supabase = await createClient();

    // 今週月曜日の日付を算出
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const targetMonday = new Date(now.setDate(diff)).toISOString().split('T')[0];

    // 1. パイプラインサイクルを作成
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

    // 2. バックグラウンドワーカーを非同期で発火（レスポンスを待機させない）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/pipeline/worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-worker-secret': process.env.CRON_SECRET || 'internal-secret',
      },
      body: JSON.stringify({ cycleId: cycle.id }),
    }).catch((err) => console.error('Worker dispatch trigger warning:', err));

    return NextResponse.json(
      {
        success: true,
        message: 'パイプライン処理を非同期で開始しました。',
        cycleId: cycle.id,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Pipeline start error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}