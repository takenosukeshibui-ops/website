// app/login/page.tsx
'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
    const [state, action, pending] = useActionState(login, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <form action={action} className="w-full max-w-sm rounded-lg bg-white p-8 border border-slate-200 shadow-sm">
                <h1 className="mb-6 text-xl font-bold text-slate-900 text-center">ログイン</h1>
                
                {state?.error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm font-bold">
                        ⚠️ {state.error}
                    </div>
                )}
                
                <input name="email" type="email" placeholder="メールアドレス" required className="mb-4 w-full rounded p-2 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-500 outline-none" />
                <input name="password" type="password" placeholder="パスワード" required className="mb-6 w-full rounded p-2 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-500 outline-none" />
                
                <button disabled={pending} className="w-full rounded bg-slate-800 p-2 text-white font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors">
                    {pending ? 'ログイン中...' : 'ログイン'}
                </button>

                <div className="mt-6 text-center border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">アカウントをお持ちでないですか？</p>
                    <Link href="/signup" className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block">
                        新規アカウント登録はこちら
                    </Link>
                </div>
            </form>
        </div>
    )
}