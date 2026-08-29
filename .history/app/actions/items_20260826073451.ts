'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createItem(formData: FormData) {
    console.log("=== カート追加処理開始 ===")

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        console.error("🚨 認証エラー: ユーザー情報が取得できませんでした", userError)
        return
    }

    const { error: insertError } = await supabase.from('items').insert({
        user_id: user.id,
        url: formData.get('url'),
        title: formData.get('title'),
        quantity: Number(formData.get('quantity')),
        status: 'draft',
    })

    if (insertError) {
        console.error("🚨 保存エラー: データベースへの追加に失敗しました", insertError)
        return
    }

    console.log("✅ 保存成功！")
    revalidatePath('/dashboard')
}

export async function submitOrder() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const orderId = crypto.randomUUID()
    await supabase
        .from('items')
        .update({ status: 'ordered', order_id: orderId })
        .eq('user_id', user.id)
        .eq('status', 'draft')

    revalidatePath('/dashboard')
}

export async function deleteItem(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
        .from('items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    revalidatePath('/dashboard')
}
