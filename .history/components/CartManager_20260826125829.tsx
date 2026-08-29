'use client'

import { useState } from 'react'
import { createOrderFromCart } from '@/app/actions/cart'
import { SubmitButton } from '@/components/SubmitButtons'

export default function CartManager({ 
    initialItems, 
    initialOrders 
}: { 
    initialItems: any[]; 
    initialOrders: any[] 
}) {
    // ステータスが draft（カート内）のアイテムのみ抽出
    const cartItems = initialItems.filter(item => item.status === 'draft');
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;
        
        // 購入依頼を送信する前の確認ダイアログ
        const confirmed = window.confirm(`カート内の ${cartItems.length} 件の商品で購入依頼を送信しますか？`);
        if (!confirmed) return;

        setLoading(true);
        try {
            const itemIds = cartItems.map(item => item.id);
            await createOrderFromCart(itemIds);
            // 完了時の alert('注文依頼を送信しました。') は削除しました
        } catch (e: any) {
            console.error(e);
            alert('エラーが発生しました: ' + (e.message || '不明なエラー'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 my-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-slate-800">カート内の商品 ({cartItems.length})</h2>
            
            {cartItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">カートに商品はありません。</p>
            ) : (
                <div className="space-y-3">
                    <div className="divide-y border-t border-b">
                        {cartItems.map((item) => (
                            <div key={item.id} className="py-2 flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-medium text-slate-800">{item.title || '名称未設定'}</p>
                                    <p className="text-xs text-slate-400 truncate max-w-xs">{item.url}</p>
                                </div>
                                <span className="text-slate-600 font-mono">x{item.quantity}</span>
                            </div>
                        ))}
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