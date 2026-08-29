// app/update-password/page.tsx
'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/actions/auth'

export default function UpdatePasswordPage() {
    const [state, action, pending] = useActionState(updatePassword, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <form action={action} className="w-full max-w-sm rounded-lg bg-white p-8 border border-slate-200 shadow-sm">
                <h1 className="mb-2 text-xl font-bold text-slate-900 text-center">新しいパスワードの設定</h1>
                <p className="mb-6 text-xs text-slate-500 text-center">
                    新しいパスワードを入力して保存してください。
                </p>
                
                {state?.error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm font-bold">
                        ⚠️ {state.error}
                    </div>
                )}
                
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-600 mb-1">新しいパスワード (6文字以上)</label>
                    <input name="password" type="password" placeholder="••••••••" required minLength={6} className="w-full rounded p-2 border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                
                <button disabled={pending} className="w-full rounded bg-blue-600 p-2 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {pending ? '更新中...' : 'パスワードを更新する'}
                </button>
            </form>
        </div>
    )
}