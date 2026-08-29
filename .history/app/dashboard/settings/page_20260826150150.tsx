// app/dashboard/settings/page.tsx
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SubmitButton } from '@/components/SubmitButtons'
import { updateProfile } from '@/app/actions/profile'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 現在のプロフィール情報を取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">アカウント設定</h1>
                <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
                    &larr; マイページに戻る
                </Link>
            </div>

            <form action={updateProfile} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6">
                
                {/* ログイン情報 */}
                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">ログイン情報 (変更不可)</h2>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-600 mb-1">ログイン用メールアドレス</label>
                        <input type="email" defaultValue={user.email} disabled className="w-full p-2 border border-slate-200 rounded text-slate-500 bg-slate-50 text-sm" />
                    </div>
                </section>

                {/* 基本情報 */}
                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">基本情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">担当者名 (Full Name) <span className="text-red-500">*</span></label>
                            <input name="full_name" defaultValue={profile?.full_name || ''} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">会社名 (Company Name)</label>
                            <input name="company_name" defaultValue={profile?.company_name || ''} className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">電話番号 (Phone) <span className="text-red-500">*</span></label>
                            <input name="phone" defaultValue={profile?.phone || ''} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">納税番号 (Tax ID)</label>
                            <input name="tax_id" defaultValue={profile?.tax_id || ''} className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </section>

                {/* 決済・お支払い情報 */}
                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">お支払いアカウント情報</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">PayPal用 メールアドレス</label>
                            <input name="paypal_email" type="email" defaultValue={profile?.paypal_email || ''} placeholder="paypal@example.com" className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Wise用 メールアドレス</label>
                            <input name="wise_email" type="email" defaultValue={profile?.wise_email || ''} placeholder="wise@example.com" className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </section>

                {/* お届け先住所 */}
                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">お届け先住所 (Shipping Address)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">国 (Country) <span className="text-red-500">*</span></label>
                            <input name="country" defaultValue={profile?.country || ''} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">郵便番号 (Zip Code) <span className="text-red-500">*</span></label>
                            <input name="zip_code" defaultValue={profile?.zip_code || ''} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">州または省 (State/Province) <span className="text-red-500">*</span></label>
                            <input name="state_province" defaultValue={profile?.state_province || ''} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">都市名 (City) <span className="text-red-500">*</span></label>
                            <input name="city" defaultValue={profile?.city || ''} required className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">住所1 (Address Line 1) <span className="text-red-500">*</span></label>
                            <input name="address_line1" defaultValue={profile?.address_line1 || ''} required placeholder="Street address, P.O. box" className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">住所2 (Address Line 2)</label>
                            <input name="address_line2" defaultValue={profile?.address_line2 || ''} placeholder="Apartment, suite, unit, building, floor, etc." className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">住所3 (Address Line 3)</label>
                            <input name="address_line3" defaultValue={profile?.address_line3 || ''} className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded">
                        <label className="block text-xs font-bold text-slate-600 mb-2">お届け先の種類 (Residential or Commercial) <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="is_residential" value="true" defaultChecked={profile?.is_residential !== false} className="cursor-pointer" />
                                個人宅 (Residential)
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="is_residential" value="false" defaultChecked={profile?.is_residential === false} className="cursor-pointer" />
                                事業所・会社 (Commercial)
                            </label>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">※ クーリエ配送の際、個人宅への配達には追加料金がかかる場合があります。正しい種類を選択してください。</p>
                    </div>
                </section>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <SubmitButton pendingText="保存中...">設定を保存する</SubmitButton>
                </div>
            </form>
        </div>
    )
}