// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDashboardPage from './ClientDashboardPage'

export const revalidate = 0

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // ログイン中のユーザーの注文を取得（order_number を追加）
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            order_number,
            status,
            shipping_fee,
            total_amount,
            tracking_number,
            created_at,
            order_items (
                id,
                items (
                    id,
                    title,
                    price,
                    quantity,
                    status,
                    url
                )
            )
        `)
        .eq('user_id', user.id)
        .order('order_number', { ascending: false })

    if (error) {
        console.error('マイページ注文取得エラー:', error.message)
    }

    return <ClientDashboardPage orders={orders || []} />
}