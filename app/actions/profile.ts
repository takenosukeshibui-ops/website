// app/actions/profile.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // 1. ログインユーザーの認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    // 2. フォーム入力データの収集（[NEW] fedex_account_number を追加）
    const profileData = {
        full_name: formData.get('full_name') as string,
        contact_email: formData.get('contact_email') as string,
        company_name: formData.get('company_name') as string,
        phone: formData.get('phone') as string,
        tax_id: formData.get('tax_id') as string,
        fedex_account_number: formData.get('fedex_account_number') as string, // [NEW] FedExアカウント番号
        wise_email: formData.get('wise_email') as string,
        paypal_email: formData.get('paypal_email') as string,
        default_shipping_method: formData.get('default_shipping_method') as string,
        default_payment_method: formData.get('default_payment_method') as string,
        country: formData.get('country') as string,
        zip_code: formData.get('zip_code') as string,
        state_province: formData.get('state_province') as string,
        city: formData.get('city') as string,
        address_line1: formData.get('address_line1') as string,
        address_line2: formData.get('address_line2') as string,
        address_line3: formData.get('address_line3') as string,
        is_residential: formData.get('is_residential') === 'true',
    }

    // 3. Supabase Database の更新 (upsert)
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            ...profileData,
        })
        .select()
        .single()

    if (error) {
        console.error('Profile update error:', error.message)
        return { 
            error: '設定の保存に失敗しました: ' + error.message, 
            data: profileData 
        }
    }

    // 4. キャッシュ更新
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')
    revalidatePath('/admin')

    return { 
        success: true, 
        data 
    }
}