'use client'

import { useActionState } from 'react'
import { login } from '../actions/auth'

export default function LoginPage() {
    const [state, action, pending] = useActionState(login, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <form action={action} className="w-full max-w-sm rounded-lg bg-white p-8 border border-slate-200 shadow-sm">
                <h1 className="mb-6 text-xl font-bold text-slate-900">ログイン</h1>
                {state?.error && <p className="mb-4 text-red-600">{state.error}</p>}
                <input name="email" type="email" placeholder="メールアドレス" required className="mb-4 w-full rounded p-2 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400" />
                <input name="password" type="password" placeholder="パスワード" required className="mb-6 w-full rounded p-2 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400" />
                <button disabled={pending} className="w-full rounded bg-slate-800 p-2 text-white hover:bg-slate-700">
                    {pending ? 'ログイン中...' : 'ログイン'}
                </button>
            </form>
        </div>
    )
}
