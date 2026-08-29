// components/CartManager.tsx
'use client'

import React, { useState } from 'react'
import { updateCartItem, deleteItem } from '@/app/actions/items'
import { createOrderFromCart } from '@/app/actions/orders' // 注文作成のアクション名に合わせて調整してください

export default function CartManager({ 
    initialItems, 
    initialOrders 
}: { 
    initialItems: any[]
    initialOrders: any[] 
}) {
    // カート内の商品（status が draft のもの）
    const draftItems = initialItems.filter((item) => item.status === 'draft')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 購入依頼を送信（確認ダイアログを挟み、完了アラートは削除）
    const handleSubmitOrder = async () => {
        if (draftItems.length === 0) return

        // 送信前の確認確認ダイアログ
        const confirmed = window.confirm(`カート内の ${draftItems.length} 件の商品で購入依頼を送信しますか？`)
        if (!confirmed) return

        setIsSubmitting(true)
        try {
            await createOrderFromCart()
            // 完了後の alert('注文依頼を送信しました。') は削除済み
        } catch (error: any) {
            alert('送信に失敗しました: ' + (error?.message || 'エラーが発生しました'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (itemId: string) => {
        if (!confirm('この商品をカートから削除しますか？')) return
        await deleteItem(itemId)
    }

    return (
        <div className="my-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-slate-800">カート内の商品 ({draftItems.length}件)</h2>

            {draftItems.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">カートに商品はありません。</p>
            ) : (
                <div className="space-y-3">
                    <div className="overflow-x-auto border border-slate-200 rounded">
                        <table className="min-w-full border-collapse text-xs text-left">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                    <th className="p-2">商品名</th>
                                    <th className="p-2 max-w-[180px]">URL</th>
                                    <th className="p-2 text-center w-16">数量</th>
                                    <th className="p-2 text-right w-24">希望価格</th>
                                    <th className="p-2 text-center w-16">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {draftItems.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-2 font-medium text-slate-800">
                                            {item.title || '名称未設定'}
                                        </td>
                                        <td className="p-2 max-w-[180px] truncate">
                                            {item.url ? (
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                                                    {item.url}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 text-center">
                                            <input
                                                type="number"
                                                min={1}
                                                defaultValue={item.quantity || 1}
                                                onBlur={async (e) => {
                                                    const val = Number(e.target.value)
                                                    if (val > 0 && val !== item.quantity) {
                                                        await updateCartItem(item.id, val)
                                                    }
                                                }}
                                                className="border border-slate-300 p-1 rounded text-xs w-12 text-center font-mono"
                                            />
                                        </td>
                                        <td className="p-2 text-right font-mono">
                                            {item.desired_price ? `${Number(item.desired_price).toLocaleString()} 円` : '-'}
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item.id)}
                                                className="text-rose-600 hover:underline text-[11px]"
                                            >
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
                            type="button"
                            onClick={handleSubmitOrder}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded text-xs shadow-sm transition-colors"
                        >
                            {isSubmitting ? '送信中...' : '購入依頼を送信する'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}