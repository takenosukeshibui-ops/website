// app/actions/items.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addToCart(formData: FormData) {
    const supabase = await createClient()
    
    const url = (formData.get('url') as string) || ''
    const title = (formData.get('title') as string) || '名称未設定'
    const quantityRaw = formData.get('quantity')
    const quantity = quantityRaw ? parseInt(quantityRaw as string) : 1
    const desiredPriceRaw = formData.get('desiredPrice')
    const desiredPrice = desiredPriceRaw ? parseFloat(desiredPriceRaw as string) : null
    
    // 備考（バリエーション指定）の取得
    const remarks = (formData.get('remarks') as string) || null

    const { data: { user } } = await supabase.auth.getUser()

    if (url && user) {
        const { error } = await supabase.from('items').insert({
            user_id: user.id,
            url,
            title,
            quantity,
            desired_price: desiredPrice,
            remarks, // DBに保存
            status: 'draft'
        })

        if (error) {
            console.error('商品追加エラー:', error.message)
            return
        }

        revalidatePath('/dashboard')
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

    revalidatePath('/dashboard')
}

// 備考（remarks）も更新できるように引数を追加
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

    revalidatePath('/dashboard')
}