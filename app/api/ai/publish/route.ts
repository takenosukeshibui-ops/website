// app/api/ai/publish/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { platform, content } = await req.json();

    if (!content || !platform) {
      return NextResponse.json(
        { success: false, error: '送信内容またはプラットフォームが指定されていません' },
        { status: 400 }
      );
    }

    if (platform === 'discord') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_SALES_DM;
      if (!webhookUrl) {
        return NextResponse.json(
          { success: false, error: 'Vercel環境変数 DISCORD_WEBHOOK_SALES_DM が設定されていません' },
          { status: 500 }
        );
      }

      // Discordの1メッセージ上限（2000文字）に収めるため安全に切り詰め
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.slice(0, 1990),
          username: 'Worldwide Japan Intelligence Bot',
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Discord送信エラー: ${res.statusText} (${errorText})`);
      }

      return NextResponse.json({ success: true, message: 'Discordへメッセージを直接送信しました！' });
    }

    return NextResponse.json({ success: false, error: '未対応のプラットフォームです' }, { status: 400 });
  } catch (err: any) {
    console.error('送信エラー:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}