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