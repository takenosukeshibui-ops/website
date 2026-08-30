// app/[lang]/signup/page.tsx
'use client'

import { useActionState, use } from 'react'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'

export default function SignUpPage(props: { params: Promise<{ lang: string }> }) {
    const { lang } = use(props.params)
    const isEn = lang === 'en'
    const [state, action, pending] = useActionState(signup, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <form action={action} className="w-full max-w-sm rounded-lg bg-white p-8 border border-slate-200 shadow-sm">
                <h1 className="mb-6 text-xl font-bold text-slate-900 text-center">{isEn ? 'Sign Up' : '新規アカウント登録'}</h1>
                
                {state?.error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm font-bold">
                        ⚠️ {state.error}
                    </div>
                )}
                
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Email' : 'メールアドレス'}</label>
                    <input name="email" type="email" placeholder="example@email.com" required className="w-full rounded p-2 border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Password (min 6 chars)' : 'パスワード (6文字以上)'}</label>
                    <input name="password" type="password" placeholder="••••••••" required minLength={6} className="w-full rounded p-2 border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                
                <button disabled={pending} className="w-full rounded bg-blue-600 p-2 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {pending ? (isEn ? 'Signing up...' : '登録処理中...') : (isEn ? 'Create Account' : 'アカウントを作成')}
                </button>

                <div className="mt-6 text-center border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">{isEn ? 'Already have an account?' : 'すでにアカウントをお持ちですか？'}</p>
                    <Link href={`/${lang}/login`} className="text-sm font-bold text-slate-600 hover:text-slate-900 hover:underline mt-1 inline-block">
                        {isEn ? 'Back to Login' : 'ログイン画面へ戻る'}
                    </Link>
                </div>
            </form>
        </div>
    )
}