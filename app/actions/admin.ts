// app/actions/admin.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'

/**
 * 1. 商品名の更新
 */
export async function updateItemTitle(itemId: string, title: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({ title })
        .eq('id', itemId)

    if (error) {
        console.error('Item title update error:', error.message)
        throw new Error(`商品名の更新に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [NEW] ユーザー画面のキャッシュ再検証を追加
}

/**
 * 2. 商品ステータスの更新
 */
export async function updateItemStatus(itemId: string, status: string, orderId?: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({ status })
        .eq('id', itemId)

    if (error) {
        console.error('Item status update error:', error.message)
        throw new Error(`ステータスの更新に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [NEW] ユーザー画面のキャッシュ再検証を追加
}

/**
 * 3. 確定数量の更新
 */
export async function updateItemQuantity(itemId: string, adminQuantity: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({ admin_quantity: adminQuantity })
        .eq('id', itemId)

    if (error) {
        console.error('Item quantity update error:', error.message)
        throw new Error(`確定数量の更新に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [NEW] ユーザー画面のキャッシュ再検証を追加
}

/**
 * 4. 購入価格の更新
 */
export async function updateItemPrice(itemId: string, price: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('items')
        .update({ price })
        .eq('id', itemId)

    if (error) {
        console.error('Item price update error:', error.message)
        throw new Error(`購入価格の更新に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [NEW] ユーザー画面のキャッシュ再検証を追加
}

/**
 * 5. 管理者連絡欄の保存・送信（ステータスを info_required に変更）
 */
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
        console.error('Admin note update error:', error.message)
        throw new Error(`連絡メッセージの送信に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [NEW] ユーザー画面のキャッシュ再検証を追加
}

/**
 * 6. 管理者連絡欄の取り消し（ステータスを pending に復元）
 */
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
        console.error('Admin note cancel error:', error.message)
        throw new Error(`送信取り消しに失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [NEW] ユーザー画面のキャッシュ再検証を追加
}

/**
 * 7. 請求金額・送料の保存 (ステータス変更なし) [UPDATED]
 */
export async function sendInvoice(orderId: string, shippingFee: number, totalAmount: number, shippingMethod?: string) {
    const supabase = await createClient()

    // [UPDATED] 確定した配送方法もDBに保存するよう追加
    const updateData: any = {
        shipping_fee: shippingFee,
        total_amount: totalAmount,
    }

    if (shippingMethod) {
        updateData.shipping_method = shippingMethod
    }

    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

    if (error) {
        console.error('Invoice save error:', error.message)
        throw new Error(`請求金額の保存に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED] ユーザー側ダッシュボードのキャッシュを即時更新
}

/**
 * 8. 請求金額データの削除（クリア） [UPDATED]
 */
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
        console.error('Invoice delete error:', error.message)
        throw new Error(`請求データのクリアに失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED] ユーザー側ダッシュボードのキャッシュを即時更新
}

/**
 * 9. 「決済待ち (payment_required)」へ切り替え（Wise等） [UPDATED]
 */
export async function updateOrderStatusToPaymentRequired(orderId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({ status: 'payment_required' })
        .eq('id', orderId)

    if (error) {
        console.error('Update status payment_required error:', error.message)
        throw new Error(`ステータスの更新に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED] ユーザー側ダッシュボードのキャッシュを即時更新
}

/**
 * 10. 「決済待ち」の取り消し [UPDATED]
 */
export async function cancelPaymentRequired(orderId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId)

    if (error) {
        console.error('Cancel payment_required error:', error.message)
        throw new Error(`取り消し処理に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED] ユーザー側ダッシュボードのキャッシュを即時更新
}

/**
 * 11. PayPal API を使用した請求書の作成と自動送信 [UPDATED]
 */
export async function sendPayPalInvoice(orderId: string) {
    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, profiles(*)')
        .eq('id', orderId)
        .single()

    if (orderError || !order) {
        throw new Error('注文情報の取得に失敗しました。')
    }

    const paypalEmail = order.profiles?.paypal_email || order.profiles?.email
    if (!paypalEmail) {
        throw new Error('ユーザーのPayPal用メールアドレスが登録されていません。')
    }

    const amountToSend = order.total_amount
    if (!amountToSend || amountToSend <= 0) {
        throw new Error('お支払い金額（合計金額）が保存されていません。総重量横の「保存」ボタンを先に押してください。')
    }

    const headersList = await headers()
    const cookieStore = await cookies()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const appUrl = `${protocol}://${host}`

    let res: Response
    try {
        res = await fetch(`${appUrl}/api/admin/paypal/invoice`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': cookieStore.toString()
            },
            body: JSON.stringify({
                orderId: order.id,
                orderNumber: order.order_number,
                recipientEmail: paypalEmail,
                amount: amountToSend
            })
        })
    } catch (err: any) {
        console.error('PayPal API Fetch Error:', err)
        throw new Error(`PayPal 請求APIの接続に失敗しました: ${err.message || '通信エラー'}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
        const textErr = await res.text()
        console.error('PayPal Invoice API returned non-JSON:', textErr)
        throw new Error(`PayPal API エラー (Status ${res.status}): サーバーから無効なレスポンスが返されました。`)
    }

    const data = await res.json()
    if (!res.ok || data.error) {
        throw new Error(data.error || 'PayPal請求書の送信に失敗しました。')
    }

    await updateOrderStatusToPaymentRequired(orderId)

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED] ユーザー側ダッシュボードのキャッシュを即時更新

    return { success: true, invoiceId: data.invoiceId }
}

/**
 * 12. 追跡番号の更新・保存 [UPDATED]
 */
export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({ tracking_number: trackingNumber })
        .eq('id', orderId)

    if (error) {
        console.error('Tracking number update error:', error.message)
        throw new Error(`追跡番号の保存に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED]
}

/**
 * 13. 発送完了処理 [UPDATED]
 */
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
        console.error('Ship order error:', error.message)
        throw new Error(`発送完了への更新に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED]
}

/**
 * 14. 追跡番号のクリア（削除） [UPDATED]
 */
export async function deleteShip(orderId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({ tracking_number: null })
        .eq('id', orderId)

    if (error) {
        console.error('Delete ship error:', error.message)
        throw new Error(`追跡番号の削除に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED]
}

/**
 * 15. 発送済みの取り消し [UPDATED]
 */
export async function cancelShip(orderId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('orders')
        .update({ status: 'payment_required' })
        .eq('id', orderId)

    if (error) {
        console.error('Cancel ship error:', error.message)
        throw new Error(`発送取り消しに失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED]
}

/**
 * 16. 注文内商品の削除 [UPDATED]
 */
export async function deleteAdminItem(itemId: string) {
    const supabase = await createClient()

    await supabase
        .from('order_items')
        .delete()
        .eq('item_id', itemId)

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)

    if (error) {
        console.error('Admin item delete error:', error.message)
        throw new Error(`商品の削除に失敗しました: ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // [UPDATED]
}