// app/api/cron/auto-generate/route.ts
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const TERMINAL_STATUSES = new Set(['ready_to_publish', 'partially_failed', 'completed']);

function getJstNowInfo() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  const year = map.get('year') || '2026';
  const month = map.get('month') || '01';
  const dayNum = map.get('day') || '01';
  const weekdayLong = map.get('weekday') || 'Friday';
  const hour = map.get('hour') || '00';
  const minute = map.get('minute') || '00';

  const targetDay =
    WEEKDAYS_EN.find((d) => d.toLowerCase() === weekdayLong.toLowerCase()) || 'Friday';

  return {
    dateKey: `${year}-${month}-${dayNum}`,
    targetDay,
    timeLabel: `${hour}:${minute}`,
  };
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const customHeader = req.headers.get('x-cron-secret');
  if (customHeader === secret) return true;

  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') === secret) return true;

  return false;
}

async function handleAutoGenerate(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const jst = getJstNowInfo();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin ||
    'http://localhost:3000';

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'pokemon';
  const force = searchParams.get('force') === 'true';

  // 本日（JST）に作成された最新サイクルを確認
  const jstStartIso = `${jst.dateKey}T00:00:00+09:00`;
  const { data: todayCycles, error: cycleErr } = await supabase
    .from('ai_pipeline_cycles')
    .select('id, status, created_at')
    .gte('created_at', jstStartIso)
    .order('created_at', { ascending: false })
    .limit(5);

  if (cycleErr) {
    throw new Error(`サイクル取得エラー: ${cycleErr.message}`);
  }

  const latestTodayCycle = todayCycles?.[0];

  // すでに本日分の生成が完了している場合（force=true 以外）
  if (latestTodayCycle && TERMINAL_STATUSES.has(latestTodayCycle.status) && !force) {
    return NextResponse.json({
      success: true,
      jstNow: `${jst.dateKey} (${jst.targetDay}) ${jst.timeLabel}`,
      action: 'skipped_already_completed',
      cycleId: latestTodayCycle.id,
      status: latestTodayCycle.status,
    });
  }

  // 本日のサイクルがまだない場合は新規作成（/api/pipeline/start）
  let activeCycleId = latestTodayCycle?.id;
  let currentStatus = latestTodayCycle?.status || 'none';

  if (!activeCycleId) {
    const startRes = await fetch(`${origin}/api/pipeline/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        triggerType: 'cron',
        targetDay: jst.targetDay,
      }),
    });

    const startJson = await startRes.json().catch(() => ({}));
    activeCycleId = startJson.cycleId || startJson.id;
    if (!startRes.ok || !activeCycleId) {
      throw new Error(startJson.error || 'パイプライン開始（/api/pipeline/start）に失敗しました');
    }

    const { data: createdCycle } = await supabase
      .from('ai_pipeline_cycles')
      .select('status')
      .eq('id', activeCycleId)
      .single();

    currentStatus = createdCycle?.status || startJson.status || 'running';

    return NextResponse.json({
      success: true,
      jstNow: `${jst.dateKey} (${jst.targetDay}) ${jst.timeLabel}`,
      action: 'started_cycle',
      cycleId: activeCycleId,
      targetDay: jst.targetDay,
      status: currentStatus,
    });
  }

  // 進行中のサイクルがある場合は、1ステップだけワーカーを進める（/api/pipeline/worker）
  const workerRes = await fetch(`${origin}/api/pipeline/worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cycleId: activeCycleId,
      targetDay: jst.targetDay,
    }),
  });

  if (!workerRes.ok) {
    const errText = await workerRes.text().catch(() => '');
    throw new Error(`Worker実行エラー: ${workerRes.status} ${errText}`);
  }

  const { data: updatedCycle } = await supabase
    .from('ai_pipeline_cycles')
    .select('status')
    .eq('id', activeCycleId)
    .single();

  currentStatus = updatedCycle?.status || currentStatus;

  return NextResponse.json({
    success: true,
    jstNow: `${jst.dateKey} (${jst.targetDay}) ${jst.timeLabel}`,
    action: 'advanced_worker_step',
    cycleId: activeCycleId,
    targetDay: jst.targetDay,
    status: currentStatus,
  });
}

export async function GET(req: Request) {
  try {
    return await handleAutoGenerate(req);
  } catch (err: any) {
    console.error('[Auto Generate Cron GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    return await handleAutoGenerate(req);
  } catch (err: any) {
    console.error('[Auto Generate Cron POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}