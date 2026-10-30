// lib/twitter.ts
import { TwitterApi } from 'twitter-api-v2';

interface PublishXThreadParams {
  mainPost: string;
  threadPosts?: string[];
}

interface PublishXResult {
  success: boolean;
  firstTweetId?: string;
  error?: string;
}

/**
 * X (Twitter) API v2 を使用して1ポスト目およびスレッドツリーを投稿する
 */
export async function publishThreadToX({
  mainPost,
  threadPosts = [],
}: PublishXThreadParams): Promise<PublishXResult> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return {
      success: false,
      error: 'X (Twitter) API の認証環境変数が不足しています (X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET)。',
    };
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessTokenSecret,
  });

  try {
    // 1ポスト目 ＋ 2ポスト目以降のツリー配列を結合
    const postsToPublish = [mainPost, ...threadPosts.filter(Boolean)];

    // tweetThread API で親ポストから順番にリプライ連鎖として自動投稿
    const response = await client.v2.tweetThread(postsToPublish);

    const firstTweetId = response[0]?.data?.id;

    return {
      success: true,
      firstTweetId,
    };
  } catch (err: any) {
    console.error('X Publish Error:', err);
    return {
      success: false,
      error: err?.data?.detail || err?.message || 'Xへの投稿処理中にエラーが発生しました。',
    };
  }
}