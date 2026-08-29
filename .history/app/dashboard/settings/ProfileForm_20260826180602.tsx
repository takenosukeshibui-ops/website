// app/dashboard/settings/ProfileForm.tsx
'use client'

import React, { useActionState, useEffect, useState } from 'react'
import { updateProfile } from '@/app/actions/profile'
import { changePassword } from '@/app/actions/auth'
import { executeWisePayout } from '@/app/actions/wise'
import { SubmitButton } from '@/components/SubmitButtons'
import Link from 'next/link'

export default function ProfileForm({ profile, userEmail }: { profile: any, userEmail: string }) {
    // プロフィール更新用 State
    const [state, action] = useActionState(updateProfile, null)
    const [showToast, setShowToast] = useState(false)

    // パスワード変更用 State
    const [pwState, pwAction] = useActionState(changePassword, null)
    const [showPwToast, setShowPwToast] = useState(false)

    // パスワード変更フォームの開閉状態（初期値は閉じる）
    const [isOpenPwForm, setIsOpenPwForm] = useState(false)

    // パスワード表示/非表示の切り替え状態
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Wise送金テスト実行用 State
    const [isTestingWise, setIsTestingWise] = useState(false)

    // プロフィール更新トースト (3秒)
    useEffect(() => {
        if (state?.error || state?.success) {
            setShowToast(true)
            const timer = setTimeout(() => setShowToast(false), 3000) 
            return () => clearTimeout(timer)
        }
    }, [state])

    // パスワード変更トースト (3秒)
    useEffect(() => {
        if (pwState?.error || pwState?.success) {
            setShowPwToast(true)
            if (pwState.success) {
                setIsOpenPwForm(false) // 成功したらフォームを閉じる
            }
            const timer = setTimeout(() => setShowPwToast(false), 3000) 
            return () => clearTimeout(timer)
        }
    }, [pwState])

    const getValue = (key: string) => {
        if (state?.data && state.data[key] !== undefined) {
            return state.data[key]
        }
        return profile?.[key] || ''
    }

    const getBoolValue = (key: string, defaultVal: boolean) => {
        if (state?.data && state.data[key] !== undefined) {
            return state.data[key]
        }
        return profile?.[key] ?? defaultVal
    }

    // Wise 送金テストの処理
    const handleWiseTestPayout = async () => {
        const targetEmail = getValue('wise_email')
        if (!targetEmail) {
            alert('Wise用メールアドレスを入力して、画面下部の「保存」を押してからテストを実行してください。')
            return
        }

        if (!confirm(`「${targetEmail}」宛てに 1,000円 のWise送金テストを実行しますか？`)) {
            return
        }

        setIsTestingWise(true)
        try {
            const result = await executeWisePayout(profile.id, 1000)
            if (result.success) {
                alert(`✅ Wise送金リクエスト成功！\nTransfer ID: ${result.data?.transferId}\nStatus: ${result.data?.status}`)
            } else {
                alert(`❌ Wise送金エラー: ${result.error}`)
            }
        } catch (error: any) {
            console.error('Wise Test Error:', error)
            alert(`実行中にエラーが発生しました: ${error.message}`)
        } finally {
            setIsTestingWise(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            {/* プロフィール用トースト通知 */}
            {showToast && (state?.error || state?.success) && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-300">
                    {state?.error && (
                        <div 
                            className="px-6 py-3 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: 'rgba(220, 38, 38, 0.85)', backdropFilter: 'blur(8px)' }}
                        >
                            ⚠️ {state.error}
                        </div>
                    )}
                    {state?.success && (
                        <div 
                            className="px-6 py-3 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: 'rgba(5, 150, 105, 0.85)', backdropFilter: 'blur(8px)' }}
                        >
                            ✅ 設定を保存しました
                        </div>
                    )}
                </div>
            )}

            {/* パスワード変更用トースト通知 */}
            {showPwToast && (pwState?.error || pwState?.success) && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-300">
                    {pwState?.error && (
                        <div 
                            className="px-6 py-3 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: 'rgba(220, 38, 38, 0.85)', backdropFilter: 'blur(8px)' }}
                        >
                            ⚠️ {pwState.error}
                        </div>
                    )}
                    {pwState?.success && (
                        <div 
                            className="px-6 py-3 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2"
                            style={{ backgroundColor: 'rgba(5, 150, 105, 0.85)', backdropFilter: 'blur(8px)' }}
                        >
                            ✅ パスワードを変更しました
                        </div>
                    )}
                </div>
            )}

            {/* 1. ログイン情報 兼 パスワード変更カード */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
                <h2 className="font-bold text-slate-800 border-b pb-2">ログイン情報・セキュリティ</h2>
                
                <div className="mb-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">ログイン用メールアドレス (変更不可)</label>
                    <input type="email" defaultValue={userEmail} disabled className="w-full p-2 border border-slate-200 rounded text-slate-500 bg-slate-50 text-sm" />
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">パスワード設定</span>
                        <button
                            type="button"
                            onClick={() => setIsOpenPwForm(!isOpenPwForm)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                        >
                            {isOpenPwForm ? 'キャンセル' : 'パスワードの変更'}
                        </button>
                    </div>

                    {isOpenPwForm && (
                        <form action={pwAction} className="mt-2 p-4 bg-slate-50 rounded border border-slate-200 flex flex-col gap-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">新しいパスワード (6文字以上)</label>
                                    <div className="relative">
                                        <input
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="w-full p-2 pr-10 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700 p-1"
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">新しいパスワード (確認用)</label>
                                    <div className="relative">
                                        <input
                                            name="confirm_password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="w-full p-2 pr-10 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700 p-1"
                                        >
                                            {showConfirmPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <SubmitButton pendingText="変更中...">変更</SubmitButton>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* 2. プロフィール・住所情報カード */}
            <form action={action} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6 relative">
                
                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">基本情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">担当者名 (Full Name) <span className="text-red-500">*</span></label>
                            <input name="full_name" defaultValue={getValue('full_name')} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">会社名 (Company Name)</label>
                            <input name="company_name" defaultValue={getValue('company_name')} className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">電話番号 (Phone) <span className="text-red-500">*</span></label>
                            <input name="phone" defaultValue={getValue('phone')} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">納税番号 (Tax ID)</label>
                            <input name="tax_id" defaultValue={getValue('tax_id')} className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </section>

                {/* お支払いアカウント情報（PayPal・Wise対応） */}
                <section>
                    <div className="flex items-center gap-3 border-b pb-2 mb-4">
                        <h2 className="font-bold text-slate-800">お支払いアカウント情報</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* PayPal連携カード */}
                        <div className="p-4 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">PayPal アカウント連携</label>
                                {getValue('paypal_email') ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">
                                            ✅ 連携済み
                                        </span>
                                        <span className="text-sm font-medium text-slate-800">
                                            {getValue('paypal_email')}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">PayPalアカウントと連携すると、支払いや受取がスムーズになります。</p>
                                )}
                            </div>

                            <div className="pt-2">
                                <a
                                    href="/api/auth/paypal"
                                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#0070BA] hover:bg-[#003087] text-white text-xs font-bold rounded transition-colors shadow-sm"
                                >
                                    {getValue('paypal_email') ? 'PayPalアカウントを再連携' : 'PayPalと連携する'}
                                </a>
                            </div>
                        </div>

                        {/* Wise用 メールアドレスカード */}
                        <div className="p-4 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Wise用 メールアドレス</label>
                                <input 
                                    name="wise_email" 
                                    type="email" 
                                    defaultValue={getValue('wise_email')} 
                                    placeholder="wise@example.com" 
                                    className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white mb-2" 
                                />
                                <p className="text-[11px] text-slate-500">
                                    Wiseの自動送金に使用するメールアドレスを入力してください。
                                </p>
                            </div>

                            {/* Wise送金テスト実行ボタン */}
                            <div className="pt-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleWiseTestPayout}
                                    disabled={isTestingWise}
                                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded transition-colors shadow-sm"
                                >
                                    {isTestingWise ? '送金リクエスト処理中...' : 'Wise 1,000円送金テスト'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">お届け先住所 (Shipping Address)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">国 (Country) <span className="text-red-500">*</span></label>
                            <input name="country" defaultValue={getValue('country')} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">郵便番号 (Zip Code) <span className="text-red-500">*</span></label>
                            <input name="zip_code" defaultValue={getValue('zip_code')} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">州または省 (State/Province)</label>
                            <input name="state_province" defaultValue={getValue('state_province')} placeholder="ない場合は空欄でOK" className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">都市名 (City) <span className="text-red-500">*</span></label>
                            <input name="city" defaultValue={getValue('city')} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">住所1 (Address Line 1) <span className="text-red-500">*</span></label>
                            <input name="address_line1" defaultValue={getValue('address_line1')} required placeholder="Street address, P.O. box" className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">住所2 (Address Line 2)</label>
                            <input name="address_line2" defaultValue={getValue('address_line2')} placeholder="Apartment, suite, unit, building, floor, etc." className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">住所3 (Address Line 3)</label>
                            <input name="address_line3" defaultValue={getValue('address_line3')} className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded">
                        <label className="block text-xs font-bold text-slate-600 mb-2">お届け先の種類 (Residential or Commercial) <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="is_residential" value="true" defaultChecked={getBoolValue('is_residential', true) === true} className="cursor-pointer" />
                                個人宅 (Residential)
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="is_residential" value="false" defaultChecked={getBoolValue('is_residential', true) === false} className="cursor-pointer" />
                                事業所・会社 (Commercial)
                            </label>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">※ クーリエ配送の際、個人宅への配達には追加料金がかかる場合があります。正しい種類を選択してください。</p>
                    </div>
                </section>

                <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-100 gap-4">
                    <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
                        キャンセル
                    </Link>
                    <SubmitButton pendingText="保存中...">保存</SubmitButton>
                </div>
            </form>
        </div>
    )
}