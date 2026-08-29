// components/ItemStatusBadge.tsx
import React from 'react';

export function ItemStatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; className: string }> = {
        draft: { label: 'カート', className: 'bg-slate-100 text-slate-600' },
        pending: { label: '依頼済み', className: 'bg-blue-100 text-blue-800' },
        out_of_stock: { label: '在庫切れ', className: 'bg-rose-100 text-rose-800' },
        purchased: { label: '購入完了', className: 'bg-emerald-100 text-emerald-800' },
        in_warehouse: { label: '倉庫到着', className: 'bg-purple-100 text-purple-800' },
        cancelled: { label: 'キャンセル', className: 'bg-slate-200 text-slate-600' },
        info_required: { label: '要確認', className: 'bg-amber-100 text-amber-800 font-bold border border-amber-300 animate-pulse' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`px-2 py-1 rounded text-[11px] whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    );
}