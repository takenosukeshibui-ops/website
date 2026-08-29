// app/admin/page.tsx (※パスは環境に合わせてください)
import { createClient } from '@/lib/supabase/server'
import ClientAdminPage from './ClientAdminPage'

export default async function AdminPage() {
    const supabase = await createClient()

    // データベースから注文情報と、紐づく商品情報を取得（priceを追加）
    const { data: orders } = await supabase
        .from('orders')
        .select(`
            id,
            status,
            created_at,
            user_id,
            shipping_fee,
            total_amount,
            tracking_number,
            order_items (
                items (
                    id,
                    title,
                    url,
                    quantity,
                    price,
                    status
                )
            )
        `)
        .order('created_at', { ascending: false })

    return <ClientAdminPage orders={orders || []} />
}