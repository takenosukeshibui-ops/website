// components/CartManager.tsx
// [UPDATED] 辞書欠損時でもURLから言語を判定し、項目名やセレクトボックス内を強制的に多言語対応
'use client'

import { useState, useEffect } from 'react'
import { createOrderFromCart, deleteCartItem } from '@/app/actions/cart'
import { updateCartItem } from '@/app/actions/items'

export default function CartManager({
    initialItems,
    initialOrders,
    userProfile,
    dict
}: {
    initialItems: any[];
    initialOrders: any[];
    userProfile?: any;
    dict: any;
}) {
    // [NEW] URLのパス、または辞書から英語かどうかを確実に判定するフォールバック
    const isEn = typeof window !== 'undefined' 
        ? window.location.pathname.startsWith('/en') 
        : (dict?.cart?.title === 'Items in Cart');

    const filterCartItems = (items: any[]) => {
        return (items || []).filter(item => item && (!item.status || item.status === 'draft'))
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

        // [UPDATED] 確実な言語判定でダイアログを表示
        const confirmMsg = isEn 
            ? 'Are you sure you want to submit the purchase request?' 
            : '購入依頼を送信しますか？';
        
        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const itemIds = cartItems.map(item => item?.id).filter(Boolean);
            await createOrderFromCart(itemIds, shippingMethod, paymentMethod);
        } catch (e: any) {
            console.error(e);
            alert((isEn ? 'Error: ' : 'エラー: ') + (e.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!itemId) return;
        
        const delMsg = isEn ? 'Are you sure you want to delete this item?' : '削除してもよろしいですか？';
        if (!window.confirm(delMsg)) return;

        const previousItems = items;
        setItems(prev => prev.filter(item => item?.id !== itemId));

        try {
            await deleteCartItem(itemId);
        } catch (e: any) {
            setItems(previousItems);
            alert((isEn ? 'Error: ' : 'エラー: ') + (e?.message || 'Unknown error'));
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 my-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-slate-800">
                {isEn ? 'Items in Cart' : 'カート'} ({cartItems.length})
            </h2>

            {cartItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">{isEn ? 'No items in cart.' : 'カートに商品はありません'}</p>
            ) : (
                <div className="space-y-4">
                    <div className="overflow-x-auto border border-slate-200 rounded">
                        <table className="min-w-full border-collapse text-xs text-left">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                    <th className="p-2">{isEn ? 'Product Name' : '商品名'}</th>
                                    <th className="p-2 max-w-[150px]">URL</th>
                                    <th className="p-2 min-w-[120px]">{isEn ? 'Remarks' : '備考'}</th>
                                    <th className="p-2 text-center w-16">{isEn ? 'Quantity' : '数量'}</th>
                                    <th className="p-2 text-right w-24">{isEn ? 'Desired Price' : '希望価格'}</th>
                                    <th className="p-2 text-center w-16">{isEn ? 'Action' : '操作'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cartItems.map((item) => {
                                    if (!item) return null;
                                    
                                    return (
                                        <tr key={item.id || Math.random()} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-2 font-medium text-slate-800">{item?.title || '-'}</td>
                                            <td className="p-2 max-w-[150px] truncate">
                                                {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.url}</a> : '-'}
                                            </td>
                                            <td className="p-2 text-slate-600 truncate max-w-[150px]">{item.remarks || '-'}</td>
                                            <td className="p-2 text-center">
                                                <input type="number" min={1} defaultValue={item.quantity || 1} onBlur={async (e) => {
                                                    const val = Number(e.target.value)
                                                    if (val > 0 && val !== item.quantity && item.id) {
                                                        await updateCartItem(item.id, val, item.desired_price, item.remarks)
                                                    }
                                                }} className="border border-slate-300 p-1 rounded text-xs w-12 text-center" />
                                            </td>
                                            <td className="p-2 text-right font-mono">
                                                {item.desired_price ? `${Number(item.desired_price).toLocaleString()} ${isEn ? 'JPY' : '円'}` : '-'}
                                            </td>
                                            <td className="p-2 text-center">
                                                {item.id && (
                                                    <button type="button" onClick={() => handleDelete(item.id)} className="text-rose-600 hover:underline text-[11px]">{isEn ? 'Delete' : '削除'}</button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700">{isEn ? 'Shipping Method:' : '配送方法:'}</label>
                                <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} className="border border-slate-300 rounded p-1.5 text-xs bg-white">
                                    {/* DBに保存するvalueは日本語のまま、表示テキストのみ言語で切り替え */}
                                    <option value="最安プラン自動選択 (航空便)">{isEn ? 'Cheapest Auto (Air)' : '最安プラン自動選択 (航空便)'}</option>
                                    <option value="船便">{isEn ? 'Japan Post (Sea)' : '船便'}</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-700">{isEn ? 'Payment Method:' : '決済方法:'}</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="border border-slate-300 rounded p-1.5 text-xs bg-white">
                                    <option value="Wise">Wise</option>
                                    <option value="CreditCard">Credit Card</option>
                                    <option value="PayPal">PayPal</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={handleCheckout} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                            {loading ? (isEn ? 'Submitting...' : '送信中...') : (isEn ? 'Submit Purchase Request' : '購入依頼を送信する')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
