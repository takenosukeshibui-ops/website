// app/admin/ClientAdminPage.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { ItemStatusBadge } from '@/components/ItemStatusBadge'
import ItemStatusSelect from '@/components/ItemStatusSelect'
import { 
    sendInvoice, 
    deleteInvoice, 
    shipOrder, 
    deleteShip, 
    updateItemQuantity, 
    updateItemPrice 
} from '@/app/actions/admin'
import { SubmitButton } from '@/components/SubmitButtons'

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
        defaultValue ? String(defaultValue) : ''
    )

    const formattedDisplay = () => {
        if (!rawValue) return ''
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

export default function ClientAdminPage({ orders: initialOrders }: { orders: any[] }) {
    const [orders, setOrders] = useState(initialOrders)
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

    useEffect(() => {
        setOrders(initialOrders)
    }, [initialOrders])

    const toggleOrder = (orderId: string) => {
        setExpandedOrders((prev) => {
            const next = new Set(prev)
            if (next.has(orderId)) next.delete(orderId)
            else next.add(orderId)
            return next
        })
    }

    const calculateOrderStatus = (order: any) => {
        if (order.status === 'shipped') {
            return 'shipped'
        }
        if (order.total_amount !== null && order.total_amount !== undefined && Number(order.total_amount) > 0) {
            return 'payment_required'
        }

        const allStatuses = (order.order_items || []).map((oi: any) => {
            const itemObj = Array.isArray(oi.items) ? oi.items[0] : oi.items
            return itemObj?.status
        }).filter(Boolean)

        if (allStatuses.length === 0) return 'pending'

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

        return 'pending'
    }

    const handleItemStatusUpdated = (orderId: string, itemId: string, newStatus: string) => {
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
    }

    const handleInvoice = async (orderId: string, formData: FormData) => {
        const shippingFee = Number(formData.get('shippingFee')) || 0
        const totalAmount = Number(formData.get('totalAmount')) || 0

        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const tempOrder = { ...order, shipping_fee: shippingFee, total_amount: totalAmount }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )

        await sendInvoice(orderId, shippingFee, totalAmount)
    }

    const handleDeleteInvoice = async (orderId: string) => {
        if (!confirm('請求書データを削除（クリア）しますか？')) return

        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const tempOrder = { ...order, shipping_fee: null, total_amount: null }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )

        await deleteInvoice(orderId)
    }

    // 追跡番号のみの保存/更新ハンドラ
    const handleSaveTracking = async (orderId: string, formData: FormData) => {
        const trackingNumber = (formData.get('trackingNumber') as string) || ''

        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                return { ...order, tracking_number: trackingNumber }
            })
        )

        await shipOrder(orderId, trackingNumber)
    }

    // 発送完了処理（ステータスを shipped に変更）
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
        if (!confirm('追跡番号を削除（クリア）しますか？')) return

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
                        <th className="border border-slate-300 p-2 whitespace-nowrap">注文ID</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap">注文ステータス</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">商品数</th>
                        <th className="border border-slate-300 p-2 min-w-[280px]">請求書発行</th>
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
                        const hasTracking = Boolean(order.tracking_number && String(order.tracking_number).trim() !== '')
                        const isShipped = order.status === 'shipped'

                        return (
                            <React.Fragment key={order.id}>
                                <tr className="hover:bg-slate-50 transition-colors border-t border-slate-300">
                                    <td className="border border-slate-300 p-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleOrder(order.id)}
                                            className="p-1 rounded hover:bg-slate-200 text-slate-600 font-mono text-xs w-6 h-6 flex items-center justify-center"
                                            title={isExpanded ? '商品を閉じる' : '商品を開く'}
                                        >
                                            {isExpanded ? '▼' : '▶'}
                                        </button>
                                    </td>
                                    <td className="border border-slate-300 p-2 font-mono text-xs font-bold">
                                        <span title={order.id}>
                                            {order.id ? `${order.id.split('-')[0]}...` : '-'}
                                        </span>
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="border border-slate-300 p-2 text-center font-medium">
                                        <button
                                            type="button"
                                            onClick={() => toggleOrder(order.id)}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {itemCount} 件
                                        </button>
                                    </td>

                                    {/* 請求書発行エリア */}
                                    <td className="border border-slate-300 p-2">
                                        {hasInvoice ? (
                                            <div className="flex items-center justify-between gap-2 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                <div className="text-xs font-mono text-amber-900">
                                                    <span className="text-slate-500 mr-1">送料:</span>
                                                    {(order.shipping_fee || 0).toLocaleString()}円
                                                    <span className="mx-1 text-slate-300">|</span>
                                                    <span className="text-slate-500 mr-1">合計:</span>
                                                    <span className="font-bold text-amber-700">{(order.total_amount || 0).toLocaleString()}円</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteInvoice(order.id)}
                                                    className="text-[10px] text-rose-600 hover:underline font-medium ml-1"
                                                >
                                                    削除
                                                </button>
                                            </div>
                                        ) : (
                                            <form action={handleInvoice.bind(null, order.id)} className="flex items-center gap-1.5">
                                                <CurrencyInput
                                                    name="shippingFee"
                                                    placeholder="送料"
                                                    defaultValue={order.shipping_fee}
                                                    className="border border-slate-300 p-1 rounded text-xs w-20 text-right font-mono"
                                                />
                                                <CurrencyInput
                                                    name="totalAmount"
                                                    placeholder="合計金額"
                                                    defaultValue={order.total_amount}
                                                    className="border border-slate-300 p-1 rounded text-xs w-24 text-right font-mono"
                                                />
                                                <SubmitButton pendingText="...">送信</SubmitButton>
                                            </form>
                                        )}
                                    </td>

                                    {/* 追跡番号エリア */}
                                    <td className="border border-slate-300 p-2">
                                        {hasTracking ? (
                                            <div className="flex items-center justify-between gap-2 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                                                <div className="text-xs font-mono text-emerald-900 font-bold">
                                                    {order.tracking_number}
                                                </div>
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
                                                    onFocus={(e) => {
                                                        const target = e.target
                                                        setTimeout(() => target.select(), 0)
                                                    }}
                                                    className="border border-slate-300 p-1 rounded text-xs w-32"
                                                />
                                                <SubmitButton pendingText="...">保存</SubmitButton>
                                            </form>
                                        )}
                                    </td>

                                    {/* 発送状態（新規列） */}
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
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm transition-colors"
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
                                                <table className="min-w-full border-collapse text-xs text-left">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
                                                            <th className="p-2 font-semibold">商品名</th>
                                                            <th className="p-2 font-semibold">URL</th>
                                                            <th className="p-2 font-semibold w-32">価格</th>
                                                            <th className="p-2 font-semibold w-20 text-center">数量</th>
                                                            <th className="p-2 font-semibold">商品ステータス</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.order_items?.map((oi: any, idx: number) => {
                                                            const item = Array.isArray(oi.items) ? oi.items[0] : oi.items
                                                            if (!item) return null

                                                            return (
                                                                <tr key={item.id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                                    <td className="p-2 font-medium text-slate-800 max-w-[200px] truncate" title={item.title}>
                                                                        {item.title || '名称未設定'}
                                                                    </td>
                                                                    <td className="p-2 max-w-[250px] truncate">
                                                                        {item.url ? (
                                                                            <a
                                                                                href={item.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-blue-600 hover:underline"
                                                                                title={item.url}
                                                                            >
                                                                                {item.url}
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-slate-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <CurrencyInput
                                                                            defaultValue={item.price}
                                                                            placeholder="価格"
                                                                            onValueChange={(val) => {
                                                                                if (val !== item.price) {
                                                                                    handlePriceChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="border border-slate-300 p-1 rounded text-xs w-28 text-right font-mono"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2 text-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            defaultValue={item.quantity || 1}
                                                                            onFocus={(e) => {
                                                                                const target = e.target
                                                                                setTimeout(() => target.select(), 0)
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                const val = Number(e.target.value)
                                                                                if (val !== item.quantity && val > 0) {
                                                                                    handleQuantityChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="border border-slate-300 p-1 rounded text-xs w-14 text-center font-mono"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <ItemStatusBadge status={item.status} />
                                                                            <ItemStatusSelect 
                                                                                item={item} 
                                                                                onStatusChange={(newStatus) => handleItemStatusUpdated(order.id, item.id, newStatus)}
                                                                            />
                                                                        </div>
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