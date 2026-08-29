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

    // ユーザーIDと Wise 送金用のプロフィール情報 (wise_email, full_name) を結合取得
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            user_id,
            order_number,
            status,
            shipping_fee,
            total_amount,
            tracking_number,
            created_at,
            profiles (
                wise_email,
                full_name
            ),
            order_items (
                id,
                items (
                    id,
                    title,
                    price,
                    desired_price,
                    quantity,
                    admin_quantity,
                    status,
                    url,
                    remarks,
                    admin_note
                )
            )
        `)
        .order('order_number', { ascending: false })

    if (error) {
        console.error('注文データの取得失敗:', error.message)
    }

    return <ClientAdminPage orders={orders || []} />
}