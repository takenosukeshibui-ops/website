// app/[lang]/forgot-password/page.tsx
'use client'

import { useActionState, use } from 'react'
import { resetPassword } from '@/app/actions/auth'
import Link from 'next/link'
import { getDictionary } from '@/lib/dictionaries'

export default function ForgotPasswordPage(props: {
    params: Promise<{ lang: 'en' | 'ja' }>
}) {
    // 1. URLから言語(lang)を取得し、対応する辞書を読み込む
    const { lang } = use(props.params)
    const dict = use(getDictionary(lang))
    const t = dict.forgotPassword

    const [state, action, pending] = useActionState(resetPassword, null)

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm rounded-lg bg-white p-8 border border-slate-200 shadow-sm">
                {/* 2. ベタ書きだった日本語を辞書データ {t.XXX} に置き換え */}
                <h1 className="mb-2 text-xl font-bold text-slate-900 text-center">{t.title}</h1>
                <p className="mb-6 text-xs text-slate-500 text-center">
                    {t.description}
                </p>

                {/* 成功した場合はメッセージを表示してフォームを隠す */}
                {state?.success ? (
                    <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-sm text-center font-bold">
                        {t.sentSuccess}<br />
                        {t.sentInstruction}
                    </div>
                ) : (
                    <form action={action}>
                        {state?.error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm font-bold">
                                ⚠️ {state.error}
                            </div>
                        )}
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                {/* 「メールアドレス」のラベルは辞書にないのでここで直接切り替え */}
                                {lang === 'en' ? 'Email Address' : 'メールアドレス'}
                            </label>
                            <input name="email" type="email" placeholder="example@email.com" required className="w-full rounded p-2 border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        
                        <button disabled={pending} className="w-full rounded bg-slate-800 p-2 text-white font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors">
                            {pending ? t.submittingButton : t.submitButton}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center border-t border-slate-100 pt-4">
                    {/* 3. 戻るリンクも、現在の言語(lang)を引き継ぐように修正 */}
                    <Link href={`/${lang}/login`} className="text-sm font-bold text-slate-600 hover:text-slate-900 hover:underline">
                        {t.backToLogin}
                    </Link>
                </div>
            </div>
        </div>
    )
}