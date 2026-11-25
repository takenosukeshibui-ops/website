// app/api/ai/publish/route.ts
import { NextResponse } from 'next/server';
import { publishToInstagram, publishToXThread } from '@/lib/publishDeliverables';

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

    if (platform === 'instagram') {
      const result = await publishToInstagram({ content, imageUrl, imageUrls });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: result.message,
        postId: result.postId,
      });
    }

    if (platform === 'x') {
      const result = await publishToXThread({
        mainPost: mainPost || content,
        threadPosts,
        imageUrl,
        imageUrls,
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: result.message,
        tweetId: result.tweetId,
      });
    }

    return NextResponse.json({ success: false, error: '未対応のプラットフォームです' }, { status: 400 });
  } catch (err: any) {
    console.error('送信エラー:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}