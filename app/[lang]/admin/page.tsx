// app/[lang]/admin/page.tsx
// [UPDATED] 当社在庫管理ボタンの遷移先を /admin/data へ統一
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

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/dashboard')
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

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-slate-900 text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm bg-blue-600 px-2.5 py-1 rounded">ADMIN</span>
                        <h1 className="text-base font-bold">管理者ダッシュボード</h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* [UPDATED] 当社在庫管理へのリンク先を /admin/data に一本化 */}
                        <Link 
                            href="/admin/data" 
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            📦 当社在庫・マスタ管理
                        </Link>

                        <Link 
                            href="/admin/profit" 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                        >
                            📊 利益・送料試算
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

            <ClientAdminPage orders={orders || []} />
        </div>
    )
}