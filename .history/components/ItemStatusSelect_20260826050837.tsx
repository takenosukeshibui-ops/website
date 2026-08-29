'use client'

import { useState } from 'react'
import { updateItemStatus } from '@/app/actions/admin'

const statuses = [
    { value: 'pending', label: '依頼済み' },
    { value: 'info_required', label: '情報不備' },
    { value: 'out_of_stock', label: '在庫切れ' },
    { value: 'purchased', label: '購入完了' },
    { value: 'in_warehouse', label: '倉庫到着' },
    { value: 'quantity_changed', label: '数量変更' },
    { value: 'cancelled', label: '取引中止' },
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
        <div className="flex items-center gap-2">
            <select
                value={status}
                onChange={(e) => handleChange(e.target.value)}
                className="bg-white text-slate-900 border border-slate-300 p-1 rounded text-sm"
            >
                {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                ))}
            </select>
        </div>
    )
}
