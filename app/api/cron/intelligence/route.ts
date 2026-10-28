// app/api/cron/intelligence/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Vercel Cronからの正規アクセスか検証（CRON_SECRETを設定している場合）
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 既存のAIインテリジェンスAPIを triggerType='cron' で呼び出す
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.worldwidejapan.com';
    const res = await fetch(`${siteUrl}/api/ai/intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerType: 'cron' }),
    });

    const json = await res.json();
    return NextResponse.json({ cronSuccess: true, ...json });
  } catch (err: any) {
    return NextResponse.json({ cronSuccess: false, error: err.message }, { status: 500 });
  }
}