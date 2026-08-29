'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CartManager({ initialItems, initialOrders }: { initialItems: any[], initialOrders: any[] }) {
    const [items, setItems] = useState(initialItems)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleRequestOrder() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: order, error } = await supabase
            .from('orders')
            .insert({
                user_id: user.id,
                status: 'pending'
            })
            .select()
            .single()

        if (order) {
            await supabase
                .from('items')
                .update({ status: 'ordered', order_id: order.id })
                .eq('user_id', user.id)
                .eq('status', 'draft')

            setItems([])
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">カート内の商品</h2>
                {items.length > 0 && (
                    <button
                        onClick={handleRequestOrder}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? '依頼中...' : '依頼する'}
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="border p-4 rounded flex justify-between items-center bg-white shadow-sm">
                        <div>
                            <p className="font-bold">{item.title}</p>
                            <p className="text-sm text-slate-500">{item.url}</p>
                            <p className="text-sm">数量: {item.quantity}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
