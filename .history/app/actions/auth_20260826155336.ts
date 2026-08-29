// app/actions/auth.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers' // ★追加

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

    redirect('/dashboard/settings')
}

// ▼ パスワードリセットメール送信処理
export async function resetPassword(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const supabase = await createClient()
    
    // 現在のサイトのURL（ドメイン）を取得
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    // リセット用リンク付きのメールを送信
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/update-password`, // メール内のリンク先
    })

    if (error) {
        return { error: 'メールの送信に失敗しました。時間をおいて再度お試しください。' }
    }

    return { success: true }
}

// ▼ 新しいパスワードの保存処理
export async function updatePassword(prevState: any, formData: FormData) {
    const password = formData.get('password') as string
    const supabase = await createClient()

    // パスワードを更新
    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: 'パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。' }
    }

    // 更新成功後はダッシュボードへ
    redirect('/dashboard')

}
// app/actions/auth.ts (末尾に追加)

// ▼ ログイン中ユーザーのパスワード変更処理
export async function changePassword(prevState: any, formData: FormData) {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!password || password.length < 6) {
        return { error: 'パスワードは6文字以上で入力してください。' }
    }

    if (password !== confirmPassword) {
        return { error: '確認用パスワードが一致しません。' }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: 'パスワードの変更に失敗しました。' }
    }

    return { success: true }
}