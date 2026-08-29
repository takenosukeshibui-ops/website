// app/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 共通処理: 注文の現在データ（請求書額・追跡番号・商品組成）から正しい注文ステータスを計算して更新する関数
async function recalculateOrderStatus(supabase: any, orderId: string) {
    // 注文のデータ（請求書額・追跡番号）を取得
    const { data: order } = await supabase
        .from('orders')
        .select('total_amount, tracking_number')
        .eq('id', orderId)
        .single()

    let newOrderStatus = 'pending'

    // 優先度①：追跡番号が設定されている場合 ➔ 国際発送済み
    if (order?.tracking_number && String(order.tracking_number).trim() !== '') {
        newOrderStatus = 'shipped'
    }
    // 優先度②：請求書（合計金額）が確定されている場合 ➔ 決済待ち
    else if (order?.total_amount !== null && order?.total_amount !== undefined && Number(order.total_amount) > 0) {
        newOrderStatus = 'payment_required'
    }
    // 優先度③：上記がない場合は、商品ステータスの組成から自動判定
    else {
        const { data: itemLinks } = await supabase
            .from('order_items')
            .select('item_id')
            .eq('order_id', orderId)

        if (itemLinks && itemLinks.length > 0) {
            const itemIds = itemLinks.map((l: any) => l.item_id)

            const { data: items } = await supabase
                .from('items')
                .select('status')
                .in('id', itemIds)

            if (items && items.length > 0) {
                const statuses = items.map((i: any) => i.status)

                // 1. 全ての商品が out_of_stock または cancelled ➔ キャンセル
                if (statuses.every((s: string) => ['out_of_stock', 'cancelled'].includes(s))) {
                    newOrderStatus = 'cancelled'
                }
                // 2. 全ての商品が pending ➔ 依頼済み
                else if (statuses.every((s: string) => s === 'pending')) {
                    newOrderStatus = 'pending'
                } 
                else {
                    const activeStatuses = statuses.filter((s: string) => !['out_of_stock', 'cancelled'].includes(s))

                    if (activeStatuses.length > 0) {
                        // 3. 有効な商品がすべて in_warehouse ➔ 国際発送準備中
                        if (activeStatuses.every((s: string) => s === 'in_warehouse')) {
                            newOrderStatus = 'calculating'
                        }
                        // 4. 有効な商品がすべて purchased（または倉庫到着との混在） ➔ 買い付け完了
                        else if (activeStatuses.every((s: string) => ['purchased', 'in_warehouse'].includes(s))) {
                            newOrderStatus = 'procured'
                        }
                        // 5. その他未完了（pending）が残っている場合 ➔ 依頼済み
                        else {
                            newOrderStatus = 'pending'
                        }
                    }
                }
            }
        }
    }

    // 注文ステータスを更新
    const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: newOrderStatus })
        .eq('id', orderId)

    if (orderUpdateError) {
        console.error('注文ステータス更新エラー:', orderUpdateError.message)
    }
}

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

    // 2. 紐づく order_id を取得
    const { data: orderItemRows } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('item_id', itemId)

    const orderId = orderItemRows && orderItemRows.length > 0 ? orderItemRows[0].order_id : null

    // 3. 共通ロジックを使って注文ステータスを計算・更新
    if (orderId) {
        await recalculateOrderStatus(supabase, orderId)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 請求書送信 (合計金額の有無・追跡番号有無によってステータスを安全に再計算)
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

    // 1. 送料と合計金額を更新
    const { error } = await supabase
        .from('orders')
        .update({
            shipping_fee: shippingFee,
            total_amount: totalAmount,
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    // 2. 請求金額に応じて注文ステータスを再判定
    await recalculateOrderStatus(supabase, orderId)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 請求書データのクリア（削除）
export async function deleteInvoice(orderId: string) {
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
            shipping_fee: null,
            total_amount: null,
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    await recalculateOrderStatus(supabase, orderId)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 発送完了処理 (追跡番号の有無・請求書有無によってステータスを安全に再計算)
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

    // 1. 追跡番号を更新
    const { error } = await supabase
        .from('orders')
        .update({
            tracking_number: trackingNumber,
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    // 2. 追跡番号の有無に応じて注文ステータスを再判定
    await recalculateOrderStatus(supabase, orderId)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 追跡番号のクリア（削除）
export async function deleteShip(orderId: string) {
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
            tracking_number: null,
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    await recalculateOrderStatus(supabase, orderId)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}