'use client'

import { StatusBadge } from '@/components/StatusBadge'
import { ItemStatusBadge } from '@/components/ItemStatusBadge'
import ItemStatusSelect from '@/components/ItemStatusSelect'
import { sendInvoice, shipOrder } from '@/app/actions/admin'
import { SubmitButton } from '@/components/SubmitButtons'

export default function ClientAdminPage({ orders }: { orders: any[] }) {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            <div className="space-y-4">
                {orders.map((order) => (
                    <div key={order.id} className="border p-4 rounded">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold">Order #{order.id}</span>
                            <StatusBadge status={order.status} />
                        </div>
                        <div className="space-y-2">
                            {order.order_items.map((oi: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                    <span>{oi.items.title || oi.items.url} (x{oi.items.quantity})</span>
                                    <div className="flex items-center gap-2">
                                        <ItemStatusBadge status={oi.items.status} />
                                        <ItemStatusSelect item={oi.items} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <form action={sendInvoice.bind(null, order.id)}>
                                <SubmitButton>請求書送信</SubmitButton>
                            </form>
                            <form action={shipOrder.bind(null, order.id)}>
                                <SubmitButton>発送完了</SubmitButton>
                            </form>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
