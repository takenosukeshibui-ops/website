'use client'

import React, { useState } from 'react'

export default function CartManager({ initialItems, initialOrders }: { initialItems: any[], initialOrders: any[] }) {
    const [items, setItems] = useState(initialItems)

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">カート内の商品</h2>
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
