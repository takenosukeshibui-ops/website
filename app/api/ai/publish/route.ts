// app/api/ai/publish/route.ts
import { NextResponse } from 'next/server';
import { publishThreadToX } from '@/lib/twitter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platform, content, imageUrl, imageUrls, mainPost, threadPosts } = body;

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
    // 2. Instagram への自動投稿 (Graph API: 単一画像 / カルーセル両対応)
    // ==========================================
    if (platform === 'instagram') {
      const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

      if (!accountId || !accessToken) {
        return NextResponse.json(
          {
            success: false,
            error: '環境変数 INSTAGRAM_BUSINESS_ACCOUNT_ID または INSTAGRAM_ACCESS_TOKEN が設定されていません',
          },
          { status: 500 }
        );
      }

      // スライド対象画像のリストアップ
      const targetImages: string[] = Array.isArray(imageUrls) && imageUrls.length > 0
        ? imageUrls
        : imageUrl
        ? [imageUrl]
        : [process.env.INSTAGRAM_DEFAULT_IMAGE_URL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080'];

      const isCarousel = targetImages.length >= 2;
      let finalCreationId = '';

      if (isCarousel) {
        // --- A. カルーセル投稿フロー ---
        // 1. 各スライド用の子メディアコンテナを並列作成
        const childContainerIds: string[] = [];
        for (const imgUrl of targetImages) {
          const itemRes = await fetch(
            `https://graph.facebook.com/v26.0/${accountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: imgUrl,
                is_carousel_item: true,
                access_token: accessToken,
              }),
            }
          );
          const itemData = await itemRes.json();
          if (!itemRes.ok || !itemData.id) {
            console.error('Carousel Item Container Error:', itemData);
            throw new Error(itemData.error?.message || 'カルーセル子スライドの作成に失敗しました');
          }
          childContainerIds.push(itemData.id);
        }

        // 2. Meta側の画像処理を待機
        await new Promise((resolve) => setTimeout(resolve, 4000));

        // 3. 親カルーセルコンテナ (media_type: CAROUSEL) を作成
        const carouselRes = await fetch(
          `https://graph.facebook.com/v26.0/${accountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'CAROUSEL',
              children: childContainerIds,
              caption: content,
              access_token: accessToken,
            }),
          }
        );
        const carouselData = await carouselRes.json();
        if (!carouselRes.ok || !carouselData.id) {
          console.error('Carousel Parent Container Error:', carouselData);
          throw new Error(carouselData.error?.message || '親カルーセルコンテナの作成に失敗しました');
        }
        finalCreationId = carouselData.id;
      } else {
        // --- B. 単一画像投稿フロー ---
        const containerRes = await fetch(
          `https://graph.facebook.com/v26.0/${accountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: targetImages[0],
              caption: content,
              access_token: accessToken,
            }),
          }
        );
        const containerData = await containerRes.json();
        if (!containerRes.ok || !containerData.id) {
          console.error('Instagram Single Container Error:', containerData);
          throw new Error(containerData.error?.message || 'メディアコンテナ作成に失敗しました');
        }
        finalCreationId = containerData.id;
      }

      // Metaサーバー側の最適化を待機
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // 投稿 (media_publish) の実行
      const publishRes = await fetch(
        `https://graph.facebook.com/v26.0/${accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: finalCreationId,
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
        message: `Instagram (worldwidejapan2023) へ${isCarousel ? `全${targetImages.length}枚のカルーセル` : '単一画像'}投稿が完了しました！`,
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
        imageUrl: imageUrl || (Array.isArray(imageUrls) ? imageUrls[0] : undefined),
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