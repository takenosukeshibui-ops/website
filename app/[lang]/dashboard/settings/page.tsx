// app/dashboard/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
// [UPDATED] 一本化先である同階層の ProfileForm.tsx からインポートするように変更
import ProfileForm from './ProfileForm'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4">
                <Link href="/dashboard" className="text-xs font-bold text-blue-600 hover:underline">
                    ← マイページへ戻る
                </Link>
            </div>
            
            <ProfileForm profile={profile} userEmail={user.email || ''} />
        </div>
    )
}