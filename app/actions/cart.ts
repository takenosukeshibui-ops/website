// app/actions/cart.ts
// [UPDATED] 注文作成時に商品のステータス更新を確実に実行し、ロールバック処理を追加してカート残りを防止
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// カート内商品の削除処理
export async function deleteCartItem(itemId: string) {
    const supabase = await createClient()

    // 1. ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error('認証エラーが発生しました。再度ログインしてください。 / Authentication error. Please log in again.')
    }

    if (!itemId) {
        throw new Error('削除対象の商品IDが不正です。 / Invalid item ID.')
    }

    // 2. 中間テーブル (order_items) の紐付けを解除 (制約エラー回避)
    const { error: relError } = await supabase
        .from('order_items')
        .delete()
        .eq('item_id', itemId)

    if (relError) {
        console.warn('order_items 削除警告:', relError.message)
    }

    // 3. items テーブルから該当商品を物理削除
    const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)

    if (deleteError) {
        console.error('Cart item delete error:', deleteError)
        throw new Error(`DBからの削除に失敗しました / Failed to delete from DB: ${deleteError.message}`)
    }

    // 4. マイページ・カート関連のキャッシュを即時再検証
    revalidatePath('/dashboard')
    revalidatePath('/cart')

    return { success: true }
}

// カートからの注文作成処理
export async function createOrderFromCart(itemIds: string[], shippingMethod: string, paymentMethod: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error('認証エラーが発生しました。再度ログインしてください。 / Authentication error. Please log in again.')
    }

    if (!itemIds || itemIds.length === 0) {
        throw new Error('カート内に商品が存在しません。 / No items in cart.')
    }

    // 1. ユーザーの配送先プロフを取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('country, zip_code, state_province, city, address_line1, address_line2, address_line3, is_residential')
        .eq('id', user.id)
        .single()

    const selectedShipping = shippingMethod || '最安プラン自動選択 (航空便)'
    const selectedPayment = paymentMethod || 'Wise'

    // 2. 新規注文レコードの作成
    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            status: 'pending',
            shipping_method: selectedShipping,
            payment_method: selectedPayment,
            shipping_country: profile?.country || 'US',
            shipping_zip_code: profile?.zip_code || null,
            shipping_state_province: profile?.state_province || null,
            shipping_city: profile?.city || null,
            shipping_address_line1: profile?.address_line1 || null,
            shipping_address_line2: profile?.address_line2 || null,
            shipping_address_line3: profile?.address_line3 || null,
            shipping_is_residential: profile?.is_residential ?? true,
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (orderError || !newOrder) {
        console.error('Order creation error:', orderError?.message)
        throw new Error('注文の作成に失敗しました / Failed to create order: ' + (orderError?.message || ''))
    }

    // [UPDATED] 3. 先に対象商品のステータスを 'pending' (注文済み) に変更
    const { error: itemUpdateError } = await supabase
        .from('items')
        .update({ status: 'pending' })
        .in('id', itemIds)
        .eq('user_id', user.id)
        .eq('status', 'draft') // [NEW] カート内商品(draft)のみ確実に更新

    if (itemUpdateError) {
        console.error('Item status update error:', itemUpdateError.message)
        // 商品のステータス更新に失敗した場合は作成した注文を削除（ロールバック）
        await supabase.from('orders').delete().eq('id', newOrder.id)
        throw new Error(`商品の注文状態への更新に失敗しました / Failed to update item status: ${itemUpdateError.message}`)
    }

    // [UPDATED] 4. 中間テーブル (order_items) に紐付け登録
    const orderItemsPayload = itemIds.map(itemId => ({
        order_id: newOrder.id,
        item_id: itemId
    }))

    const { error: linkError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload)

    if (linkError) {
        console.error('Order item link error detail:', linkError.message, linkError.details, linkError.hint)
        // 紐付け失敗時は商品ステータスを draft に戻し、注文も削除する
        await supabase.from('items').update({ status: 'draft' }).in('id', itemIds).eq('user_id', user.id)
        await supabase.from('orders').delete().eq('id', newOrder.id)
        throw new Error(`注文商品の紐付けに失敗しました / Failed to link order items: ${linkError.message}`)
    }

    // 5. 画面キャッシュの再検証
    revalidatePath('/dashboard')
    revalidatePath('/admin')

    return { success: true, orderId: newOrder.id }
}