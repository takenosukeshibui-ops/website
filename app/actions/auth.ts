// app/actions/auth.ts
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
        return { error: 'メールアドレスまたはパスワードが間違っています。' }
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
        return { error: '登録に失敗しました。別のメールアドレスをお試しください。' }
    }

    redirect('/dashboard/settings')
}

// ▼ パスワードリセットメール送信処理
export async function resetPassword(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const supabase = await createClient()
    
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/update-password`,
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

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: 'パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。' }
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

// ▼ ログイン中ユーザーのメールアドレス変更処理 [UPDATED]
export async function changeEmail(prevState: any, formData: FormData) {
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'メールアドレスを入力してください。' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.email === email) {
        return { error: '現在のメールアドレスと同じです。新しいアドレスを入力してください。' }
    }

    const { error } = await supabase.auth.updateUser({
        email: email
    })

    if (error) {
        console.error('Email update error:', error.message)
        // [UPDATED] 実際のSupabaseエラーメッセージを返却
        return { error: `変更に失敗しました: ${error.message}` }
    }

    return { success: true, message: '確認メールを送信しました。受信トレイのリンクをクリックして変更を完了してください。' }
}