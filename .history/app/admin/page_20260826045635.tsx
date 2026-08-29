import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/StatusBadge'
import ItemStatusSelect from '@/components/ItemStatusSelect'
import { ItemStatusBadge } from '@/components/ItemStatusBadge'
import { sendInvoice, shipOrder } from '@/app/actions/admin'
import { SubmitButton } from '@/components/SubmitButtons'
import ClientAdminPage from './ClientAdminPage'

export default async function AdminPage() {
    const supabase = await createClient()

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
                    status
                )
            )
        `)
        .order('created_at', { ascending: false })

    return <ClientAdminPage orders={orders || []} />
}
