// components/CartManager.tsx
'use client'

import { useState } from 'react'
import { createOrderFromCart } from '@/app/actions/cart'
import { updateCartItem, deleteItem } from '@/app/actions/items'

export default function CartManager({ 
    initialItems, 
    initialOrders 
}: { 
    initialItems: any[]; 
    initialOrders: any[] 
}) {
    const cartItems = initialItems.filter(item => item.status === 'draft');
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;
        
        const confirmed = window.confirm(`カート内の ${cartItems.length} 件の商品で購入依頼を送信しますか？`);
        if (!confirmed) return;

        setLoading(true);
        try {
            const itemIds = cartItems.map(item => item.id);
            await createOrderFromCart(itemIds);
        } catch (e: any) {
            console.error(e);
            alert('エラーが発生しました: ' + (e.message || '不明なエラー'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!window.confirm('この商品をカートから削除しますか？')) return;
        await deleteItem(itemId);
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 my-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-slate-800">カート内の商品 ({cartItems.length})</h2>
            
            {cartItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">カートに商品はありません。</p>
            ) : (
                <div className="space-y-3">
                    <div className="overflow-x-auto border border-slate-200 rounded">
                        <table className="min-w-full border-collapse text-xs text-left">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                    <th className="p-2">商品名</th>
                                    <th className="p-2 max-w-[150px]">URL</th>
                                    <th className="p-2 min-w-[120px]">備考(サイズ等)</th>
                                    <th className="p-2 text-center w-16">数量</th>
                                    <th className="p-2 text-right w-24">希望価格</th>
                                    <th className="p-2 text-center w-16">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cartItems.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-2 font-medium text-slate-800">{item.title || '名称未設定'}</td>
                                        <td className="p-2 max-w-[150px] truncate">
                                            {item.url ? (
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    {item.url}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 text-slate-600 truncate max-w-[150px]" title={item.remarks}>
                                            {item.remarks || '-'}
                                        </td>
                                        <td className="p-2 text-center">
                                            <input
                                                type="number"
                                                min={1}
                                                defaultValue={item.quantity || 1}
                                                onBlur={async (e) => {
                                                    const val = Number(e.target.value)
                                                    if (val > 0 && val !== item.quantity) {
                                                        await updateCartItem(item.id, val, item.desired_price, item.remarks)
                                                    }
                                                }}
                                                className="border border-slate-300 p-1 rounded text-xs w-12 text-center font-mono"
                                            />
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                            {item.desired_price ? `${Number(item.desired_price).toLocaleString()} 円` : '-'}
                                        </td>
                                        <td className="p-2 text-center">
                                            <button type="button" onClick={() => handleDelete(item.id)} className="text-rose-600 hover:underline text-[11px]">
                                                削除
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? '送信中...' : '購入依頼を送信する'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}