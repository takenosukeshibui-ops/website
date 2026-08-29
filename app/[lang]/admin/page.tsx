// app/admin/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientAdminPage from './ClientAdminPage'

export default async function AdminPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 管理者権限チェック
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    // [UPDATED] 担当者名(full_name), 電話番号(phone), 会社名(company_name)等を含む全必要なプロファイルカラムを取得
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

    return (
        <div className="min-h-screen bg-slate-50">
            {/* 新機能用ナビゲーションヘッダー */}
            <div className="bg-slate-900 text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm bg-blue-600 px-2.5 py-1 rounded">ADMIN</span>
                        <h1 className="text-base font-bold">管理者ダッシュボード</h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Link 
                            href="/admin/profit" 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            📊 利益・送料試算
                        </Link>

                        <Link 
                            href="/admin/data" 
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            ⚙️ マスタ管理
                        </Link>

                        <Link 
                            href="/calculator" 
                            target="_blank"
                            className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            ↗ 送料シミュレーター (ユーザー用)
                        </Link>
                    </div>
                </div>
            </div>

            {/* 従来の管理メイン画面 */}
            <ClientAdminPage orders={orders || []} />
        </div>
    )
}