// app/forgot-password/page.tsx
'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/app/actions/auth'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [state, action, pending] = useActionState(resetPassword, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm rounded-lg bg-white p-8 border border-slate-200 shadow-sm">
                <h1 className="mb-2 text-xl font-bold text-slate-900 text-center">パスワードの再設定</h1>
                <p className="mb-6 text-xs text-slate-500 text-center">
                    ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
                </p>

                {/* 成功した場合はメッセージを表示してフォームを隠す */}
                {state?.success ? (
                    <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-sm text-center font-bold">
                        ✅ メールを送信しました。<br />
                        受信トレイをご確認いただき、メール内のリンクから再設定を行ってください。
                    </div>
                ) : (
                    <form action={action}>
                        {state?.error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm font-bold">
                                ⚠️ {state.error}
                            </div>
                        )}
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-600 mb-1">メールアドレス</label>
                            <input name="email" type="email" placeholder="example@email.com" required className="w-full rounded p-2 border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        
                        <button disabled={pending} className="w-full rounded bg-slate-800 p-2 text-white font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors">
                            {pending ? '送信中...' : '再設定メールを送信'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center border-t border-slate-100 pt-4">
                    <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 hover:underline">
                        ログイン画面へ戻る
                    </Link>
                </div>
            </div>
        </div>
    )
}