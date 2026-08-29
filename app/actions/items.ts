// app/actions/items.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// [NEW] 共通キャッシュ破棄関数
function revalidateAll() {
    revalidatePath('/', 'layout')
    revalidatePath('/dashboard')
    revalidatePath('/admin')
}

export async function addToCart(formData: FormData) {
    const supabase = await createClient()
    
    const url = (formData.get('url') as string) || ''
    const title = (formData.get('title') as string) || '名称未設定'
    const quantityRaw = formData.get('quantity')
    const quantity = quantityRaw ? parseInt(quantityRaw as string) : 1
    const desiredPriceRaw = formData.get('desiredPrice')
    const desiredPrice = desiredPriceRaw ? parseFloat(desiredPriceRaw as string) : null
    const remarks = (formData.get('remarks') as string) || null

    const { data: { user } } = await supabase.auth.getUser()

    if (url && user) {
        const { error } = await supabase.from('items').insert({
            user_id: user.id,
            url,
            title,
            quantity,
            desired_price: desiredPrice,
            remarks,
            status: 'draft' // カート内商品は draft として追加
        })

        if (error) {
            console.error('商品追加エラー:', error.message)
            return
        }

        revalidateAll() // [UPDATED] 全ページへ反映
    }
}

export async function deleteItem(itemId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)

    revalidateAll() // [UPDATED]
}

export async function updateCartItem(itemId: string, quantity: number, desiredPrice?: number | null, remarks?: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const updateData: any = { quantity }
    if (desiredPrice !== undefined) updateData.desired_price = desiredPrice
    if (remarks !== undefined) updateData.remarks = remarks

    const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)

    revalidateAll() // [UPDATED]
}

// ユーザーが管理者への返信（備考更新）を行い、ステータスを pending に戻す
export async function replyToAdminNote(itemId: string, remarks: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未認証のユーザーです')

    const { error } = await supabase
        .from('items')
        .update({
            remarks: remarks,
            status: 'pending'
        })
        .eq('id', itemId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)

    revalidateAll() // [UPDATED]
}