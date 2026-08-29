// components/ItemStatusSelect.tsx
'use client'

import { useState } from 'react'
import { updateItemStatus } from '@/app/actions/admin'

const statuses = [
    { value: 'pending', label: '依頼済み' },
    { value: 'out_of_stock', label: '在庫切れ' },
    { value: 'purchased', label: '購入完了' },
    { value: 'in_warehouse', label: '倉庫到着' },
    { value: 'cancelled', label: 'キャンセル' },
]

export default function ItemStatusSelect({ item }: { item: { id: string; status: string } }) {
    const [status, setStatus] = useState(item.status)

    const handleChange = async (newStatus: string) => {
        const oldStatus = status
        setStatus(newStatus)
        try {
            await updateItemStatus(item.id, newStatus)
        } catch (e: unknown) {
            setStatus(oldStatus)
            console.error(e)
            alert('更新失敗: ' + (e instanceof Error ? e.message : 'Unknown error'))
        }
    }

    return (
        <select
            value={status}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-white text-slate-900 border border-slate-300 p-1 rounded text-xs"
        >
            {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
            ))}
        </select>
    )
}