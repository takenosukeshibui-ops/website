// app/api/bookmarklet/add/route.ts
// [UPDATED] ブックマークレット追加成功時に親画面(window.opener)へ postMessage を送って自動更新させる処理を追加
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url') || ''
    const title = searchParams.get('title') || '名称未設定'
    const quantityRaw = searchParams.get('quantity')
    const quantity = quantityRaw ? parseInt(quantityRaw) : 1
    const desiredPriceRaw = searchParams.get('desiredPrice')
    const desiredPrice = desiredPriceRaw ? parseFloat(desiredPriceRaw) : null
    const remarks = searchParams.get('remarks') || null

    if (!url) {
        return new NextResponse(
            '<script>alert("URLが取得できませんでした"); window.close();</script>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return new NextResponse(
            '<script>alert("ログインが必要です。先にシステムにログインしてください。"); window.close();</script>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    }

    const { error } = await supabase.from('items').insert({
        user_id: user.id,
        url,
        title,
        quantity,
        desired_price: desiredPrice,
        remarks,
        status: 'draft' // カート内商品として追加
    })

    if (error) {
        console.error('Bookmarklet add error:', error.message)
        return new NextResponse(
            `<script>alert("追加に失敗しました: ${error.message}"); window.close();</script>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    }

    revalidatePath('/', 'layout')
    revalidatePath('/dashboard')
    revalidatePath('/admin')

    // [UPDATED] 親画面へ通知メッセージを送信してから閉じる
    return new NextResponse(
        `<script>
            if (window.opener) {
                window.opener.postMessage({ type: 'BOOKMARKLET_ITEM_ADDED' }, '*');
            }
            window.close();
        </script>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
}