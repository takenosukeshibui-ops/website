// app/[lang]/dashboard/settings/ProfileForm.tsx
// [UPDATED] 国選択時に電話番号入力欄へ自動で国際電話番号(国番号プレフィックス)を反映・補完する機能を追加
'use client'

import React, { useActionState, useEffect, useState } from 'react'
import { updateProfile } from '@/app/actions/profile'
import { changePassword, changeEmail } from '@/app/actions/auth'
import { SubmitButton } from '@/components/SubmitButtons'
import { countries } from '@/components/countries'
import CountryCombobox from '@/components/CountryCombobox' 
import Link from 'next/link'

// [NEW] 国コードと国番号（プレフィックス）のマッピング定義
const COUNTRY_DIAL_CODES: Record<string, string> = {
    US: '+1',
    JP: '+81',
    CA: '+1',
    GB: '+44',
    AU: '+61',
    DE: '+49',
    FR: '+33',
    CN: '+86',
    KR: '+82',
    TW: '+886',
    HK: '+852',
    SG: '+65',
    TH: '+66',
    PH: '+63',
    VN: '+84',
    MY: '+60',
    ID: '+62',
    IN: '+91',
    NZ: '+64',
    MX: '+52',
}

export default function ProfileForm({ profile, userEmail, dict }: { profile: any, userEmail: string, dict?: any }) {
    const isEn = typeof window !== 'undefined' 
        ? window.location.pathname.startsWith('/en') 
        : (dict?.settings?.save === 'Save');

    // プロフィール更新用 State
    const [state, action] = useActionState(updateProfile, null)
    const [showToast, setShowToast] = useState(false)

    // パスワード変更用 State
    const [pwState, pwAction] = useActionState(changePassword, null)
    const [showPwToast, setShowPwToast] = useState(false)

    // メール変更用 State 
    const [emailState, emailAction] = useActionState(changeEmail, null)
    const [emailInput, setEmailInput] = useState(userEmail || '')

    // パスワード変更フォームの開閉状態
    const [isOpenPwForm, setIsOpenPwForm] = useState(false)

    // パスワード表示/非表示の切り替え状態
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // 連絡用メールアドレス・Wise用メールアドレスの State 管理
    const [contactEmail, setContactEmail] = useState<string>(profile?.contact_email || '')
    const [wiseEmail, setWiseEmail] = useState<string>(profile?.wise_email || '')

    // 選択された国 (Country) の State 管理
    const [selectedCountry, setSelectedCountry] = useState<string>(profile?.country || 'US')

    // [NEW] 電話番号の State 管理
    const [phone, setPhone] = useState<string>(profile?.phone || COUNTRY_DIAL_CODES[profile?.country || 'US'] || '+1')

    // 同一アドレス適用チェックボックスの State 管理
    const safeUserEmail = userEmail || ''
    const [useSameForContact, setUseSameForContact] = useState<boolean>(
        Boolean(profile?.contact_email && profile.contact_email === safeUserEmail && safeUserEmail !== '')
    )
    const [useSameForWise, setUseSameForWise] = useState<boolean>(
        Boolean(profile?.wise_email && profile.wise_email === safeUserEmail && safeUserEmail !== '')
    )

    const [defaultShipping, setDefaultShipping] = useState(profile?.default_shipping_method || '航空便 (最安プラン)')
    const [defaultPayment, setDefaultPayment] = useState(profile?.default_payment_method || 'Wise')

    // [NEW] 国選択が変更された際に電話番号の国番号を自動セット・置換
    const handleCountryChange = (newCountry: string) => {
        setSelectedCountry(newCountry)
        const dialCode = COUNTRY_DIAL_CODES[newCountry] || ''
        
        if (!dialCode) return

        if (!phone || phone.trim() === '') {
            setPhone(`${dialCode} `)
            return
        }

        // 既存番号の国番号（+数字）部分を新しい国番号に置き換える
        const cleanNumber = phone.replace(/^\+\d+\s*/, '')
        setPhone(`${dialCode} ${cleanNumber}`)
    }

    useEffect(() => {
        if (state?.data?.contact_email !== undefined) {
            setContactEmail(state.data.contact_email || '')
        }
        if (state?.data?.wise_email !== undefined) {
            setWiseEmail(state.data.wise_email || '')
        }
        if (state?.data?.country !== undefined) {
            setSelectedCountry(state.data.country || 'US')
        }
        if (state?.data?.phone !== undefined) {
            setPhone(state.data.phone || '')
        }
        if (state?.data?.default_shipping_method !== undefined) {
            setDefaultShipping(state.data.default_shipping_method || '航空便 (最安プラン)')
        }
        if (state?.data?.default_payment_method !== undefined) {
            setDefaultPayment(state.data.default_payment_method || 'Wise')
        }
    }, [state])

    useEffect(() => {
        if (state?.error || state?.success) {
            setShowToast(true)
            const timer = setTimeout(() => setShowToast(false), 3000) 
            return () => clearTimeout(timer)
        }
    }, [state])

    useEffect(() => {
        if (pwState?.error || pwState?.success) {
            setShowPwToast(true)
            if (pwState.success) {
                setIsOpenPwForm(false)
            }
            const timer = setTimeout(() => setShowPwToast(false), 3000) 
            return () => clearTimeout(timer)
        }
    }, [pwState])

    const handleSameForContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setUseSameForContact(checked)
        if (checked) {
            setContactEmail(safeUserEmail)
        } else {
            setContactEmail('') 
        }
    }

    const handleSameForWiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setUseSameForWise(checked)
        if (checked) {
            setWiseEmail(safeUserEmail)
        } else {
            setWiseEmail('') 
        }
    }

    const getValue = (key: string) => {
        if (state?.data && state.data[key] !== undefined) {
            return state.data[key] || ''
        }
        return profile?.[key] || ''
    }

    const getBoolValue = (key: string, defaultVal: boolean) => {
        if (state?.data && state.data[key] !== undefined) {
            return Boolean(state.data[key])
        }
        return profile?.[key] ?? defaultVal
    }

    const isUS = selectedCountry === 'US'

    return (
        <div className="flex flex-col gap-8">
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
                            ✅ {isEn ? 'Saved successfully' : '設定を保存しました'}
                        </div>
                    )}
                </div>
            )}

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
                            ✅ {isEn ? 'Password Changed' : 'パスワードを変更しました'}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
                <h2 className="font-bold text-slate-800 border-b pb-2">{isEn ? 'Login Information & Security' : 'ログイン情報・セキュリティ'}</h2>
                
                <div className="mb-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Login Email' : 'ログイン用メールアドレス'}</label>
                    <form action={emailAction} className="flex gap-2 items-start">
                        <div className="w-full flex flex-col gap-1">
                            <input 
                                name="email" 
                                type="email" 
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                required 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono" 
                            />
                            {emailState?.error && <span className="text-[10px] text-red-600 font-bold">⚠️ {emailState.error}</span>}
                            {emailState?.success && <span className="text-[10px] text-emerald-600 font-bold">✅ {emailState.message}</span>}
                            <span className="text-[10px] text-slate-500">{isEn ? '*A confirmation email will be sent when you click change.' : '※変更ボタンを押すと確認メールが送信されます。メール内のリンクをクリックするまで実際のアドレスは変更されません。'}</span>
                        </div>
                        <SubmitButton pendingText={isEn ? "Changing..." : "送信中..."}>{isEn ? 'Change' : '変更'}</SubmitButton>
                    </form>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">{isEn ? 'Password Settings' : 'パスワード設定'}</span>
                        <button
                            type="button"
                            onClick={() => setIsOpenPwForm(!isOpenPwForm)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                        >
                            {isOpenPwForm ? (isEn ? 'Cancel' : 'キャンセル') : (isEn ? 'Change Password' : 'パスワードの変更')}
                        </button>
                    </div>

                    {isOpenPwForm && (
                        <form action={pwAction} className="mt-2 p-4 bg-slate-50 rounded border border-slate-200 flex flex-col gap-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'New Password (min 6 chars)' : '新しいパスワード (6文字以上)'}</label>
                                    <div className="relative">
                                        <input
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
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
                                    <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Confirm New Password' : '新しいパスワード (確認用)'}</label>
                                    <div className="relative">
                                        <input
                                            name="confirm_password"
                                            type={showConfirmPassword ? 'text' : 'password'}
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
                                <SubmitButton pendingText={isEn ? "Changing..." : "変更中..."}>{isEn ? 'Change' : '変更'}</SubmitButton>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <form action={action} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6 relative">
                
                <section>
                    <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">{isEn ? 'Basic Information' : '基本情報'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Full Name' : '担当者名 (Full Name)'} <span className="text-red-500">*</span></label>
                            <input 
                                name="full_name" 
                                defaultValue={getValue('full_name')} 
                                required 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Company Name' : '会社名 (Company Name)'}</label>
                            <input 
                                name="company_name" 
                                defaultValue={getValue('company_name')} 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>

                        {/* [UPDATED] value & onChange 制御にし、国選択変更で自動補完されるよう修正 */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Phone' : '電話番号 (Phone)'} <span className="text-red-500">*</span></label>
                            <input 
                                name="phone" 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)}
                                required 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono" 
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-600">
                                    {isEn ? 'Contact Email' : '連絡用メールアドレス (Contact Email)'} <span className="text-red-500">*</span>
                                </label>
                                <label className="flex items-center gap-1 text-[11px] text-blue-600 font-bold cursor-pointer hover:underline">
                                    <input 
                                        type="checkbox" 
                                        checked={Boolean(useSameForContact)} 
                                        onChange={handleSameForContactChange}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    {isEn ? 'Same as login' : 'ログイン用と同じ'}
                                </label>
                            </div>
                            <input 
                                type="email"
                                name="contact_email" 
                                value={contactEmail} 
                                onChange={(e) => {
                                    setContactEmail(e.target.value)
                                    if (e.target.value !== safeUserEmail) setUseSameForContact(false)
                                }}
                                placeholder="contact@example.com"
                                required
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono" 
                            />
                        </div>

                        {/* [UPDATED] onChange を handleCountryChange に接続 */}
                        <div className="relative z-40">
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Country' : '国 (Country)'} <span className="text-red-500">*</span></label>
                            <input type="hidden" name="country" value={selectedCountry} />
                            <CountryCombobox 
                                value={selectedCountry} 
                                onChange={handleCountryChange} 
                                isEn={isEn} 
                            />
                        </div>

                        <div className="relative z-30">
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                {isEn ? 'FedEx Account Number' : 'FedEx アカウント番号'} {isUS && <span className="text-red-500">*</span>}
                            </label>
                            <input 
                                name="fedex_account_number" 
                                defaultValue={getValue('fedex_account_number')} 
                                required={isUS}
                                placeholder="123456789"
                                className={`w-full p-2 border rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono ${
                                    isUS ? 'border-amber-300 bg-amber-50/30' : 'border-slate-300'
                                }`} 
                            />
                            {isUS && (
                                <span className="text-[10px] text-amber-700 mt-1 block">
                                    {isEn ? '*Required for customs clearance when using air freight.' : '※ 航空便利用時の関税支払い手続きに必須となります。'}
                                </span>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Zip Code' : '郵便番号 (Zip Code)'} <span className="text-red-500">*</span></label>
                            <input 
                                name="zip_code" 
                                defaultValue={getValue('zip_code')} 
                                required 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Tax ID' : '納税番号 (Tax ID)'}</label>
                            <input 
                                name="tax_id" 
                                defaultValue={getValue('tax_id')} 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'City' : '都市名 (City)'} <span className="text-red-500">*</span></label>
                            <input 
                                name="city" 
                                defaultValue={getValue('city')} 
                                required 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'State/Province' : '州または省 (State/Province)'}</label>
                            <input 
                                name="state_province" 
                                defaultValue={getValue('state_province')} 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Address Line 1' : '住所1 (Address Line 1)'} <span className="text-red-500">*</span></label>
                            <input 
                                name="address_line1" 
                                defaultValue={getValue('address_line1')} 
                                required 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Address Line 2' : '住所2 (Address Line 2)'}</label>
                            <input 
                                name="address_line2" 
                                defaultValue={getValue('address_line2')} 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Address Line 3' : '住所3 (Address Line 3)'}</label>
                            <input 
                                name="address_line3" 
                                defaultValue={getValue('address_line3')} 
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded relative z-0">
                        <label className="block text-xs font-bold text-slate-600 mb-2">{isEn ? 'Address Type' : 'お届け先の種類 (Residential or Commercial)'} <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="is_residential" value="true" defaultChecked={getBoolValue('is_residential', true) === true} className="cursor-pointer" />
                                {isEn ? 'Residential' : '個人宅 (Residential)'}
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="is_residential" value="false" defaultChecked={getBoolValue('is_residential', true) === false} className="cursor-pointer" />
                                {isEn ? 'Commercial' : '事業所・会社 (Commercial)'}
                            </label>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">{isEn ? '*Courier deliveries to residential addresses may incur additional charges. Please select correctly.' : '※ クーリエ配送の際、個人宅への配達には追加料金がかかる場合があります。正しい種類を選択してください。'}</p>
                    </div>
                </section>

                <section className="relative z-0">
                    <div className="flex items-center gap-3 border-b pb-2 mb-4">
                        <h2 className="font-bold text-slate-800">{isEn ? 'Payment Account Information' : 'お支払いアカウント情報'}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'PayPal Account Link' : 'PayPal アカウント連携'}</label>
                                {getValue('paypal_email') ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">
                                            ✅ {isEn ? 'Linked' : '連携済み'}
                                        </span>
                                        <span className="text-sm font-medium text-slate-800">
                                            {getValue('paypal_email')}
                                        </span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="pt-2">
                                <a
                                    href="/api/auth/paypal"
                                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#0070BA] hover:bg-[#003087] text-white text-xs font-bold rounded transition-colors shadow-sm"
                                >
                                    {getValue('paypal_email') ? (isEn ? 'Relink PayPal Account' : 'PayPalアカウントを再連携') : (isEn ? 'Link with PayPal' : 'PayPalと連携する')}
                                </a>
                            </div>
                        </div>

                        <div className="p-4 rounded border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-600">{isEn ? 'Wise Email' : 'Wise用 メールアドレス'}</label>
                                    <label className="flex items-center gap-1 text-[11px] text-blue-600 font-bold cursor-pointer hover:underline">
                                        <input 
                                            type="checkbox" 
                                            checked={Boolean(useSameForWise)} 
                                            onChange={handleSameForWiseChange}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        {isEn ? 'Same as login' : 'ログイン用と同じ'}
                                    </label>
                                </div>
                                <input 
                                    name="wise_email" 
                                    type="email" 
                                    value={wiseEmail} 
                                    onChange={(e) => {
                                        setWiseEmail(e.target.value)
                                        if (e.target.value !== safeUserEmail) setUseSameForWise(false)
                                    }}
                                    className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white font-mono" 
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative z-0">
                    <div className="flex items-baseline justify-between border-b pb-2 mb-4">
                        <h2 className="font-bold text-slate-800">{isEn ? 'Default Order Settings' : 'デフォルトの注文設定'}</h2>
                        <span className="text-[11px] text-slate-500">{isEn ? 'These will be initially selected when submitting a request from the cart.' : 'カートで依頼を送信する際の初期選択になります。'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Shipping Method' : '配送方法'}</label>
                            <select 
                                name="default_shipping_method"
                                value={defaultShipping}
                                onChange={(e) => setDefaultShipping(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                            >
                                <option value="航空便 (最安プラン)">{isEn ? 'Cheapest Auto (Air)' : '航空便 (最安プラン自動選択)'}</option>
                                <option value="船便">{isEn ? 'Japan Post (Sea)' : '日本郵便 (船便)'}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{isEn ? 'Payment Method' : '決済方法'}</label>
                            <select 
                                name="default_payment_method"
                                value={defaultPayment}
                                onChange={(e) => setDefaultPayment(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"
                            >
                                <option value="Wise">{isEn ? 'Wise (Bank Transfer)' : 'Wise（銀行振込）'}</option>
                                <option value="CreditCard">{isEn ? 'Credit Card' : 'クレジットカード'}</option>
                                <option value="PayPal">PayPal</option>
                            </select>
                        </div>
                    </div>
                </section>

                <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-100 gap-4 relative z-0">
                    <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
                        {isEn ? 'Cancel' : 'キャンセル'}
                    </Link>
                    <SubmitButton pendingText={isEn ? 'Saving...' : '保存中...'}>{isEn ? 'Save' : '保存'}</SubmitButton>
                </div>
            </form>
        </div>
    )
}