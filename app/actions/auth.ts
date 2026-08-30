// app/actions/auth.ts
// [UPDATED] エラーメッセージをバイリンガル(日本語 / 英語)表記に修正
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// ▼ ログイン処理
export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error || !authData.user) {
        return { error: 'メールアドレスまたはパスワードが間違っています。 / Incorrect email or password.' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

    if (profile?.role === 'admin') {
        redirect('/admin')
    } else {
        redirect('/dashboard')
    }
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
        return { error: '登録に失敗しました。別のメールアドレスをお試しください。 / Registration failed. Please try another email.' }
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
        return { error: 'メールの送信に失敗しました。時間をおいて再度お試しください。 / Failed to send email. Please try again later.' }
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
        return { error: 'パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。 / Failed to update password. The link may have expired.' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'admin') {
            redirect('/admin')
        }
    }

    redirect('/dashboard')
}

// ▼ ログイン中ユーザーのパスワード変更処理
export async function changePassword(prevState: any, formData: FormData) {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!password || password.length < 6) {
        return { error: 'パスワードは6文字以上で入力してください。 / Password must be at least 6 characters.' }
    }

    if (password !== confirmPassword) {
        return { error: '確認用パスワードが一致しません。 / Passwords do not match.' }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: 'パスワードの変更に失敗しました。 / Failed to change password.' }
    }

    return { success: true }
}

// ▼ ログイン中ユーザーのメールアドレス変更処理
export async function changeEmail(prevState: any, formData: FormData) {
    const rawEmail = formData.get('email') as string
    const email = rawEmail ? rawEmail.trim() : ''

    if (!email) {
        return { error: 'メールアドレスを入力してください。 / Please enter an email address.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.email === email) {
        return { error: '現在のメールアドレスと同じです。新しいアドレスを入力してください。 / This is your current email. Please enter a new one.' }
    }

    const { error } = await supabase.auth.updateUser({
        email: email
    })

    if (error) {
        console.error('Email update error:', error.message)
        return { error: `変更に失敗しました / Failed to change: ${error.message}` }
    }

    return { success: true, message: '確認メールを送信しました。新しいメールアドレスで確認を行ってください。 / Confirmation email sent. Please verify with the new address.' }
}