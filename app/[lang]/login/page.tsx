// app/[lang]/login/page.tsx
'use client'

import { useActionState, use } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'

export default function LoginPage(props: { params: Promise<{ lang: string }> }) {
    const { lang } = use(props.params)
    const isEn = lang === 'en'
    const [state, action, pending] = useActionState(login, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <form action={action} className="w-full max-w-sm rounded-lg bg-white p-8 border border-slate-200 shadow-sm">
                <h1 className="mb-6 text-xl font-bold text-slate-900 text-center">{isEn ? 'Login' : 'ログイン'}</h1>
                
                {state?.error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm font-bold">
                        ⚠️ {state.error}
                    </div>
                )}
                
                <input name="email" type="email" placeholder={isEn ? 'Email' : 'メールアドレス'} required className="mb-4 w-full rounded p-2 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-500 outline-none" />
                <input name="password" type="password" placeholder={isEn ? 'Password' : 'パスワード'} required className="mb-2 w-full rounded p-2 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-500 outline-none" />
                
                <div className="text-right mb-6">
                    <Link href={`/${lang}/forgot-password`} className="text-xs text-slate-500 hover:text-slate-800 hover:underline">
                        {isEn ? 'Forgot your password?' : 'パスワードをお忘れですか？'}
                    </Link>
                </div>
                
                <button disabled={pending} className="w-full rounded bg-slate-800 p-2 text-white font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors">
                    {pending ? (isEn ? 'Logging in...' : 'ログイン中...') : (isEn ? 'Login' : 'ログイン')}
                </button>

                <div className="mt-6 text-center border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">{isEn ? "Don't have an account?" : 'アカウントをお持ちでないですか？'}</p>
                    <Link href={`/${lang}/signup`} className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block">
                        {isEn ? 'Sign up here' : '新規アカウント登録はこちら'}
                    </Link>
                </div>
            </form>
        </div>
    )
}