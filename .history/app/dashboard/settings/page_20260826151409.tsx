// app/dashboard/settings/page.tsx
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from './ProfileForm' // 先ほど切り出したコンポーネントをインポート

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
            
            {/* 切り出したフォームにデータを渡して表示 */}
            <ProfileForm profile={profile} userEmail={user.email || ''} />
        </div>
    )
}