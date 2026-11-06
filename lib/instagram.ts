// lib/instagram.ts

interface InstagramPostParams {
  caption: string;
  imageUrl?: string;
  imageUrls?: string[];
}

interface InstagramPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * 環境変数からトークンを取得し、不要な引用符や空白をサニタイズする内部ヘルパー
 */
function getSanitizedCredentials() {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() || '';
  let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || '';

  // Vercel設定時に誤って混入した前後のダブルクォート・シングルクォートを除去
  if ((accessToken.startsWith('"') && accessToken.endsWith('"')) ||
      (accessToken.startsWith("'") && accessToken.endsWith("'"))) {
    accessToken = accessToken.slice(1, -1).trim();
  }

  return { accountId, accessToken };
}

/**
 * Instagram Graph API を使って画像をフィード投稿する
 */
export async function publishToInstagram({
  caption,
  imageUrl,
  imageUrls, // 👈 引数に追加
}: InstagramPostParams): Promise<InstagramPostResult> {
  const { accountId, accessToken } = getSanitizedCredentials();

  if (!accountId || !accessToken) {
    return { success: false, error: 'Instagram API認証情報が未設定です' };
  }

  // 送信対象の画像URLリストを確定
  const targetImages = Array.isArray(imageUrls) && imageUrls.length > 0
    ? imageUrls
    : imageUrl
    ? [imageUrl]
    : [process.env.INSTAGRAM_DEFAULT_IMAGE_URL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080'];

  const isCarousel = targetImages.length >= 2;

  try {
    let finalCreationId = '';

    if (isCarousel) {
      // ----------------------------------------------------
      // A. カルーセル投稿フロー
      // ----------------------------------------------------
      // 1. 各スライド画像の子コンテナを並列作成 (is_carousel_item: true)
      const childIds: string[] = [];
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
          throw new Error(itemData.error?.message || 'カルーセル子スライドの作成に失敗しました');
        }
        childIds.push(itemData.id);
      }

      // 2. Meta側の画像処理を待機 (4秒)
      await new Promise((r) => setTimeout(r, 4000));

      // 3. 親カルーセルコンテナを作成して子スライド群を束ねる
      const parentRes = await fetch(`https://graph.facebook.com/v26.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childIds,
          caption,
          access_token: accessToken,
        }),
      });
      const parentData = await parentRes.json();
      if (!parentRes.ok || !parentData.id) {
        throw new Error(parentData.error?.message || '親カルーセルコンテナの作成に失敗しました');
      }
      finalCreationId = parentData.id;
    } else {
      // ----------------------------------------------------
      // B. 従来の単一画像投稿フロー
      // ----------------------------------------------------
      const singleRes = await fetch(`https://graph.facebook.com/v26.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: targetImages[0],
          caption,
          access_token: accessToken,
        }),
      });
      const singleData = await singleRes.json();
      if (!singleRes.ok || !singleData.id) {
        throw new Error(singleData.error?.message || '単一メディアコンテナの作成に失敗しました');
      }
      finalCreationId = singleData.id;
    }

    // 4. Meta側の最適化完了を待機 (4秒)
    await new Promise((r) => setTimeout(r, 4000));

    // 5. 投稿 (media_publish) の実行
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
      throw new Error(publishData.error?.message || '投稿の公開に失敗しました');
    }

    return { success: true, postId: publishData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 自社Instagramアカウントの過去投稿とエンゲージメント（いいね・コメント数）を取得する
 * @param limit 取得する過去の投稿数（デフォルト5件）
 */
export async function getInstagramInsights(limit: number = 5) {
  const { accountId, accessToken } = getSanitizedCredentials();

  // 1. 環境変数が未設定の場合は安全に空配列を返却
  if (!accountId || !accessToken) {
    console.warn('⚠️ [Instagram] 認証情報が設定されていないためインサイト取得をスキップします。');
    return [];
  }

  // 🌟 Vercelログ上で実際に使用されているトークンの先頭・末尾・文字数を出力して照合
  console.log(
    `🔍 [Instagram Auth Check] AccountID: ${accountId.slice(0, 5)}*** | Token: ${accessToken.slice(0, 10)}...${accessToken.slice(-6)} (全${accessToken.length}文字)`
  );

  const url = `https://graph.facebook.com/v26.0/${accountId}/media?fields=id,caption,like_count,comments_count,timestamp&limit=${limit}&access_token=${accessToken}`;

  try {
    // 2. 4秒以上応答がない場合はタイムアウト（サーバーレス関数のフリーズ防止）
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      console.error('Instagram Graph API Error:', errJson);
      // トークン失効・無効時も例外をスローせず、安全に空配列を返してパイプラインを継続させる
      return [];
    }

    const data = await res.json();
    return data?.data || [];
  } catch (error: any) {
    console.warn('Failed to fetch Instagram insights (timed out or network error):', error.message);
    return [];
  }
}