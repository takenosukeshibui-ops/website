// lib/twitter.ts
import { TwitterApi } from 'twitter-api-v2';

interface PublishXThreadParams {
  mainPost: string;
  threadPosts?: string[];
  imageUrl?: string; // 🌟 エラー解消: imageUrlプロパティを定義に追加
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
  imageUrl,
}: PublishXThreadParams): Promise<PublishXResult> {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return {
        success: false,
        error: 'Twitter APIの環境変数が設定されていません',
      };
    }

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    let mediaIds: string[] = [];

    // 🌟 画像URLが渡された場合、FetchしてBuffer化しメディアアップロード
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`画像のダウンロードに失敗しました: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // v1 API経由でメディアをアップロード
        const mediaId = await client.v1.uploadMedia(buffer, { mimeType: 'image/png' });
        mediaIds.push(mediaId);
      } catch (mediaErr: any) {
        console.error('Twitter media upload failed, posting without media:', mediaErr);
      }
    }

    // 1ポスト目（メディアがあれば添付） ＋ 2ポスト目以降のツリー配列を結合[cite: 3]
    const tweets: any[] = [];

    // 1ポスト目
    if (mediaIds.length > 0) {
      tweets.push({
        text: mainPost,
        media: { media_ids: mediaIds },
      });
    } else {
      tweets.push({
        text: mainPost,
      });
    }

    // 2ポスト目以降のスレッド
    for (const post of threadPosts) {
      if (post && post.trim()) {
        tweets.push({ text: post.trim() });
      }
    }

    // tweetThread API で親ポストから順番にリプライ連鎖として自動投稿[cite: 3]
    const result = await client.v2.tweetThread(tweets);

    return {
      success: true,
      firstTweetId: result[0]?.data?.id,
    };
  } catch (error: any) {
    console.error('Twitter API Exception:', error);
    return {
      success: false,
      error: error?.data?.detail || error?.message || 'Xへの投稿中に不明なエラーが発生しました',
    };
  }
}