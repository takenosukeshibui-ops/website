// app/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 送料・合計金額の保存（※ status カラムの更新は完全除外）
export async function sendInvoice(orderId: string, shippingFee: number, totalAmount: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            shipping_fee: shippingFee,
            total_amount: totalAmount,
        })
        .eq('id', orderId)

    if (error) {
        console.error('金額保存失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// Wise送信完了時：ステータスを明示的に「決済待ち (payment_required)」へ更新
export async function updateOrderStatusToPaymentRequired(orderId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'payment_required'
        })
        .eq('id', orderId)

    if (error) {
        console.error('ステータス更新失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// 請求書データの削除
export async function deleteInvoice(orderId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            shipping_fee: null,
            total_amount: null,
            status: 'pending'
        })
        .eq('id', orderId)

    if (error) {
        console.error('請求削除失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// 追跡番号の保存
export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            tracking_number: trackingNumber
        })
        .eq('id', orderId)

    if (error) {
        console.error('追跡番号保存失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// 発送完了処理
export async function shipOrder(orderId: string, trackingNumber: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'shipped',
            tracking_number: trackingNumber
        })
        .eq('id', orderId)

    if (error) {
        console.error('発送完了更新失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// 発送取消処理
export async function deleteShip(orderId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            tracking_number: null,
            status: 'pending'
        })
        .eq('id', orderId)

    if (error) {
        console.error('発送取消失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// 商品数量の更新
export async function updateItemQuantity(itemId: string, quantity: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({ admin_quantity: quantity })
        .eq('id', itemId)

    if (error) {
        console.error('数量更新失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// 商品価格の更新
export async function updateItemPrice(itemId: string, price: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({ price: price })
        .eq('id', itemId)

    if (error) {
        console.error('価格更新失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// メッセージ送信（要確認）
export async function updateAdminNote(itemId: string, note: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({
            admin_note: note,
            status: 'info_required'
        })
        .eq('id', itemId)

    if (error) {
        console.error('連絡欄送信失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}

// メッセージ送信取消
export async function cancelAdminNote(itemId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({
            admin_note: null,
            status: 'pending'
        })
        .eq('id', itemId)

    if (error) {
        console.error('連絡欄取消失敗:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/admin')
}