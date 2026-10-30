// app/api/ai/publish/route.ts
import { NextResponse } from 'next/server';
import { publishThreadToX } from '@/lib/twitter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platform, content, imageUrl, mainPost, threadPosts } = body;

    if (!platform || (!content && !mainPost)) {
      return NextResponse.json(
        { success: false, error: '送信内容またはプラットフォームが指定されていません' },
        { status: 400 }
      );
    }

    // ==========================================
    // 1. Discord への送信
    // ==========================================
    if (platform === 'discord') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_SALES_DM;
      if (!webhookUrl) {
        return NextResponse.json(
          { success: false, error: '環境変数 DISCORD_WEBHOOK_SALES_DM が設定されていません' },
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

    // ==========================================
    // 2. Instagram への自動投稿 (Graph API)
    // ==========================================
    if (platform === 'instagram') {
      const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const targetImageUrl =
        imageUrl ||
        process.env.INSTAGRAM_DEFAULT_IMAGE_URL ||
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';

      if (!accountId || !accessToken) {
        return NextResponse.json(
          {
            success: false,
            error: '環境変数 INSTAGRAM_BUSINESS_ACCOUNT_ID または INSTAGRAM_ACCESS_TOKEN が設定されていません',
          },
          { status: 500 }
        );
      }

      // ステップA: メディアコンテナ (Media Container) の作成
      const containerRes = await fetch(
        `https://graph.facebook.com/v26.0/${accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: targetImageUrl,
            caption: content,
            access_token: accessToken,
          }),
        }
      );

      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) {
        console.error('Instagram Container Error:', containerData);
        throw new Error(containerData.error?.message || 'メディアコンテナ作成に失敗しました');
      }

      const creationId = containerData.id;

      // ステップB: Meta側の画像処理を待機 (4秒)
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // ステップC: 投稿 (Media Publish) の実行
      const publishRes = await fetch(
        `https://graph.facebook.com/v26.0/${accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishRes.json();
      if (!publishRes.ok || !publishData.id) {
        console.error('Instagram Publish Error:', publishData);
        throw new Error(publishData.error?.message || '投稿の公開に失敗しました');
      }

      return NextResponse.json({
        success: true,
        message: 'Instagram (worldwidejapan2023) への投稿が完了しました！',
        postId: publishData.id,
      });
    }

    // ==========================================
    // 3. X (Twitter) へのスレッド自動投稿
    // ==========================================
    if (platform === 'x') {
      const targetMainPost = mainPost || content;
      const targetThreadPosts = Array.isArray(threadPosts) ? threadPosts : [];

      if (!targetMainPost) {
        return NextResponse.json(
          { success: false, error: '1ポスト目の本文が指定されていません' },
          { status: 400 }
        );
      }

      const result = await publishThreadToX({
        mainPost: targetMainPost,
        threadPosts: targetThreadPosts,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'X (Twitter) へのスレッド投稿が完了しました！',
        tweetId: result.firstTweetId,
      });
    }

    return NextResponse.json({ success: false, error: '未対応のプラットフォームです' }, { status: 400 });
  } catch (err: any) {
    console.error('送信エラー:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}