// lib/publishDeliverables.ts
import { publishThreadToX } from '@/lib/twitter';

export interface PublishInstagramInput {
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
}

export interface PublishXInput {
  mainPost: string;
  threadPosts?: string[];
  imageUrl?: string;
  imageUrls?: string[];
}

export async function publishToInstagram({
  content,
  imageUrl,
  imageUrls,
}: PublishInstagramInput): Promise<{ success: boolean; message?: string; postId?: string; error?: string }> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    return {
      success: false,
      error: '環境変数 INSTAGRAM_BUSINESS_ACCOUNT_ID または INSTAGRAM_ACCESS_TOKEN が設定されていません',
    };
  }

  const targetImages: string[] =
    Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls
      : imageUrl
      ? [imageUrl]
      : [
          process.env.INSTAGRAM_DEFAULT_IMAGE_URL ||
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080',
        ];

  const isCarousel = targetImages.length >= 2;
  let finalCreationId = '';

  if (isCarousel) {
    const childContainerIds: string[] = [];
    for (const imgUrl of targetImages) {
      const itemRes = await fetch(`https://graph.facebook.com/v26.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imgUrl,
          is_carousel_item: true,
          access_token: accessToken,
        }),
      });
      const itemData = await itemRes.json();
      if (!itemRes.ok || !itemData.id) {
        console.error('Carousel Item Container Error:', itemData);
        throw new Error(itemData.error?.message || 'カルーセル子スライドの作成に失敗しました');
      }
      childContainerIds.push(itemData.id);
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));

    const carouselRes = await fetch(`https://graph.facebook.com/v26.0/${accountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childContainerIds,
        caption: content,
        access_token: accessToken,
      }),
    });
    const carouselData = await carouselRes.json();
    if (!carouselRes.ok || !carouselData.id) {
      console.error('Carousel Parent Container Error:', carouselData);
      throw new Error(carouselData.error?.message || '親カルーセルコンテナの作成に失敗しました');
    }
    finalCreationId = carouselData.id;
  } else {
    const containerRes = await fetch(`https://graph.facebook.com/v26.0/${accountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: targetImages[0],
        caption: content,
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      console.error('Instagram Single Container Error:', containerData);
      throw new Error(containerData.error?.message || 'メディアコンテナ作成に失敗しました');
    }
    finalCreationId = containerData.id;
  }

  await new Promise((resolve) => setTimeout(resolve, 4000));

  const publishRes = await fetch(`https://graph.facebook.com/v26.0/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: finalCreationId,
      access_token: accessToken,
    }),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    console.error('Instagram Publish Error:', publishData);
    throw new Error(publishData.error?.message || '投稿の公開に失敗しました');
  }

  return {
    success: true,
    message: `Instagram へ${isCarousel ? `全${targetImages.length}枚のカルーセル` : '単一画像'}投稿が完了しました！`,
    postId: publishData.id,
  };
}

export async function publishToXThread({
  mainPost,
  threadPosts = [],
  imageUrl,
  imageUrls,
}: PublishXInput): Promise<{ success: boolean; message?: string; tweetId?: string; error?: string }> {
  if (!mainPost) {
    return { success: false, error: '1ポスト目の本文が指定されていません' };
  }

  const result = await publishThreadToX({
    mainPost,
    threadPosts: Array.isArray(threadPosts) ? threadPosts : [],
    imageUrl: imageUrl || (Array.isArray(imageUrls) ? imageUrls[0] : undefined),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: 'X (Twitter) へのスレッド投稿が完了しました！',
    tweetId: result.firstTweetId,
  };
}