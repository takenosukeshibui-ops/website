// components/ItemStatusSelect.tsx
'use client'

import React, { useState } from 'react'

export default function ItemStatusSelect({ 
    item, 
    onStatusChange 
}: { 
    item: any, 
    onStatusChange: (status: string) => void 
}) {
    const [isUpdating, setIsUpdating] = useState(false)

    // 定義されたステータス一覧
    const statuses = [
        { value: 'pending', label: '依頼済み' },
        { value: 'out_of_stock', label: '在庫切れ' },
        { value: 'purchased', label: '購入完了' },
        { value: 'in_warehouse', label: '倉庫到着' },
        { value: 'cancelled', label: 'キャンセル' },
        { value: 'info_required', label: '要確認' },
    ]

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value
        setIsUpdating(true)
        try {
            // アクション（updateItemStatus等）は親コンポーネントで実行される想定
            await onStatusChange(newStatus)
        } catch (error) {
            console.error('ステータス更新失敗:', error)
            alert('ステータスの更新に失敗しました')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <select
            value={item.status}
            onChange={handleChange}
            disabled={isUpdating}
            className="border border-slate-300 rounded p-1 text-[11px] bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        >
            {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                    {s.label}
                </option>
            ))}
        </select>
    )
}