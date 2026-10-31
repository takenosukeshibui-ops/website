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
}: InstagramPostParams): Promise<InstagramPostResult> {
  const { accountId, accessToken } = getSanitizedCredentials();
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