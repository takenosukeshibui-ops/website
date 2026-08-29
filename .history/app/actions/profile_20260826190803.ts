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

    // 2. フォーム入力データの収集
    const profileData = {
        full_name: formData.get('full_name') as string,
        company_name: formData.get('company_name') as string,
        phone: formData.get('phone') as string,
        tax_id: formData.get('tax_id') as string,
        wise_email: formData.get('wise_email') as string,
        country: formData.get('country') as string,
        zip_code: formData.get('zip_code') as string,
        state_province: formData.get('state_province') as string,
        city: formData.get('city') as string,
        address_line1: formData.get('address_line1') as string,
        address_line2: formData.get('address_line2') as string,
        address_line3: formData.get('address_line3') as string,
        is_residential: formData.get('is_residential') === 'true',
        updated_at: new Date().toISOString(),
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

    // 4. 設定画面のキャッシュを更新して最新表示を強制同期
    revalidatePath('/dashboard/settings')

    // 5. 更新成功状態とデータベースから返った最新の data を送信
    return { 
        success: true, 
        data 
    }
}