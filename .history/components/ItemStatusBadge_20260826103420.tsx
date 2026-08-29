import React from 'react';

const itemStatusStyles: Record<string, { label: string; className: string }> = {
    pending: { label: '依頼済み', className: 'bg-yellow-100 text-yellow-800' },
    out_of_stock: { label: '在庫切れ', className: 'bg-gray-100 text-gray-800' },
    purchased: { label: '購入完了', className: 'bg-blue-100 text-blue-800' },
    in_warehouse: { label: '倉庫到着', className: 'bg-purple-100 text-purple-800' },
    cancelled: { label: 'キャンセル', className: 'bg-red-100 text-red-800' },
};

export function ItemStatusBadge({ status }: { status: string }) {
    const config = itemStatusStyles[status] || { label: status || '不明', className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${config.className}`}>
            {config.label}
        </span>
    );
}