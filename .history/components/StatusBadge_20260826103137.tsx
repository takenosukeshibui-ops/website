import React from 'react';

interface StatusBadgeProps {
    status?: string;
}

const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    processing: 'bg-blue-100 text-blue-800 border-blue-300',
    calculating: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    procured: 'bg-teal-100 text-teal-800 border-teal-300',
    needs_action: 'bg-orange-100 text-orange-800 border-orange-300',
    payment_required: 'bg-amber-100 text-amber-800 border-amber-300',
    shipped: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-300',
};

const getStatusLabel = (status: string | undefined): string => {
    switch (status) {
        case 'pending': return '依頼済み';
        case 'processing': return '処理中';
        case 'calculating': return '発送準備中';
        case 'procured': return '買い付け完了';
        case 'needs_action': return '要確認';
        case 'payment_required': return '決済待ち';
        case 'shipped': return '発送済み';
        case 'cancelled': return 'キャンセル';
        default: return '不明';
    }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const style = status && statusStyles[status] ? statusStyles[status] : 'bg-gray-100 text-gray-800 border-gray-300';

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${style}`}>
            {getStatusLabel(status)}
        </span>
    );
};
