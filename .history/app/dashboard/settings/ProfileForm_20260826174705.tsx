// app/dashboard/settings/ProfileForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { executeWisePayout } from '@/app/actions/wise'

interface ProfileFormProps {
    profile: {
        id: string
        full_name?: string
        paypal_email?: string
        wise_email?: string
    }
}

export default function ProfileForm({ profile }: ProfileFormProps) {
    const supabase = createClient()

    // フォームの入力状態
    const [fullName, setFullName] = useState(profile?.full_name || '')
    const [wiseEmail, setWiseEmail] = useState(profile?.wise_email || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isTestingWise, setIsTestingWise] = useState(false)

    // プロフィール情報（Wiseメールアドレス等）の保存処理
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    wise_email: wiseEmail,
                })
                .eq('id', profile.id)

            if (error) throw error
            alert('プロフィール設定を保存しました！')
        } catch (error: any) {
            console.error('Save Error:', error)
            alert(`保存に失敗しました: ${error.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    // Wise 送金テストの実行処理
    const handleWiseTestPayout = async () => {
        if (!wiseEmail) {
            alert('Wise登録メールアドレスを入力して保存してからテストしてください。')
            return
        }

        if (!confirm(`「${wiseEmail}」宛てに 1,000円 のWise送金テストを実行しますか？`)) {
            return
        }

        setIsTestingWise(true)

        try {
            // Step 5で作成したServer Actionを呼び出し
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
        <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md space-y-8">
            <h2 className="text-xl font-bold border-b pb-3">アカウント・決済連携設定</h2>

            {/* プロフィール更新フォーム */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        お名前
                    </label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="山田 太郎"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* PayPal（既存連携状態） */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        PayPal 連携アカウント
                    </label>
                    <input
                        type="text"
                        disabled
                        value={profile?.paypal_email || '未連携'}
                        className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md text-gray-600"
                    />
                </div>

                {/* Wise 登録メールアドレス */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wise 登録メールアドレス
                    </label>
                    <input
                        type="email"
                        value={wiseEmail}
                        onChange={(e) => setWiseEmail(e.target.value)}
                        placeholder="wise-account@example.com"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Wiseでの報酬受け取りに使用するメールアドレスを入力してください。
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                    {isSaving ? '保存中...' : '設定を保存する'}
                </button>
            </form>

            <hr className="border-gray-200" />

            {/* Wise送金テストセクション */}
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Wise API 自動送金テスト</h3>
                <p className="text-xs text-gray-600">
                    設定されたWiseメールアドレスに対して 1,000円 のPayoutリクエストを実行します。
                </p>
                <button
                    type="button"
                    onClick={handleWiseTestPayout}
                    disabled={isTestingWise || !wiseEmail}
                    className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                    {isTestingWise ? '送金リクエスト処理中...' : 'Wise 1,000円送金テスト実行'}
                </button>
            </div>
        </div>
    )
}