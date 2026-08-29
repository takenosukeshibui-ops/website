// app/dashboard/settings/ProfileForm.tsx
'use client'

import React, { useActionState } from 'react'
import { updateProfile } from '@/app/actions/profile'
import { SubmitButton } from '@/components/SubmitButtons'
import Link from 'next/link'

export default function ProfileForm({ profile, userEmail }: { profile: any, userEmail: string }) {
    const [state, action] = useActionState(updateProfile, null)

    // エラー時はユーザーが直前に入力した値(state.data)を優先し、
    // 成功時や初回表示時はデータベースの値(profile)を使用する関数
    const getValue = (key: string) => {
        if (state?.data && state.data[key] !== undefined) {
            return state.data[key]
        }
        return profile?.[key] || ''
    }

    // ラジオボタン用（true/falseの判定）
    const getBoolValue = (key: string, defaultVal: boolean) => {
        if (state?.data && state.data[key] !== undefined) {
            return state.data[key]
        }
        return profile?.[key] ?? defaultVal
    }

    return (
        <>
            {/* ★ ポップアップの位置を少し上 (bottom-24) に変更しました */}
            {(state?.error || state?.success) && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
                    {state?.error && (
                        <div className="px-6 py-3 bg-red-600 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
                            ⚠️ {state.error}
                        </div>
                    )}
                    {state?.success && (
                        <div className="px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
                            ✅ 設定を保存しました
                        </div>
                    )}
                </div>
            )}

            <form action={action} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6 relative">
                
                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">ログイン情報 (変更不可)</h2>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-600 mb-1">ログイン用メールアドレス</label>
                        <input type="email" defaultValue={userEmail} disabled className="w-full p-2 border border-slate-200 rounded text-slate-500 bg-slate-50 text-sm" />
                    </div>
                </section>

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

                <section>
                    <div className="flex items-center gap-3 border-b pb-2 mb-4">
                        <h2 className="font-bold text-slate-800">お支払いアカウント情報</h2>
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200">※ どちらか一方の入力が必須</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">PayPal用 メールアドレス</label>
                            <input name="paypal_email" type="email" defaultValue={getValue('paypal_email')} placeholder="paypal@example.com" className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Wise用 メールアドレス</label>
                            <input name="wise_email" type="email" defaultValue={getValue('wise_email')} placeholder="wise@example.com" className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
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
                    
                    {/* ★ ボタンテキストを「保存」に変更しました */}
                    <SubmitButton pendingText="保存中...">保存</SubmitButton>
                </div>
            </form>
        </>
    )
}