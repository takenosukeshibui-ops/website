// components/CartManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { createOrderFromCart, deleteCartItem } from '@/app/actions/cart'
import { updateCartItem } from '@/app/actions/items'

export default function CartManager({ 
    initialItems, 
    initialOrders,
    userProfile
}: { 
    initialItems: any[]; 
    initialOrders: any[];
    userProfile?: any;
}) {
    const filterCartItems = (items: any[]) => {
        return (items || []).filter(item => !item.status || item.status === 'draft')
    }

    const [items, setItems] = useState<any[]>(() => filterCartItems(initialItems))
    const [loading, setLoading] = useState(false)

    const sanitizeShipping = (val?: string) => {
        const validMethods = [
            '最安プラン自動選択 (航空便)',
            'FedEx International Connect Plus',
            'FedEx International Priority',
            'FedEx International Economy',
            'FedEx International First',
            'FedEx International Priority Freight (68kg超)',
            'FedEx International Economy Freight (68kg超)',
            '船便'
        ];
        if (val && validMethods.includes(val)) {
            return val;
        }
        if (val === '船便') return '船便';
        return '最安プラン自動選択 (航空便)';
    }

    const [shippingMethod, setShippingMethod] = useState<string>(() => 
        sanitizeShipping(userProfile?.default_shipping_method)
    )
    const [paymentMethod, setPaymentMethod] = useState<string>(
        userProfile?.default_payment_method || 'Wise'
    )

    // 初回読み込み時のみ反映（削除操作時の不要な自動書き戻しを防止）
    useEffect(() => {
        if (initialItems) {
            setItems(filterCartItems(initialItems))
        }
    }, [initialItems?.length])

    useEffect(() => {
        if (userProfile?.default_shipping_method) {
            setShippingMethod(sanitizeShipping(userProfile.default_shipping_method))
        }
        if (userProfile?.default_payment_method) {
            setPaymentMethod(userProfile.default_payment_method)
        }
    }, [userProfile])

    const cartItems = items;

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;
        
        const confirmed = window.confirm(
            `【選択内容の確認】\n` +
            `・配送方法: ${shippingMethod}\n` +
            `・決済方法: ${paymentMethod}\n\n` +
            `カート内の ${cartItems.length} 件の商品で購入依頼を送信しますか？`
        );
        if (!confirmed) return;

        setLoading(true);
        try {
            const itemIds = cartItems.map(item => item.id);
            await createOrderFromCart(itemIds, shippingMethod, paymentMethod);
        } catch (e: any) {
            console.error(e);
            alert('エラーが発生しました: ' + (e.message || '不明なエラー'));
        } finally {
            setLoading(false);
        }
    };

    // 削除処理
    const handleDelete = async (itemId: string) => {
        if (!window.confirm('この商品をカートから削除しますか？')) return;
        
        // 画面上から即座に除外
        const previousItems = items;
        setItems(prev => prev.filter(item => item.id !== itemId));
        
        try {
            // DB削除を実行
            await deleteCartItem(itemId);
        } catch (e: any) {
            // 失敗時は元の画面状態へ書き戻し、エラー詳細を表示
            setItems(previousItems);
            alert('削除失敗: ' + (e?.message || '不明なエラーが発生しました'));
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 my-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-slate-800">カート内の商品 ({cartItems.length})</h2>
            
            {cartItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">カートに商品はありません。</p>
            ) : (
                <div className="space-y-4">
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

                    <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">配送方法:</label>
                                <select 
                                    value={shippingMethod} 
                                    onChange={(e) => setShippingMethod(e.target.value)}
                                    className="border border-slate-300 rounded p-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                >
                                    <option value="最安プラン自動選択 (航空便)">最安プラン自動選択 (航空便 - 約2〜6営業日)</option>
                                    <option value="FedEx International Connect Plus">FedEx International Connect Plus (FICP - 約2〜4営業日)</option>
                                    <option value="FedEx International Priority">FedEx International Priority (FIP - 約1〜3営業日)</option>
                                    <option value="FedEx International Economy">FedEx International Economy (FIE - 約4〜6営業日)</option>
                                    <option value="FedEx International First">FedEx International First (FIF - 約1〜2営業日)</option>
                                    <option value="FedEx International Priority Freight (68kg超)">FedEx International Priority Freight (68kg超大型貨物 - 約2〜4営業日)</option>
                                    <option value="FedEx International Economy Freight (68kg超)">FedEx International Economy Freight (68kg超大型貨物 - 約4〜7営業日)</option>
                                    <option value="船便">日本郵便 (船便 - 約1〜3か月)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">決済方法:</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="border border-slate-300 rounded p-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                >
                                    <option value="Wise">Wise（銀行振込）</option>
                                    <option value="CreditCard">クレジットカード</option>
                                    <option value="PayPal">PayPal</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap w-full md:w-auto shadow-sm"
                        >
                            {loading ? '送信中...' : '購入依頼を送信する'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}