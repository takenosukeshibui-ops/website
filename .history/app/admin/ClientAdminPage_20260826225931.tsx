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
    updateItemQuantity,
    updateItemPrice,
    updateTrackingNumber,
    updateAdminNote,
    cancelAdminNote,
    updateOrderStatusToPaymentRequired,
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

// Wise の請求作成画面オープン ＆ 情報自動コピーボタン
function WiseInvoiceLinkButton({ order }: { order: any }) {
    const wiseEmail = order.profiles?.wise_email || ''
    const amount = order.total_amount || 0
    const orderNumber = order.order_number ?? ''

    const handleOpenWise = () => {
        if (!amount || amount <= 0) {
            alert('請求金額（合計金額）が入力されていません。')
            return
        }

        const copyText = `${wiseEmail}\n${orderNumber}\n${amount}`
        navigator.clipboard.writeText(copyText)

        alert(
            `✅ 以下の請求情報をクリップボードにコピーしました！\n\n` +
            `------------------------\n` +
            `${copyText}\n` +
            `------------------------\n\n` +
            `Wiseの画面が開いたら、上記内容を元に請求を作成してください。`
        )

        window.open('https://wise.com/flows/create-invoice/?utm_source=requested_payments_list#/create', '_blank')
    }

    return (
        <div className="flex flex-col items-end gap-0.5">
            <button
                type="button"
                onClick={handleOpenWise}
                title={wiseEmail ? `宛先: ${wiseEmail}` : 'Wiseメールアドレス未登録'}
                className="px-2 py-1 bg-[#00B9FF] hover:bg-[#0099D6] text-white text-xs font-bold rounded shadow-sm transition-colors whitespace-nowrap"
            >
                Wiseで請求作成 ↗
            </button>
            {wiseEmail && (
                <span className="text-[10px] text-slate-400 font-mono">
                    {wiseEmail}
                </span>
            )}
        </div>
    )
}

// 連絡欄を管理するサブコンポーネント
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

// ★注文ステータスの計算ロジックをコンポーネントの外に出して関数化
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
    // ★初期表示時にも注文ステータスを計算して適用する
    const [orders, setOrders] = useState(() => 
        initialOrders.map(order => ({
            ...order,
            status: calculateOrderStatus(order)
        }))
    )
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

    useEffect(() => {
        // ★保存ボタン等でデータが再読み込みされた時も必ず計算を適用する
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

    const handleItemStatusUpdated = async (orderId: string, itemId: string, newStatus: string) => {
        // 先に画面の見た目だけを更新
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

        // データベースにもステータス変更を保存する
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

    // 金額の保存処理（注文ステータスの変更は一切行わない）
    const handleInvoice = async (orderId: string, formData: FormData) => {
        const shippingFee = Number(formData.get('shippingFee')) || 0
        const totalAmount = Number(formData.get('totalAmount')) || 0

        // 画面の金額だけを先に更新（ステータスが巻き戻るのを防ぐ）
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                return { ...order, shipping_fee: shippingFee, total_amount: totalAmount }
            })
        )

        await sendInvoice(orderId, shippingFee, totalAmount)
    }

    // Wise等で送信完了したことを確認して「決済待ち」にする関数
    const handleMarkAsPaymentRequired = async (order: any) => {
        if (!order.total_amount || order.total_amount <= 0) {
            alert('請求金額（合計金額）を入力して保存してください。')
            return
        }

        setOrders((prevOrders) =>
            prevOrders.map((o) => {
                if (o.id !== order.id) return o
                return { ...o, status: 'payment_required' }
            })
        )

        await updateOrderStatusToPaymentRequired(order.id)
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
                const tempOrder = { ...order, tracking_number: null, status: 'pending' }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )

        await deleteShip(orderId)
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
                        <th className="border border-slate-300 p-2 min-w-[340px]">請求書発行</th>
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

                                    <td className="border border-slate-300 p-2">
                                        {hasInvoice ? (
                                            <div className="flex flex-col gap-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-xs font-mono text-amber-900">
                                                        <span className="text-slate-500 mr-1">送料:</span>
                                                        {(order.shipping_fee || 0).toLocaleString()}円
                                                        <span className="mx-1 text-slate-300">|</span>
                                                        <span className="text-slate-500 mr-1">合計:</span>
                                                        <span className="font-bold text-amber-700">{(order.total_amount || 0).toLocaleString()}円</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <WiseInvoiceLinkButton order={order} />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteInvoice(order.id)}
                                                            className="text-[10px] text-rose-600 hover:underline font-medium"
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Wise送信完了ボタン（未決済時のみ表示） */}
                                                {!isPaymentRequired && !isShipped && (
                                                    <div className="pt-1 border-t border-amber-200/60 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMarkAsPaymentRequired(order)}
                                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs shadow-sm transition-colors whitespace-nowrap"
                                                        >
                                                            ✓ Wise送信完了 (決済待ちへ)
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <form action={handleInvoice.bind(null, order.id)} className="flex items-center gap-1.5">
                                                <CurrencyInput
                                                    name="shippingFee"
                                                    placeholder="送料"
                                                    defaultValue={order.shipping_fee}
                                                    className="border border-slate-300 p-1 rounded text-xs w-16 text-right font-mono"
                                                />
                                                <CurrencyInput
                                                    name="totalAmount"
                                                    placeholder="合計金額"
                                                    defaultValue={order.total_amount}
                                                    className="border border-slate-300 p-1 rounded text-xs w-20 text-right font-mono"
                                                />
                                                <SubmitButton pendingText="...">保存</SubmitButton>
                                                <WiseInvoiceLinkButton order={order} />
                                            </form>
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
                                                    onClick={() => handleDeleteShip(order.id)}
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
                                        <td colSpan={7} className="border border-slate-300 p-4 pl-12">
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