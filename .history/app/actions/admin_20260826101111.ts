'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

    // 1. まず該当商品のステータスを更新
    const { error: updateError } = await supabase
        .from('items')
        .update({ status })
        .eq('id', itemId)

    if (updateError) throw new Error(updateError.message)

    // 2. order_items から確実に order_id を取得
    const { data: orderItemData } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('item_id', itemId)
        .single()

    const orderId = orderItemData?.order_id

    console.log(`[StatusUpdate] ItemID: ${itemId}, NewStatus: ${status}, OrderID: ${orderId}`)

    // 3. orderId が存在する場合に全体ステータスを計算
    if (orderId) {
        // 注文に紐づくすべての item_id を取得
        const { data: itemLinks } = await supabase
            .from('order_items')
            .select('item_id')
            .eq('order_id', orderId)

        if (itemLinks && itemLinks.length > 0) {
            const itemIds = itemLinks.map(l => l.item_id)

            // 全商品の最新 status を items テーブルから直接取得
            const { data: items } = await supabase
                .from('items')
                .select('status')
                .in('id', itemIds)

            if (items) {
                const statuses = items.map(i => i.status)
                console.log(`[StatusUpdate] Current Order Item Statuses:`, statuses)

                let newOrderStatus = 'processing'

                if (statuses.some(s => ['info_required', 'price_changed', 'quantity_changed'].includes(s))) {
                    newOrderStatus = 'needs_action'
                } else if (statuses.every(s => ['out_of_stock', 'cancelled'].includes(s))) {
                    newOrderStatus = 'cancelled'
                } else if (statuses.every(s => s === 'pending')) {
                    newOrderStatus = 'pending'
                } else {
                    const activeStatuses = statuses.filter(s => !['out_of_stock', 'cancelled'].includes(s))
                    if (activeStatuses.length > 0 && activeStatuses.every(s => s === 'in_warehouse')) {
                        newOrderStatus = 'procured'
                    } else {
                        newOrderStatus = 'processing'
                    }
                }

                console.log(`[StatusUpdate] Calculated Order Status: ${newOrderStatus}`)

                // 注文の全体ステータスを更新
                await supabase
                    .from('orders')
                    .update({ status: newOrderStatus })
                    .eq('id', orderId)
            }
        }
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

export async function updateItem(id: string, data: { status: string; admin_note: string }) {
    const supabase = await createClient()

    // ユーザーの認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    // 管理者権限のチェック
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('管理者権限がありません')

    const { error } = await supabase
        .from('items')
        .update(data)
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    await updateItemStatus(id, data.status)
}

export async function updateOrder(id: string, status: string) {
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
        .update({ status })
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

export async function deleteAllData() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') throw new Error('管理者権限がありません')

    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

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
            status: 'payment_required'
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
}

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
            status: 'shipped'
        })
        .eq('id', orderId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')

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