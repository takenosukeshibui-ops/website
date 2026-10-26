// app/[lang]/admin/page.tsx
// [UPDATED] 当社在庫管理ボタンの遷移先を /admin/inventory へ変更し、langパラメータを付与
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientAdminPage from './ClientAdminPage'

export default async function AdminPage(props: { params: Promise<{ lang: string }> }) {
    // URLから言語(lang)を取得
    const { lang } = await props.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${lang}/login`)
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect(`/${lang}/dashboard`)
    }

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            *,
            profiles:user_id (
                email,
                contact_email,
                full_name,
                company_name,
                phone,
                fedex_account_number,
                tax_id,
                wise_email,
                paypal_email,
                country,
                zip_code,
                state_province,
                city,
                address_line1,
                address_line2,
                address_line3,
                is_residential
            ),
            order_items (
                id,
                items (
                    id,
                    title,
                    url,
                    price,
                    quantity,
                    admin_quantity,
                    desired_price,
                    status,
                    admin_note,
                    remarks
                )
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching orders:', error)
    }

    // --- 💡 ここから追加・変更：ユーザーごとの連番を計算する ---
    const processedOrders = orders ? [...orders] : []
    const userSeqTracker: Record<string, number> = {}

    // 古い注文（配列の末尾）から新しい注文に向かって、ユーザーごとの連番を振る
    for (let i = processedOrders.length - 1; i >= 0; i--) {
        const order = processedOrders[i]
        const uid = order.user_id // どのユーザーの注文か
        
        if (!userSeqTracker[uid]) {
            userSeqTracker[uid] = 0 // 初めて出現したユーザーなら0からスタート
        }
        userSeqTracker[uid] += 1
        
        // 割り出した連番を order に直接セットする (ClientAdminPage 側で読み取られます)
        order.user_order_seq = userSeqTracker[uid]
    }
    // --- 💡 追加ここまで ---

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ... ヘッダー部分はそのまま ... */}
            <div className="bg-slate-900 text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm bg-blue-600 px-2.5 py-1 rounded">ADMIN</span>
                        <h1 className="text-base font-bold">管理者ダッシュボード</h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Link 
                            href={`/${lang}/admin/inventory`} 
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            📦 自社在庫管理
                        </Link>
                        <Link 
                            href={`/${lang}/admin/profit`} 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            📊 利益・送料試算
                        </Link>
                        <Link 
                            href={`/${lang}/calculator`} 
                            target="_blank"
                            className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            ↗ 送料シミュレーター (ユーザー用)
                        </Link>
                    </div>
                </div>
            </div>

            {/* 💡 変更：orders の代わりに、連番を付与した processedOrders を渡す */}
            <ClientAdminPage orders={processedOrders} />
        </div>
    )
}