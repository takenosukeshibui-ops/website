import React from 'react';

export function ItemStatusBadge({ status, dict }: { status: string; dict: any }) {
    const statusConfig: Record<string, { label: string; className: string }> = {
        draft: { label: dict.dashboard.badge.item.cart, className: 'bg-slate-100 text-slate-600' },
        pending: { label: dict.dashboard.badge.item.ordered, className: 'bg-blue-100 text-blue-800' },
        out_of_stock: { label: dict.dashboard.badge.item.out_of_stock, className: 'bg-rose-100 text-rose-800' },
        purchased: { label: dict.dashboard.badge.item.purchased, className: 'bg-emerald-100 text-emerald-800' },
        in_warehouse: { label: dict.dashboard.badge.item.warehouse_arrival, className: 'bg-purple-100 text-purple-800' },
        cancelled: { label: dict.dashboard.badge.item.cancelled, className: 'bg-slate-200 text-slate-600' },
        info_required: { label: dict.dashboard.badge.item.info_required, className: 'bg-amber-100 text-amber-800 font-bold border border-amber-300 animate-pulse' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`px-2 py-1 rounded text-[11px] whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    );
}