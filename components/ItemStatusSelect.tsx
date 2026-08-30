// components/ItemStatusSelect.tsx
// [UPDATED] dict をオプションで受け取り、プルダウン内のラベルを多言語対応化
'use client'

import React, { useState } from 'react'

export default function ItemStatusSelect({ 
    item, 
    onStatusChange,
    dict 
}: { 
    item: any, 
    onStatusChange: (status: string) => void,
    dict?: any // [NEW] 辞書データをオプションで受け取る
}) {
    const [isUpdating, setIsUpdating] = useState(false)

    // [NEW] 辞書データから言語を判定（dictがない場合は日本語フォールバック）
    const isEn = dict?.cart?.title === 'Items in Cart';

    // ステータスごとのラベルと色設定（言語に応じてラベルを切り替え）
    const statusConfig: Record<string, { label: string; className: string }> = {
        pending: { label: isEn ? 'Ordered' : '依頼済み', className: 'bg-blue-100 text-blue-800 border-blue-200' },
        out_of_stock: { label: isEn ? 'Out of Stock' : '在庫切れ', className: 'bg-rose-100 text-rose-800 border-rose-200' },
        purchased: { label: isEn ? 'Purchased' : '購入完了', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        in_warehouse: { label: isEn ? 'Arrived' : '倉庫到着', className: 'bg-purple-100 text-purple-800 border-purple-200' },
        cancelled: { label: isEn ? 'Cancelled' : 'キャンセル', className: 'bg-slate-200 text-slate-600 border-slate-300' },
        info_required: { label: isEn ? 'Action Required' : '要確認', className: 'bg-amber-100 text-amber-800 font-bold border-amber-300' },
    }

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value
        setIsUpdating(true)
        try {
            await onStatusChange(newStatus)
        } catch (error) {
            console.error('Status update failed:', error)
            alert(isEn ? 'Failed to update status.' : 'ステータスの更新に失敗しました')
        } finally {
            setIsUpdating(false)
        }
    }

    const currentConfig = statusConfig[item.status] || { 
        label: item.status, 
        className: 'bg-gray-100 text-gray-800 border-gray-200' 
    }

    return (
        <div className="relative inline-block w-full">
            <select
                value={item.status}
                onChange={handleChange}
                disabled={isUpdating}
                className={`w-full appearance-none border rounded px-2.5 py-1 text-[11px] outline-none cursor-pointer disabled:opacity-50 transition-colors shadow-sm ${currentConfig.className}`}
            >
                {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key} className="bg-white text-slate-800 font-normal">
                        {config.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current opacity-70">
                <svg className="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
            </div>
        </div>
    )
}