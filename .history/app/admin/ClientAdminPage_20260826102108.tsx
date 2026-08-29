// app/admin/ClientAdminPage.tsx
'use client'

import React, { useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { ItemStatusBadge } from '@/components/ItemStatusBadge'
import ItemStatusSelect from '@/components/ItemStatusSelect'
import { sendInvoice, shipOrder, updateItemQuantity, updateItemPrice } from '@/app/actions/admin'
import { SubmitButton } from '@/components/SubmitButtons'

// 000,000円 表記と入力を切り替えるカスタムインプットコンポーネント
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

    // 表示用のフォーマット処理 (例: 1000000 -> 1,000,000 円)
    const formattedDisplay = () => {
        if (!rawValue) return ''
        const num = Number(rawValue)
        if (isNaN(num)) return rawValue
        return `${num.toLocaleString()} 円`
    }

    return (
        <>
            {/* フォーム送信用 (Server Actions用) の隠しフィールド */}
            {name && <input type="hidden" name={name} value={rawValue} />}

            <input
                type={isFocused ? 'number' : 'text'}
                value={isFocused ? rawValue : formattedDisplay()}
                placeholder={placeholder}
                onFocus={(e) => {
                    setIsFocused(true)
                    // クリック時にテキストを全選択して上書きしやすくする
                    e.target.select()
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

export default function ClientAdminPage({ orders }: { orders: any[] }) {
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

    const toggleOrder = (orderId: string) => {
        setExpandedOrders((prev) => {
            const next = new Set(prev)
            if (next.has(orderId)) {
                next.delete(orderId)
            } else {
                next.add(orderId)
            }
            return next
        })
    }

    // 請求書送信ハンドラ
    const handleInvoice = async (orderId: string, formData: FormData) => {
        const shippingFee = Number(formData.get('shippingFee')) || 0
        const totalAmount = Number(formData.get('totalAmount')) || 0
        await sendInvoice(orderId, shippingFee, totalAmount)
    }

    // 発送完了ハンドラ
    const handleShip = async (orderId: string, formData: FormData) => {
        const trackingNumber = (formData.get('trackingNumber') as string) || ''
        await shipOrder(orderId, trackingNumber)
    }

    // 価格変更ハンドラ
    const handlePriceChange = async (itemId: string, newPrice: number) => {
        try {
            await updateItemPrice(itemId, newPrice)
        } catch (e: any) {
            alert('価格の更新に失敗しました: ' + (e?.message || '不明なエラー'))
        }
    }

    // 数量変更ハンドラ
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
                        <th className="border border-slate-300 p-2 min-w-[200px]">追跡番号追加</th>
                    </tr>
                </thead>
                <tbody>
                    {orders?.map((order) => {
                        if (!order) return null
                        const isExpanded = expandedOrders.has(order.id)
                        const itemCount = order.order_items?.length || 0

                        return (
                            <React.Fragment key={order.id}>
                                {/* 注文情報の親行 */}
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
                                    <td className="border border-slate-300 p-2">
                                        <form action={handleInvoice.bind(null, order.id)} className="flex items-center gap-2">
                                            {/* 送料 */}
                                            <CurrencyInput
                                                name="shippingFee"
                                                placeholder="送料"
                                                defaultValue={order.shipping_fee}
                                                className="border border-slate-300 p-1 rounded text-xs w-24 text-right font-mono"
                                            />
                                            {/* 合計金額 */}
                                            <CurrencyInput
                                                name="totalAmount"
                                                placeholder="合計金額"
                                                defaultValue={order.total_amount}
                                                className="border border-slate-300 p-1 rounded text-xs w-28 text-right font-mono"
                                            />
                                            <SubmitButton pendingText="送信中...">請求書送信</SubmitButton>
                                        </form>
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        <form action={handleShip.bind(null, order.id)} className="flex items-center gap-2">
                                            <input
                                                name="trackingNumber"
                                                placeholder="追跡番号"
                                                defaultValue={order.tracking_number || ''}
                                                onFocus={(e) => e.target.select()}
                                                className="border border-slate-300 p-1 rounded text-xs w-32"
                                            />
                                            <SubmitButton pendingText="処理中...">発送完了</SubmitButton>
                                        </form>
                                    </td>
                                </tr>

                                {/* アコーディオン展開部分：商品一覧の子テーブル */}
                                {isExpanded && (
                                    <tr className="bg-slate-50/70">
                                        <td colSpan={6} className="border border-slate-300 p-4 pl-12">
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
                                                                    {/* 商品名 */}
                                                                    <td className="p-2 font-medium text-slate-800 max-w-[200px] truncate" title={item.title}>
                                                                        {item.title || '名称未設定'}
                                                                    </td>
                                                                    {/* URL */}
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
                                                                    {/* 価格 */}
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
                                                                    {/* 数量 */}
                                                                    <td className="p-2 text-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            defaultValue={item.quantity || 1}
                                                                            onFocus={(e) => e.target.select()}
                                                                            onBlur={(e) => {
                                                                                const val = Number(e.target.value)
                                                                                if (val !== item.quantity && val > 0) {
                                                                                    handleQuantityChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="border border-slate-300 p-1 rounded text-xs w-14 text-center font-mono"
                                                                        />
                                                                    </td>
                                                                    {/* 商品ステータス */}
                                                                    <td className="p-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <ItemStatusBadge status={item.status} />
                                                                            <ItemStatusSelect item={item} />
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