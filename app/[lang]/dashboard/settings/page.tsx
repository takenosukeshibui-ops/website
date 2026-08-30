// app/[lang]/dashboard/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from './ProfileForm'
import { getDictionary } from '@/lib/dictionaries' // [NEW] 辞書取得関数をインポート

export default async function SettingsPage(props: {
    params: Promise<{ lang: 'en' | 'ja' }>
}) {
    const { lang } = await props.params // [NEW] 言語パラメータを取得
    const dict = await getDictionary(lang) // [NEW] 辞書を取得
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
                {/* [UPDATED] 辞書を使って多言語化し、遷移先にも lang を付与 */}
                <Link href={`/${lang}/dashboard`} className="text-xs font-bold text-blue-600 hover:underline">
                    {dict?.settings?.backToMyPage || '← マイページへ戻る'}
                </Link>
            </div>
            
            {/* [UPDATED] dict を Props として渡す */}
            <ProfileForm profile={profile} userEmail={user.email || ''} dict={dict} />
        </div>
    )
}