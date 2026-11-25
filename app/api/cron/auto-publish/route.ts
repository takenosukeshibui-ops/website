// app/api/cron/auto-publish/route.ts
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publishToInstagram, publishToXThread } from '@/lib/publishDeliverables';

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function getJstNowInfo() {
  const now = new Date();
  const jstFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = jstFormatter.formatToParts(now);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  const year = map.get('year') || '2026';
  const month = map.get('month') || '01';
  const dayNum = map.get('day') || '01';
  const weekdayLong = map.get('weekday') || 'Thursday';
  const hour = Number(map.get('hour') || '0');
  const minute = Number(map.get('minute') || '0');

  const dayOfWeek =
    WEEKDAYS_EN.find((d) => d.toLowerCase() === weekdayLong.toLowerCase()) || 'Thursday';

  return {
    dateKey: `${year}-${month}-${dayNum}`,
    dayOfWeek,
    currentMinutes: hour * 60 + minute,
    currentTimeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

// 「日本時間 22:00」「21:00-23:00」「19時30分」などから JST 分単位(0〜1439)を抽出
function parseTimeToJstMinutes(timingText: unknown, fallbackMinutes: number): number {
  if (!timingText || typeof timingText !== 'string') return fallbackMinutes;

  // 例: 22:00, 21:30, 9:00
  const colonMatch = timingText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colonMatch) {
    return Number(colonMatch[1]) * 60 + Number(colonMatch[2]);
  }

  // 例: 21時30分 / 21時
  const jpMatch = timingText.match(/\b([01]?\d|2[0-3])時(?:([0-5]?\d)分)?/);
  if (jpMatch) {
    const h = Number(jpMatch[1]);
    const m = jpMatch[2] ? Number(jpMatch[2]) : 0;
    return h * 60 + m;
  }

  return fallbackMinutes;
}

function getRegionFallbackMinutes(region: string, platform: 'instagram' | 'x'): number {
  const r = region.toUpperCase();
  if (r === 'EU') return platform === 'instagram' ? 19 * 60 : 18 * 60 + 30;
  if (r === 'US') return platform === 'instagram' ? 22 * 60 : 21 * 60 + 30;
  return platform === 'instagram' ? 21 * 60 : 20 * 60;
}

function buildOgUrl(baseUrl: string, paramsObj: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(paramsObj)) {
    if (v) params.set(k, v);
  }
  return `${baseUrl}/api/og?${params.toString()}`;
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // CRON_SECRET未設定時はローカル/検証用に許可（本番では設定推奨）

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const customHeader = req.headers.get('x-cron-secret');
  if (customHeader === secret) return true;

  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') === secret) return true;

  return false;
}

async function handleAutoPublish(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const jst = getJstNowInfo();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin ||
    'http://localhost:3000';

  // 直近サイクルを取得
  const { data: latestCycles, error: cycleErr } = await supabase
    .from('ai_pipeline_cycles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (cycleErr || !latestCycles || latestCycles.length === 0) {
    return NextResponse.json({ success: true, message: '対象サイクルがありません', published: [] });
  }

  const targetCycle = latestCycles[0];

  const [{ data: deliverables }, { data: tactics }] = await Promise.all([
    supabase.from('ai_content_deliverables').select('*').eq('cycle_id', targetCycle.id),
    supabase.from('ai_platform_tactics').select('*').eq('cycle_id', targetCycle.id),
  ]);

  const igTacticTiming = tactics?.find((t) => t.platform === 'instagram')?.recommended_timing;
  const xTacticTiming = tactics?.find((t) => t.platform === 'x')?.recommended_timing;

  const publishedResults: any[] = [];
  const skippedResults: any[] = [];

  for (const deliv of deliverables || []) {
    const payload = deliv.content_payload && typeof deliv.content_payload === 'object'
      ? { ...deliv.content_payload }
      : {};

    const publishedMap: Record<string, string> =
      payload.autoPublishedLog && typeof payload.autoPublishedLog === 'object'
        ? { ...payload.autoPublishedLog }
        : {};

    let payloadModified = false;

    // ----------------------------------------------------------------------
    // A. Instagram 投稿チェック（曜日・地域ごとにAI推奨時刻で実行）
    // ----------------------------------------------------------------------
    if (deliv.platform === 'instagram' && Array.isArray(payload.dailyPosts)) {
      const defaultTiming = payload.recommendedTiming || igTacticTiming;

      for (const post of payload.dailyPosts) {
        const postDay = post?.day || deliv.day_of_week;
        if (postDay !== jst.dayOfWeek) continue;

        const region = String(post?.region || post?.infographicData?.region || 'US').toUpperCase();
        const dedupeKey = `${jst.dateKey}_${postDay}_${region}_instagram`;

        if (publishedMap[dedupeKey]) {
          skippedResults.push({ key: dedupeKey, reason: 'already_published_today' });
          continue;
        }

        const rawTiming = post?.recommendedTiming || defaultTiming;
        const scheduledMinutes = parseTimeToJstMinutes(
          rawTiming,
          getRegionFallbackMinutes(region, 'instagram')
        );

        if (jst.currentMinutes < scheduledMinutes) {
          skippedResults.push({
            key: dedupeKey,
            reason: `before_scheduled_time (${jst.currentTimeLabel} < scheduled ${scheduledMinutes})`,
          });
          continue;
        }

        const info = post?.infographicData || {};
        const slide1Url = buildOgUrl(origin, {
          type: postDay,
          cardName: info.cardName || 'Featured Card',
          jpPrice: info.jpPrice || '',
          overseasPrice: info.overseasPrice || '',
          spread: info.spread || '',
          roi: info.roi || '',
          hookText: info.hookText || '',
        });
        const slide2Url = `${origin}/api/og?type=cta`;

        const res = await publishToInstagram({
          content: post.caption || '',
          imageUrls: [slide1Url, slide2Url],
        });

        if (res.success) {
          publishedMap[dedupeKey] = new Date().toISOString();
          payloadModified = true;
          publishedResults.push({ key: dedupeKey, postId: res.postId });
        } else {
          skippedResults.push({ key: dedupeKey, reason: res.error || 'publish_failed' });
        }
      }
    }

    // ----------------------------------------------------------------------
    // B. X (Twitter) スレッドチェック（曜日・地域ごとにAI推奨時刻で実行）
    // ----------------------------------------------------------------------
    if (deliv.platform === 'x' && Array.isArray(payload.dailyThreads)) {
      const defaultTiming = payload.recommendedTiming || xTacticTiming;

      for (const thread of payload.dailyThreads) {
        const threadDay = thread?.day || deliv.day_of_week;
        if (threadDay !== jst.dayOfWeek) continue;

        const region = String(thread?.region || 'US').toUpperCase();
        const dedupeKey = `${jst.dateKey}_${threadDay}_${region}_x`;

        if (publishedMap[dedupeKey]) {
          skippedResults.push({ key: dedupeKey, reason: 'already_published_today' });
          continue;
        }

        const rawTiming = thread?.recommendedTiming || defaultTiming;
        const scheduledMinutes = parseTimeToJstMinutes(
          rawTiming,
          getRegionFallbackMinutes(region, 'x')
        );

        if (jst.currentMinutes < scheduledMinutes) {
          skippedResults.push({
            key: dedupeKey,
            reason: `before_scheduled_time (${jst.currentTimeLabel} < scheduled ${scheduledMinutes})`,
          });
          continue;
        }

        const info = thread?.infographicData || {};
        const imageUrl = buildOgUrl(origin, {
          type: info.type || 'arbitrage',
          cardName: info.cardName || 'Featured Card',
          jpPrice: info.jpPrice || '',
          overseasPrice: info.overseasPrice || '',
          spread: info.spread || '',
          roi: info.roi || '',
          hookText: info.hookText || '',
        });

        const res = await publishToXThread({
          mainPost: thread.mainPost || '',
          threadPosts: Array.isArray(thread.threadPosts) ? thread.threadPosts : [],
          imageUrl,
        });

        if (res.success) {
          publishedMap[dedupeKey] = new Date().toISOString();
          payloadModified = true;
          publishedResults.push({ key: dedupeKey, tweetId: res.tweetId });
        } else {
          skippedResults.push({ key: dedupeKey, reason: res.error || 'publish_failed' });
        }
      }
    }

    if (payloadModified) {
      await supabase
        .from('ai_content_deliverables')
        .update({
          content_payload: {
            ...payload,
            autoPublishedLog: publishedMap,
          },
          status: 'published',
        })
        .eq('id', deliv.id);
    }
  }

  return NextResponse.json({
    success: true,
    jstNow: `${jst.dateKey} (${jst.dayOfWeek}) ${jst.currentTimeLabel}`,
    cycleId: targetCycle.id,
    published: publishedResults,
    skipped: skippedResults,
  });
}

export async function GET(req: Request) {
  try {
    return await handleAutoPublish(req);
  } catch (err: any) {
    console.error('[Auto Publish Cron GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    return await handleAutoPublish(req);
  } catch (err: any) {
    console.error('[Auto Publish Cron POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}