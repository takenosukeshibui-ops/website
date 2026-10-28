// lib/instagram.ts

interface InstagramPostParams {
  caption: string;
  imageUrl?: string;
}

interface InstagramPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Instagram Graph API を使って画像をフィード投稿する
 */
export async function publishToInstagram({
  caption,
  imageUrl,
}: InstagramPostParams): Promise<InstagramPostResult> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const fallbackImage =
    process.env.INSTAGRAM_DEFAULT_IMAGE_URL ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080';

  if (!accountId || !accessToken) {
    return {
      success: false,
      error: 'INSTAGRAM_BUSINESS_ACCOUNT_ID または INSTAGRAM_ACCESS_TOKEN が未設定です。',
    };
  }

  const targetImage = imageUrl || fallbackImage;

  try {
    // 1. メディアコンテナ (Media Container) の作成
    const containerRes = await fetch(
      `https://graph.facebook.com/v26.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: targetImage,
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      console.error('Instagram container creation failed:', containerData);
      return {
        success: false,
        error: containerData.error?.message || 'メディアコンテナ作成に失敗しました。',
      };
    }

    const creationId = containerData.id;

    // 2. メディア処理待機 (Meta サーバー側で画像のダウンロードと最適化が行われるため数秒待機)
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // 3. 投稿 (Publish) の実行
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
      console.error('Instagram publish failed:', publishData);
      return {
        success: false,
        error: publishData.error?.message || '投稿の公開に失敗しました。',
      };
    }

    return {
      success: true,
      postId: publishData.id,
    };
  } catch (err: any) {
    console.error('Instagram API Error:', err);
    return {
      success: false,
      error: err.message || '通信エラーが発生しました。',
    };
  }
}

/**
 * 自社Instagramアカウントの過去投稿とエンゲージメント（いいね・コメント数）を取得する
 * @param limit 取得する過去の投稿数（デフォルト10件）
 */
// lib/instagram.ts

export async function getInstagramInsights(limit: number = 5) {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  // 1. 環境変数が設定されていない場合は即座に安全終了
  if (!accountId || !accessToken) {
    console.warn("Instagram credentials missing. Skipping insights.");
    return [];
  }

  const url = `https://graph.facebook.com/v19.0/${accountId}/media?fields=id,caption,like_count,comments_count,timestamp&limit=${limit}&access_token=${accessToken}`;

  try {
    // 2. 4秒以上応答がなければ強制キャンセルする（Vercelのタイムアウト防止）
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      // キャッシュさせずに最新を取得
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      console.error("Instagram Graph API Error:", errJson);
      // トークン切れ等の場合もエラーを投げずに空配列で安全に落とす
      return [];
    }

    const data = await res.json();
    return data?.data || [];
  } catch (error: any) {
    // タイムアウトやネットワーク切断時もパイプラインを止めない
    console.warn("Failed to fetch Instagram insights (timed out or network error):", error.message);
    return [];
  }
}