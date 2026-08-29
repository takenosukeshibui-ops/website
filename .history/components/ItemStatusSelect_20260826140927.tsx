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

    // ステータスごとのラベルと色設定（ItemStatusBadgeのデザインを統合）
    const statusConfig: Record<string, { label: string; className: string }> = {
        draft: { label: 'カート', className: 'bg-slate-100 text-slate-600 border-slate-200' },
        pending: { label: '依頼済み', className: 'bg-blue-100 text-blue-800 border-blue-200' },
        out_of_stock: { label: '在庫切れ', className: 'bg-rose-100 text-rose-800 border-rose-200' },
        purchased: { label: '購入完了', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        in_warehouse: { label: '倉庫到着', className: 'bg-purple-100 text-purple-800 border-purple-200' },
        cancelled: { label: 'キャンセル', className: 'bg-slate-200 text-slate-600 border-slate-300' },
        info_required: { label: '要確認', className: 'bg-amber-100 text-amber-800 font-bold border-amber-300' },
    }

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value
        setIsUpdating(true)
        try {
            await onStatusChange(newStatus)
        } catch (error) {
            console.error('ステータス更新失敗:', error)
            alert('ステータスの更新に失敗しました')
        } finally {
            setIsUpdating(false)
        }
    }

    // 現在のステータスの色設定を取得（なければデフォルト）
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
                // appearance-none で標準の矢印を消し、独自の色とデザインを適用
                className={`w-full appearance-none border rounded px-2.5 py-1 text-[11px] outline-none cursor-pointer disabled:opacity-50 transition-colors shadow-sm ${currentConfig.className}`}
            >
                {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key} className="bg-white text-slate-800 font-normal">
                        {config.label}
                    </option>
                ))}
            </select>
            {/* カスタムのドロップダウン矢印（右側に配置） */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current opacity-70">
                <svg className="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
            </div>
        </div>
    )
}