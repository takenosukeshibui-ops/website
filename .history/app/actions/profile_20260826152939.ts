// app/actions/profile.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: '未認証のユーザーです' }
    }

    // フォームデータの取得
    const company_name = formData.get('company_name') as string
    const full_name = formData.get('full_name') as string
    const tax_id = formData.get('tax_id') as string
    const phone = formData.get('phone') as string
    const paypal_email = formData.get('paypal_email') as string
    const wise_email = formData.get('wise_email') as string
    const country = formData.get('country') as string
    const zip_code = formData.get('zip_code') as string
    const state_province = formData.get('state_province') as string
    const city = formData.get('city') as string
    const address_line1 = formData.get('address_line1') as string
    const address_line2 = formData.get('address_line2') as string
    const address_line3 = formData.get('address_line3') as string
    const is_residential = formData.get('is_residential') === 'true'

    // エラー時にフォームを復元するため、入力されたデータをまとめる
    const submittedData = {
        company_name, full_name, tax_id, phone, paypal_email, wise_email,
        country, zip_code, state_province, city, 
        address_line1, address_line2, address_line3, is_residential
    }

    // PayPalかWise、どちらかが入力されているかチェック
    if (!paypal_email && !wise_email) {
        return { 
            error: 'PayPalまたはWiseのどちらかの決済用メールアドレスを入力してください。',
            data: submittedData // 入力データを返す
        }
    }

    const { error } = await supabase
        .from('profiles')
        .update(submittedData)
        .eq('id', user.id)

    if (error) {
        console.error('プロフィール更新エラー:', error)
        return { 
            error: 'プロフィールの更新に失敗しました',
            data: submittedData // 入力データを返す
        }
    }

    // キャッシュをクリア
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')
    
    // 成功メッセージを返す
    return { success: true }
}