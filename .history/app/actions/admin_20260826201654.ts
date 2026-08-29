// app/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function recalculateOrderStatus(supabase: any, orderId: string) {
    const { data: order } = await supabase
        .from('orders')
        .select('status, total_amount, tracking_number')
        .eq('id', orderId)
        .single()

    let newOrderStatus = 'pending'

    if (order?.status === 'shipped') {
        newOrderStatus = 'shipped'
    } else if (order?.total_amount !== null && order?.total_amount !== undefined && Number(order.total_amount) > 0) {
        newOrderStatus = 'payment_required'
    } else {
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

                if (statuses.every((s: string) => ['out_of_stock', 'cancelled'].includes(s))) {
                    newOrderStatus = 'cancelled'
                } else if (statuses.every((s: string) => s === 'pending')) {
                    newOrderStatus = 'pending'
                } else {
                    const activeStatuses = statuses.filter((s: string) => !['out_of_stock', 'cancelled'].includes(s))

                    if (activeStatuses.length > 0) {
                        if (activeStatuses.every((s: string) => s === 'in_warehouse')) {
                            newOrderStatus = 'calculating'
                        } else if (activeStatuses.every((s: string) => ['purchased', 'in_warehouse'].includes(s))) {
                            newOrderStatus = 'procured'
                        } else {
                            newOrderStatus = 'pending'
                        }
                    }
                }
            }
        }
    }

    const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: newOrderStatus })
        .eq('id', orderId)

    if (orderUpdateError) {
        console.error('注文ステータス更新エラー:', orderUpdateError.message)
    }
}

// 確定数量の変更
export async function updateItemQuantity(itemId: string, adminQuantity: number) {
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
        .update({ admin_quantity: adminQuantity })
        .eq('id', itemId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 購入価格の変更
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

// 商品ステータス変更
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

    const { error: updateError } = await supabase
        .from('items')
        .update({ status })
        .eq('id', itemId)

    if (updateError) throw new Error(updateError.message)

    const { data: orderItemRows } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('item_id', itemId)

    const orderId = orderItemRows && orderItemRows.length > 0 ? orderItemRows[0].order_id : null

    if (orderId) {
        await recalculateOrderStatus(supabase, orderId)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 管理者からユーザーへ確認メッセージ(admin_note)を送信し、自動で info_required に変更する
export async function updateAdminNote(itemId: string, adminNote: string) {
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
        .update({ 
            admin_note: adminNote,
            status: 'info_required'
        })
        .eq('id', itemId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 要確認メッセージの送信取消（キャンセル）
export async function cancelAdminNote(itemId: string) {
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
        .update({ 
            admin_note: null, // メッセージをクリア
            status: 'pending' // 依頼済みに戻す
        })
        .eq('id', itemId)

    if (error) throw new Error(error.message)

    const { data: orderItemRows } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('item_id', itemId)

    const orderId = orderItemRows && orderItemRows.length > 0 ? orderItemRows[0].order_id : null

    if (orderId) {
        await recalculateOrderStatus(supabase, orderId)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 請求書送信
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
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    await recalculateOrderStatus(supabase, orderId)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 請求書クリア
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

// 追跡番号保存
export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
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
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 発送完了
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

    const updateData: any = { status: 'shipped' }
    if (trackingNumber) updateData.tracking_number = trackingNumber

    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

// 追跡番号クリア
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
            status: 'pending',
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    await recalculateOrderStatus(supabase, orderId)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}