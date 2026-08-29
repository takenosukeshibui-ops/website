// app/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 数量変更
export async function updateItemQuantity(itemId: string, quantity: number) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('管理者権限がありません')

    const { error } = await supabase
        .from('items')
        .update({ quantity })
        .eq('id', itemId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 価格変更
export async function updateItemPrice(itemId: string, price: number) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('管理者権限がありません')

    const { error } = await supabase
        .from('items')
        .update({ price })
        .eq('id', itemId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 商品ステータス変更 ＆ 注文全体のステータス自動判定
export async function updateItemStatus(itemId: string, status: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('管理者権限がありません')

    // 1. 商品のステータスを更新
    const { error: updateError } = await supabase
        .from('items')
        .update({ status })
        .eq('id', itemId)

    if (updateError) throw new Error(updateError.message)

    // 2. 紐づく order_id を取得 (.single()の代わりに配列取得で安全化)
    const { data: orderItemRows } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('item_id', itemId)

    const orderId = orderItemRows && orderItemRows.length > 0 ? orderItemRows[0].order_id : null

    // 3. 注文全体のステータスを判定して更新
    if (orderId) {
        // 現在の注文情報を取得（決済待ちや発送完了を上書きしないため）
        const { data: currentOrder } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .single()

        // 決済待ち・発送完了・手動キャンセルの場合は商品変更でステータスを巻き戻さない
        const isAdvancedStatus = ['payment_required', 'shipped'].includes(currentOrder?.status || '')

        if (!isAdvancedStatus) {
            const { data: itemLinks } = await supabase
                .from('order_items')
                .select('item_id')
                .eq('order_id', orderId)

            if (itemLinks && itemLinks.length > 0) {
                const itemIds = itemLinks.map(l => l.item_id)

                const { data: items } = await supabase
                    .from('items')
                    .select('status')
                    .in('id', itemIds)

                if (items && items.length > 0) {
                    const statuses = items.map(i => i.status)

// ==================== ★ここを追加====================
    console.log('--- デバッグログ開始 ---')
    console.log('【DBから取得した全商品のステータス】:', statuses)
    // ===================================================

                    let newOrderStatus = 'pending'

                    // ① 全ての商品が out_of_stock または cancelled ➔ キャンセル
                    if (statuses.every(s => ['out_of_stock', 'cancelled'].includes(s))) {
                        newOrderStatus = 'cancelled'
                    }
                    // ② 全ての商品が pending ➔ 依頼済み
                    else if (statuses.every(s => s === 'pending')) {
                        newOrderStatus = 'pending'
                    } 
                    else {
                        // キャンセル・在庫切れを除外した有効な商品
                        const activeStatuses = statuses.filter(s => !['out_of_stock', 'cancelled'].includes(s))


                        // ==================== ★ここを追加====================
                        console.log('【対象となる有効商品のステータス】:', activeStatuses)
                        // ===================================================
                        

                        
                        if (activeStatuses.length > 0) {
                            // ③ 有効な商品がすべて in_warehouse ➔ 国際発送準備中 (calculating)
                            if (activeStatuses.every(s => s === 'in_warehouse')) {
                                newOrderStatus = 'calculating'
                            }
                            // ④ 有効な商品がすべて purchased ➔ 買い付け完了 (procured)
                            else if (activeStatuses.every(s => s === 'purchased')) {
                                newOrderStatus = 'procured'
                            }
                            // ⑤ 倉庫到着と購入完了が混在（未処理品なし） ➔ 買い付け完了 (procured)
                            else if (activeStatuses.every(s => ['purchased', 'in_warehouse'].includes(s))) {
                                newOrderStatus = 'procured'
                            }
                            // ⑥ 未処理（pending）が残っている場合 ➔ 依頼済み (pending)
                            else {
                                newOrderStatus = 'pending'
                            }
                        }
                    }

                    // 注文の全体ステータスを更新
                    const { error: orderUpdateError } = await supabase
                        .from('orders')
                        .update({ status: newOrderStatus })
                        .eq('id', orderId)

                    if (orderUpdateError) {
                        console.error('注文ステータスの更新エラー:', orderUpdateError.message)
                    }
                }
            }
        }
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 請求書送信 (payment_required に変更)
export async function sendInvoice(orderId: string, shippingFee: number, totalAmount: number) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('管理者権限がありません')

    const { error } = await supabase
        .from('orders')
        .update({
            shipping_fee: shippingFee,
            total_amount: totalAmount,
            status: 'payment_required' // 決済待ち
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 発送完了処理 (shipped に変更)
export async function shipOrder(orderId: string, trackingNumber: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('管理者権限がありません')

    const { error } = await supabase
        .from('orders')
        .update({
            tracking_number: trackingNumber,
            status: 'shipped' // 国際発送済み
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}