// app/actions/auth.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ▼ ログイン処理
export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: 'メールアドレスまたはパスワードが間違っています。' }
    }

    redirect('/dashboard')
}

// ▼ 新規登録（サインアップ）処理
export async function signup(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        return { error: '登録に失敗しました。別のメールアドレスをお試しください。' }
    }

    // 登録成功後は、詳細情報を入力してもらうために設定画面へリダイレクト
    redirect('/dashboard/settings')
}