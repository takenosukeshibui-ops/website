'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrderFromCart(cartItemIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    if (!cartItemIds || cartItemIds.length === 0) {
        throw new Error('カートに商品が含まれていません')
    }

    // 1. orders テーブルに新しい注文を作成
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'pending'
        })
        .select()
        .single()

    if (orderError || !order) {
        throw new Error(`注文の作成に失敗しました: ${orderError?.message}`)
    }

    // 2. order_items テーブルに (order_id, item_id) のペアを保存
    const orderItemsData = cartItemIds.map((itemId) => ({
        order_id: order.id,
        item_id: itemId
    }))

    const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)

    if (orderItemsError) {
        throw new Error(`注文商品の紐付けに失敗しました: ${orderItemsError.message}`)
    }

    // 3. items テーブルのステータスを 'draft' から 'pending'（依頼済み）に更新
    const { error: itemUpdateError } = await supabase
        .from('items')
        .update({ status: 'pending' })
        .in('id', cartItemIds)

    if (itemUpdateError) {
        throw new Error(`商品のステータス更新に失敗しました: ${itemUpdateError.message}`)
    }

    // 4. ページの表示内容を再検証（再読み込み）
    revalidatePath('/dashboard')
    revalidatePath('/admin')

    return { success: true }
}