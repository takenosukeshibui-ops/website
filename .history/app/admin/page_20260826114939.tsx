// app/admin/page.tsx
import { createClient } from '@/lib/supabase/server'
import ClientAdminPage from './ClientAdminPage'
import { redirect } from 'next/navigation'

export const revalidate = 0

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
        redirect('/')
    }

    // order_items 内の quantity を削除し、items 側から価格や数量を取得する形に修正
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
        .order('order_number', { ascending: false })

    if (error) {
        console.error('注文データの取得失敗:', error.message)
    }

    return <ClientAdminPage orders={orders || []} />
}