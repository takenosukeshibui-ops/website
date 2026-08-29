const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: '依頼済み', color: 'bg-yellow-100 text-yellow-800' },
    procured: { label: '購入完了', color: 'bg-blue-100 text-blue-800' },
    calculating: { label: '国際発送準備中', color: 'bg-purple-100 text-purple-800' },
    payment_required: { label: '決済待ち', color: 'bg-orange-100 text-orange-800' },
    shipped: { label: '国際発送済み', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
}