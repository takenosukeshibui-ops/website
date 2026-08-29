// app/admin/ClientAdminPage.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import ItemStatusSelect from '@/components/ItemStatusSelect'
import {
    sendInvoice,
    deleteInvoice,
    shipOrder,
    deleteShip,
    cancelShip,
    updateItemQuantity,
    updateItemPrice,
    updateTrackingNumber,
    updateAdminNote,
    cancelAdminNote,
    updateOrderStatusToPaymentRequired,
    cancelPaymentRequired,
    updateItemStatus
} from '@/app/actions/admin'
import { SubmitButton } from '@/components/SubmitButtons'

function getTrackingUrl(trackingNumber: string): string {
    const cleaned = trackingNumber.replace(/[\s-]/g, '');
    if (/^\d{12}$|^\d{15}$|^\d{20}$/.test(cleaned)) {
        return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(cleaned)}`;
    }
    return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo=${encodeURIComponent(cleaned)}`;
}

function CurrencyInput({
    defaultValue,
    placeholder,
    className,
    name,
    onValueChange,
}: {
    defaultValue?: number | null
    placeholder?: string
    className?: string
    name?: string
    onValueChange?: (val: number) => void
}) {
    const [isFocused, setIsFocused] = useState(false)
    const [rawValue, setRawValue] = useState<string>(
        defaultValue !== null && defaultValue !== undefined ? String(defaultValue) : ''
    )

    // ★外部からの値変更（自動計算など）に追従するためのフック
    useEffect(() => {
        if (!isFocused) {
            setRawValue(defaultValue !== null && defaultValue !== undefined ? String(defaultValue) : '')
        }
    }, [defaultValue, isFocused])

    const formattedDisplay = () => {
        if (rawValue === '') return ''
        const num = Number(rawValue)
        if (isNaN(num)) return rawValue
        return `${num.toLocaleString()} 円`
    }

    return (
        <>
            {name && <input type="hidden" name={name} value={rawValue} />}

            <input
                type={isFocused ? 'number' : 'text'}
                value={isFocused ? rawValue : formattedDisplay()}
                placeholder={placeholder}
                onFocus={(e) => {
                    setIsFocused(true)
                    const target = e.target
                    setTimeout(() => target.select(), 0)
                }}
                onChange={(e) => setRawValue(e.target.value)}
                onBlur={(e) => {
                    setIsFocused(false)
                    const val = Number(e.target.value)
                    if (onValueChange && !isNaN(val)) {
                        onValueChange(val)
                    }
                }}
                className={className}
            />
        </>
    )
}

// 請求明細を自動計算する関数
function calculateInvoiceDetails(order: any, weight: number) {
    // 1. 商品価格合計 (確定数量 × 確定購入価格)
    let productTotal = 0;
    (order.order_items || []).forEach((oi: any) => {
        const item = Array.isArray(oi.items) ? oi.items[0] : oi.items;
        if (item) {
            const qty = item.admin_quantity ?? item.quantity ?? 1;
            const price = item.price ?? 0;
            productTotal += qty * price;
        }
    });

    // 2. 代理購入手数料 (現状は一律 5%)
    const proxyFeeRate = 0.05;
    const proxyFee = Math.floor(productTotal * proxyFeeRate);

    // =========================================================
    // 3. 送料 (ユーザー作成プログラム組み込み用プレースホルダー)
    // =========================================================
    // ⬇ 後で作成済みのプログラムに置き換えてください ⬇
    let shippingFee = 0;
    if (weight > 0) {
        shippingFee = Math.floor(weight * 2000); // 仮のロジック: 1kg = 2000円
    }
    // ⬆ -------------------------------------------- ⬆
    // =========================================================

    // 4. 手元に残すべき金額 (小計: 送料 + 商品 + 代理手数料)
    const baseAmount = productTotal + proxyFee + shippingFee;

    // =========================================================
    // 5. 決済手数料の逆算 (手元に残る金額が減らないようにする)
    // =========================================================
    // ⬇ PayPalやWiseの手数料率を設定 ⬇
    const paymentFeeRate = 0.036; // 例: 3.6%
    const fixedPaymentFee = 40;   // 例: 40円
    // ⬆ -------------------------- ⬆

    let paymentFee = 0;
    let grandTotal = baseAmount;
    
    if (baseAmount > 0) {
        // 逆算式: 総額 = (小計 + 固定費) / (1 - 手数料率)
        const gross = (baseAmount + fixedPaymentFee) / (1 - paymentFeeRate);
        paymentFee = Math.ceil(gross - baseAmount);
        grandTotal = baseAmount + paymentFee; // 最終請求金額
    }
    // =========================================================

    return {
        productTotal,
        proxyFee,
        shippingFee,
        baseAmount,
        paymentFee,
        grandTotal
    };
}


function AdminNoteForm({
    orderId,
    item,
    onSubmit,
    onCancel
}: {
    orderId: string,
    item: any,
    onSubmit: (orderId: string, itemId: string, note: string) => Promise<void>,
    onCancel: (orderId: string, itemId: string) => Promise<void>
}) {
    const [isEditing, setIsEditing] = useState(false)
    const isNoteActive = item.status === 'info_required'

    if (isNoteActive && !isEditing) {
        return (
            <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-red-600 font-bold">※送信済み (ユーザー返信待ち)</span>
                <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded text-xs whitespace-pre-wrap break-all shadow-inner">
                    {item.admin_note}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-[10px] text-slate-500 hover:text-blue-600 underline transition-colors"
                    >
                        メッセージを修正
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('送信を取り消しますか？')) {
                                await onCancel(orderId, item.id)
                            }
                        }}
                        className="text-[10px] text-slate-500 hover:text-red-600 underline transition-colors"
                    >
                        送信取消
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1.5">
            {!isNoteActive && item.admin_note && (
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded mb-1">
                    <span className="text-[10px] text-slate-500 block mb-0.5 font-bold">過去の送信履歴:</span>
                    <div className="text-[10px] text-slate-600 whitespace-pre-wrap break-all">
                        {item.admin_note}
                    </div>
                </div>
            )}

            <form action={async (formData) => {
                const note = formData.get('adminNote') as string
                if (!note) return
                await onSubmit(orderId, item.id, note)
                setIsEditing(false)
            }}>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 w-full">
                        <input
                            name="adminNote"
                            defaultValue={isEditing ? item.admin_note : ''}
                            placeholder="ユーザーへ確認(例:サイズ等)"
                            className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                            required
                        />
                        <button
                            type="submit"
                            className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[11px] whitespace-nowrap shadow-sm transition-colors"
                        >
                            {isEditing ? '再送信' : '要確認送信'}
                        </button>
                    </div>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 self-start underline"
                        >
                            キャンセル
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}

function calculateOrderStatus(order: any) {
    if (order.status && order.status !== 'pending') {
        return order.status
    }

    const allStatuses = (order.order_items || []).map((oi: any) => {
        const itemObj = Array.isArray(oi.items) ? oi.items[0] : oi.items
        return itemObj?.status
    }).filter(Boolean)

    if (allStatuses.length === 0) return order.status || 'pending'

    if (allStatuses.every((s: string) => ['out_of_stock', 'cancelled'].includes(s))) {
        return 'cancelled'
    }
    if (allStatuses.every((s: string) => s === 'pending')) {
        return 'pending'
    }

    const activeStatuses = allStatuses.filter((s: string) => !['out_of_stock', 'cancelled'].includes(s))
    if (activeStatuses.length > 0) {
        if (activeStatuses.every((s: string) => s === 'in_warehouse')) {
            return 'calculating'
        }
        if (activeStatuses.every((s: string) => ['purchased', 'in_warehouse'].includes(s))) {
            return 'procured'
        }
    }

    return order.status || 'pending'
}

export default function ClientAdminPage({ orders: initialOrders }: { orders: any[] }) {
    const [orders, setOrders] = useState(() => 
        initialOrders.map(order => ({
            ...order,
            status: calculateOrderStatus(order)
        }))
    )
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
    
    // 各注文ごとの「入力された重量」と「手動上書きされた総額」を管理するステート
    const [orderInputs, setOrderInputs] = useState<Record<string, { weight: string, manualTotal?: number }>>({})

    useEffect(() => {
        setOrders(initialOrders.map(order => ({
            ...order,
            status: calculateOrderStatus(order)
        })))
    }, [initialOrders])

    const toggleOrder = (orderId: string) => {
        setExpandedOrders((prev) => {
            const next = new Set(prev)
            if (next.has(orderId)) next.delete(orderId)
            else next.add(orderId)
            return next
        })
    }

    const handleWeightChange = (orderId: string, value: string) => {
        setOrderInputs(prev => ({
            ...prev,
            [orderId]: { ...prev[orderId], weight: value, manualTotal: undefined } // 重量が変更されたら手動総額をリセット
        }))
    }

    const handleTotalChange = (orderId: string, value: number) => {
        setOrderInputs(prev => ({
            ...prev,
            [orderId]: { ...prev[orderId], manualTotal: value }
        }))
    }

    const handleItemStatusUpdated = async (orderId: string, itemId: string, newStatus: string) => {
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const updatedOrderItems = order.order_items.map((oi: any) => {
                    const isArr = Array.isArray(oi.items)
                    const itemObj = isArr ? oi.items[0] : oi.items
                    if (itemObj && itemObj.id === itemId) {
                        const newObj = { ...itemObj, status: newStatus }
                        return { ...oi, items: isArr ? [newObj] : newObj }
                    }
                    return oi
                })
                const tempOrder = { ...order, order_items: updatedOrderItems }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        try {
            await updateItemStatus(itemId, newStatus)
        } catch (error) {
            console.error('DBへのステータス保存に失敗しました:', error)
            alert('ステータスの保存に失敗しました')
        }
    }

    const handleNoteSubmit = async (orderId: string, itemId: string, note: string) => {
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const updatedOrderItems = order.order_items.map((oi: any) => {
                    const isArr = Array.isArray(oi.items)
                    const itemObj = isArr ? oi.items[0] : oi.items
                    if (itemObj && itemObj.id === itemId) {
                        const newObj = { ...itemObj, admin_note: note, status: 'info_required' }
                        return { ...oi, items: isArr ? [newObj] : newObj }
                    }
                    return oi
                })
                const tempOrder = { ...order, order_items: updatedOrderItems }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await updateAdminNote(itemId, note)
    }

    const handleCancelNote = async (orderId: string, itemId: string) => {
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const updatedOrderItems = order.order_items.map((oi: any) => {
                    const isArr = Array.isArray(oi.items)
                    const itemObj = isArr ? oi.items[0] : oi.items
                    if (itemObj && itemObj.id === itemId) {
                        const newObj = { ...itemObj, admin_note: null, status: 'pending' }
                        return { ...oi, items: isArr ? [newObj] : newObj }
                    }
                    return oi
                })
                const tempOrder = { ...order, order_items: updatedOrderItems }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await cancelAdminNote(itemId)
    }

    const handleInvoice = async (orderId: string, formData: FormData) => {
        const shippingFee = Number(formData.get('shippingFee')) || 0
        const totalAmount = Number(formData.get('totalAmount')) || 0

        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                return { ...order, shipping_fee: shippingFee, total_amount: totalAmount }
            })
        )

        await sendInvoice(orderId, shippingFee, totalAmount)
    }

    // ★ Wise に情報をコピーしつつ画面を開き、ステータスも更新する関数
    const handleMarkAsPaymentRequiredWithWise = async (order: any, amount: number) => {
        if (!amount || amount <= 0) {
            alert('請求金額（合計金額）が入力されていません。')
            return
        }

        const wiseEmail = order.profiles?.wise_email || ''
        const orderNumber = order.order_number ?? ''
        
        // クリップボードにコピー
        const copyText = `${wiseEmail}\n${orderNumber}\n${amount}`
        navigator.clipboard.writeText(copyText)

        alert(
            `✅ 以下の請求情報をクリップボードにコピーしました！\n\n` +
            `------------------------\n` +
            `${copyText}\n` +
            `------------------------\n\n` +
            `Wiseの画面が開いたら、上記内容を元に請求を作成してください。`
        )

        // Wise の請求画面を開く
        window.open('https://wise.com/flows/create-invoice/?utm_source=requested_payments_list#/create', '_blank')

        // DB および画面のステータスを「決済待ち」に更新
        setOrders((prevOrders) =>
            prevOrders.map((o) => {
                if (o.id !== order.id) return o
                return { ...o, status: 'payment_required' }
            })
        )
        await updateOrderStatusToPaymentRequired(order.id)
    }

    const handleCancelPaymentRequired = async (order: any) => {
        if (!window.confirm('送信済みの状態を取り消しますか？')) return
        setOrders((prevOrders) =>
            prevOrders.map((o) => {
                if (o.id !== order.id) return o
                const tempOrder = { ...o, status: 'pending' }
                return { 
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder) 
                }
            })
        )
        await cancelPaymentRequired(order.id)
    }

    const handleDeleteInvoice = async (orderId: string) => {
        if (!window.confirm('請求書データを削除（クリア）しますか？')) return
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const tempOrder = { ...order, shipping_fee: null, total_amount: null, status: 'pending' }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await deleteInvoice(orderId)
    }

    const handleSaveTracking = async (orderId: string, formData: FormData) => {
        const trackingNumber = (formData.get('trackingNumber') as string) || ''
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                return { ...order, tracking_number: trackingNumber }
            })
        )
        await updateTrackingNumber(orderId, trackingNumber)
    }

    const handleMarkAsShipped = async (order: any) => {
        setOrders((prevOrders) =>
            prevOrders.map((o) => {
                if (o.id !== order.id) return o
                return { ...o, status: 'shipped' }
            })
        )
        await shipOrder(order.id, order.tracking_number || '')
    }

    const handleDeleteShip = async (orderId: string) => {
        if (!window.confirm('追跡番号を削除（クリア）しますか？')) return
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const tempOrder = { ...order, tracking_number: null, status: 'payment_required' }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await deleteShip(orderId)
    }

    const handleCancelShip = async (orderId: string) => {
        if (!window.confirm('発送済みの状態を取り消しますか？（追跡番号は保持されます）')) return
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const tempOrder = { ...order, status: 'payment_required' }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await cancelShip(orderId)
    }

    const handlePriceChange = async (itemId: string, newPrice: number) => {
        try {
            await updateItemPrice(itemId, newPrice)
        } catch (e: any) {
            alert('価格の更新に失敗しました: ' + (e?.message || '不明なエラー'))
        }
    }

    const handleQuantityChange = async (itemId: string, newQuantity: number) => {
        try {
            await updateItemQuantity(itemId, newQuantity)
        } catch (e: any) {
            alert('数量の更新に失敗しました: ' + (e?.message || '不明なエラー'))
        }
    }

    return (
        <div className="p-6 overflow-x-auto">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

            <table className="min-w-full border-collapse border border-slate-300 text-sm text-left bg-white shadow-sm">
                <thead className="bg-slate-100">
                    <tr>
                        <th className="border border-slate-300 p-2 w-10 text-center"></th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">注文No.</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap">注文ステータス</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">商品数</th>
                        {/* ★列を分割 */}
                        <th className="border border-slate-300 p-2 min-w-[100px] text-center">総重量</th>
                        <th className="border border-slate-300 p-2 min-w-[180px]">請求金額</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">請求書送信</th>
                        <th className="border border-slate-300 p-2 min-w-[200px]">追跡番号</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">発送状態</th>
                    </tr>
                </thead>
                <tbody>
                    {orders?.map((order) => {
                        if (!order) return null
                        const isExpanded = expandedOrders.has(order.id)
                        const itemCount = order.order_items?.length || 0

                        const hasInvoice = order.total_amount !== null && order.total_amount !== undefined && Number(order.total_amount) > 0
                        const isPaymentRequired = order.status === 'payment_required'
                        const hasTracking = Boolean(order.tracking_number && String(order.tracking_number).trim() !== '')
                        const isShipped = order.status === 'shipped'

                        const hasInfoRequiredItem = order.order_items?.some((oi: any) => {
                            const item = Array.isArray(oi.items) ? oi.items[0] : oi.items
                            return item?.status === 'info_required'
                        })

                        const inputs = orderInputs[order.id] || { weight: '' }
                        const weightVal = parseFloat(inputs.weight) || 0
                        const details = calculateInvoiceDetails(order, weightVal)
                        const displayTotal = inputs.manualTotal !== undefined ? inputs.manualTotal : details.grandTotal

                        return (
                            <React.Fragment key={order.id}>
                                <tr className="hover:bg-slate-50 transition-colors border-t border-slate-300">
                                    <td className="border border-slate-300 p-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleOrder(order.id)}
                                            className="p-1 rounded hover:bg-slate-200 text-slate-600 font-mono text-xs w-6 h-6 flex items-center justify-center"
                                        >
                                            {isExpanded ? '▼' : '▶'}
                                        </button>
                                    </td>

                                    <td className="border border-slate-300 p-2 font-mono text-xs font-bold text-center text-slate-700">
                                        #{order.order_number ?? '-'}
                                    </td>

                                    <td className="border border-slate-300 p-2">
                                        <StatusBadge status={order.status} />
                                    </td>

                                    <td className="border border-slate-300 p-2 text-center font-medium">
                                        <button
                                            type="button"
                                            onClick={() => toggleOrder(order.id)}
                                            className="text-blue-600 hover:underline block mx-auto"
                                        >
                                            {itemCount} 件
                                        </button>
                                        {hasInfoRequiredItem && (
                                            <div className="mt-1">
                                                <span className="inline-block bg-red-100 text-red-700 border border-red-300 text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse whitespace-nowrap">
                                                    要確認あり
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* ★ 総重量の入力欄を独立した列に */}
                                    <td className="border border-slate-300 p-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="重量"
                                                value={inputs.weight}
                                                onChange={(e) => handleWeightChange(order.id, e.target.value)}
                                                className="border border-slate-300 p-1 rounded text-xs w-16 text-right font-mono outline-blue-400 focus:border-blue-400 transition-colors"
                                            />
                                            <span className="text-[10px] text-slate-500">kg</span>
                                        </div>
                                    </td>

                                    {/* ★ 請求金額の表示・保存列 */}
                                    <td className="border border-slate-300 p-2">
                                        {hasInvoice ? (
                                            <div className="flex flex-col gap-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-xs font-mono text-amber-900 flex items-center gap-2">
                                                        <span>請求金額:</span>
                                                        <span className="font-bold text-amber-700 text-sm">{(order.total_amount || 0).toLocaleString()}円</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteInvoice(order.id)}
                                                        className="text-[10px] text-rose-600 hover:underline font-medium"
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <form action={handleInvoice.bind(null, order.id)} className="flex items-center justify-between gap-2">
                                                <CurrencyInput
                                                    name="totalAmount"
                                                    placeholder="請求金額"
                                                    defaultValue={displayTotal}
                                                    onValueChange={(val) => handleTotalChange(order.id, val)}
                                                    className="border border-amber-300 bg-amber-50 p-1 rounded text-xs w-24 text-right font-mono font-bold text-amber-800 focus:outline-none"
                                                />
                                                <input type="hidden" name="shippingFee" value={details.shippingFee} />
                                                <SubmitButton pendingText="...">保存</SubmitButton>
                                            </form>
                                        )}
                                    </td>

                                    {/* ★ 請求書送信 (Wise) のボタン */}
                                    <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                                        {hasInvoice ? (
                                            isPaymentRequired || isShipped ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-300">
                                                        送信済み
                                                    </span>
                                                    {!isShipped && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelPaymentRequired(order)}
                                                            className="text-[10px] text-slate-400 hover:text-rose-600 hover:underline"
                                                        >
                                                            取消
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkAsPaymentRequiredWithWise(order, order.total_amount)}
                                                    disabled={!(weightVal > 0)}
                                                    title={!(weightVal > 0) ? "総重量を入力してください" : "情報をコピーしてWiseを開く"}
                                                    className={`px-3 py-1 text-white rounded text-xs font-bold shadow-sm transition-colors whitespace-nowrap ${
                                                        weightVal > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed opacity-70'
                                                    }`}
                                                >
                                                    送信 (Wise) ↗
                                                </button>
                                            )
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>

                                    <td className="border border-slate-300 p-2">
                                        {hasTracking ? (
                                            <div className="flex items-center justify-between gap-2 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                                                <a
                                                    href={getTrackingUrl(order.tracking_number)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-mono text-emerald-900 font-bold hover:text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    {order.tracking_number}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteShip(order.id)}
                                                    className="text-[10px] text-rose-600 hover:underline font-medium ml-1"
                                                >
                                                    削除
                                                </button>
                                            </div>
                                        ) : (
                                            <form action={handleSaveTracking.bind(null, order.id)} className="flex items-center gap-1.5">
                                                <input
                                                    name="trackingNumber"
                                                    placeholder="追跡番号を入力"
                                                    defaultValue={order.tracking_number || ''}
                                                    className="border border-slate-300 p-1 rounded text-xs w-32"
                                                />
                                                <SubmitButton pendingText="...">保存</SubmitButton>
                                            </form>
                                        )}
                                    </td>

                                    <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                                        {isShipped ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                    発送済み
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelShip(order.id)}
                                                    className="text-[10px] text-slate-400 hover:text-rose-600 hover:underline"
                                                >
                                                    未発送に戻す
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleMarkAsShipped(order)}
                                                disabled={!(isPaymentRequired && hasTracking)}
                                                title={!(isPaymentRequired && hasTracking) ? "決済待ち状態かつ追跡番号の登録が必要です" : ""}
                                                className={`px-3 py-1 text-white rounded text-xs font-bold shadow-sm transition-colors ${
                                                    isPaymentRequired && hasTracking
                                                        ? 'bg-blue-600 hover:bg-blue-700'
                                                        : 'bg-slate-300 cursor-not-allowed opacity-70'
                                                }`}
                                            >
                                                発送完了
                                            </button>
                                        )}
                                    </td>
                                </tr>

                                {isExpanded && (
                                    <tr className="bg-slate-50/70">
                                        {/* ★列が9つになったので colSpan を 9 に変更 */}
                                        <td colSpan={9} className="border border-slate-300 p-4 pl-12">
                                            <div className="bg-white border border-slate-200 rounded shadow-inner p-4 mb-4">
                                                <h4 className="text-xs font-bold text-slate-600 mb-3 border-b border-slate-200 pb-1 flex justify-between items-center">
                                                    <span>■ 請求明細・自動計算パネル</span>
                                                    {!hasInvoice && <span className="text-[10px] text-amber-600 font-normal">※メイン行で重量を入力すると自動計算されます</span>}
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">商品価格合計</span>
                                                        <span className="text-sm font-mono text-slate-800">{details.productTotal.toLocaleString()} 円</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">代理手数料 (5%)</span>
                                                        <span className="text-sm font-mono text-slate-800">{details.proxyFee.toLocaleString()} 円</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">総重量</span>
                                                        <span className="text-sm font-mono text-blue-600 font-bold">{weightVal > 0 ? `${weightVal} kg` : '-'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">送料 (プログラム)</span>
                                                        <span className="text-sm font-mono text-slate-800">{details.shippingFee.toLocaleString()} 円</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">決済手数料 (逆算)</span>
                                                        <span className="text-sm font-mono text-slate-800">{details.paymentFee.toLocaleString()} 円</span>
                                                    </div>
                                                    <div className="flex flex-col bg-amber-100/50 p-1.5 rounded border border-amber-200 -mt-1 -mb-1 justify-center">
                                                        <span className="text-[10px] text-amber-800 font-bold">請求金額</span>
                                                        <span className="text-base font-mono font-bold text-amber-700">{details.grandTotal.toLocaleString()} 円</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded shadow-inner p-3">
                                                <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                                    注文商品一覧 ({itemCount}件)
                                                </h4>
                                                <table className="min-w-full border-collapse border border-slate-200 text-xs text-left">
                                                    <thead>
                                                        <tr className="bg-slate-100 text-slate-700">
                                                            <th className="border border-slate-200 p-2 font-semibold">商品名</th>
                                                            <th className="border border-slate-200 p-2 font-semibold">URL</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-24">備考(サイズ等)</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-16 text-center">依頼数量</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-16 text-center">確定数量</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-24 text-right">希望価格</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-28 text-right">購入価格(確定)</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-32">ステータス</th>
                                                            <th className="border border-slate-200 p-2 font-semibold min-w-[200px]">連絡欄 (ユーザーへ確認)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.order_items?.map((oi: any, idx: number) => {
                                                            const item = Array.isArray(oi.items) ? oi.items[0] : oi.items
                                                            if (!item) return null

                                                            const cartQty = item.quantity ?? 1
                                                            const adminQty = item.admin_quantity

                                                            return (
                                                                <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="border border-slate-200 p-2 font-medium text-slate-800 max-w-[150px] truncate" title={item.title}>
                                                                        {item.title || '名称未設定'}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 max-w-[150px] truncate">
                                                                        {item.url ? (
                                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                                                                                {item.url}
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-slate-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-xs text-slate-600 max-w-[120px] truncate" title={item.remarks}>
                                                                        {item.remarks || '-'}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-center font-mono text-slate-500">
                                                                        {cartQty}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            defaultValue={adminQty ?? cartQty}
                                                                            onFocus={(e) => {
                                                                                const target = e.target
                                                                                setTimeout(() => target.select(), 0)
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                const val = Number(e.target.value)
                                                                                if (val !== adminQty && val > 0) {
                                                                                    handleQuantityChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="border border-slate-300 p-1 rounded text-xs w-12 text-center font-mono font-bold"
                                                                        />
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-right font-mono text-slate-500">
                                                                        {item.desired_price ? `${Number(item.desired_price).toLocaleString()} 円` : '-'}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-right">
                                                                        <CurrencyInput
                                                                            defaultValue={item.price}
                                                                            placeholder="落札/購入額"
                                                                            onValueChange={(val) => {
                                                                                if (val !== item.price) {
                                                                                    handlePriceChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="border border-slate-300 p-1 rounded text-xs w-24 text-right font-mono"
                                                                        />
                                                                    </td>

                                                                    <td className="border border-slate-200 p-2 align-top">
                                                                        <ItemStatusSelect
                                                                            item={item}
                                                                            onStatusChange={(newStatus) => handleItemStatusUpdated(order.id, item.id, newStatus)}
                                                                        />
                                                                    </td>

                                                                    <td className="border border-slate-200 p-2 align-top">
                                                                        <AdminNoteForm
                                                                            orderId={order.id}
                                                                            item={item}
                                                                            onSubmit={handleNoteSubmit}
                                                                            onCancel={handleCancelNote}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}