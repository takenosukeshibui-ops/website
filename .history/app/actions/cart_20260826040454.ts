'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitOrder() {
    console.log('DEBUG: submitOrder called')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    const { data: cartItems, error: fetchError } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'draft')

    if (fetchError) throw fetchError
    if (!cartItems || cartItems.length === 0) {
        throw new Error('カートが空です')
    }

    try {
        await createOrder(cartItems.map(item => item.id))
    } catch (error) {
        throw error
    }
}

export async function createOrder(itemIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ user_id: user.id })
        .select()
        .single()

    if (orderError) throw orderError

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemIds.map(itemId => ({ order_id: order.id, item_id: itemId })))

    if (itemsError) throw itemsError

    const { error: updateError } = await supabase
        .from('items')
        .update({ status: 'pending' })
        .in('id', itemIds)

    if (updateError) throw updateError

    return order
}

export async function removeFromCart(itemId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)
        .eq('status', 'draft')

    if (error) {
        throw error
    }
}

export async function updateItemQuantity(itemId: string, quantity: number) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('items')
        .update({ quantity })
        .eq('id', itemId)
        .eq('user_id', user.id)
        .eq('status', 'draft')

    if (error) {
        throw error
    }
}
