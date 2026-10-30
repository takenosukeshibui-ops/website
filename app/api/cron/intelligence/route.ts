// app/api/cron/intelligence/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // Vercel Cron の認証検証（環境変数 CRON_SECRET がある場合）
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 🌟 新しい非同期パイプラインを triggerType='cron' でキックオフ（即時 202 応答）
    const res = await fetch(`${baseUrl}/api/pipeline/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'pokemon', triggerType: 'cron' }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Cron pipeline trigger error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}