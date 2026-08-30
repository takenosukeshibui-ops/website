// components/StatusBadge.tsx
import React from 'react';

interface StatusBadgeProps {
    status?: string;
    dict?: any; // [UPDATED] オプショナルに変更し、管理画面等で未渡しの際のエラーを防止
}

const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    procured: 'bg-teal-100 text-teal-800 border-teal-300',
    calculating: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    payment_required: 'bg-amber-100 text-amber-800 border-amber-300',
    shipped: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-300',
};

const defaultLabels: Record<string, string> = {
    pending: '依頼済み',
    procured: '買い付け完了',
    calculating: '国際発送準備中',
    payment_required: '決済待ち',
    shipped: '国際発送済み',
    cancelled: 'キャンセル',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, dict }) => {
    const style = status && statusStyles[status] ? statusStyles[status] : 'bg-gray-100 text-gray-800 border-gray-300';
    
    // [UPDATED] dict が渡されている場合は辞書を参照、無ければデフォルト日本語ラベルを返却
    let label = '不明';
    if (status) {
        if (dict?.dashboard?.badge?.status?.[status]) {
            label = dict.dashboard.badge.status[status];
        } else if (defaultLabels[status]) {
            label = defaultLabels[status];
        }
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${style}`}>
            {label}
        </span>
    );
};