'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CartManager({ initialItems, initialOrders }: { initialItems: any[], initialOrders: any[] }) {
    const [items, setItems] = useState(initialItems)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleRequestOrder() {
        setLoading(true)
        try {
            // 1. ユーザー情報の取得
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                alert('ログインユーザー情報が取得できませんでした')
                return
            }

            // 2. ordersテーブルへの注文作成
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    status: 'pending'
                })
                .select()
                .single()

            if (orderError) {
                console.error('注文作成エラー:', orderError)
                alert('注文の作成に失敗しました: ' + orderError.message)
                return
            }

            // 3. itemsテーブルのステータス更新
            if (order) {
                const { error: itemsError } = await supabase
                    .from('items')
                    .update({ status: 'ordered', order_id: order.id })
                    .eq('user_id', user.id)
                    .eq('status', 'draft')

                if (itemsError) {
                    console.error('アイテム更新エラー:', itemsError)
                    alert('アイテムの更新に失敗しました: ' + itemsError.message)
                    return
                }

                // 成功時の処理
                setItems([])
                router.refresh()
            }
        } catch (err) {
            console.error('予期せぬエラー:', err)
            alert('処理中に予期せぬエラーが発生しました')
        } finally {
            // 成功・失敗にかかわらず必ずローディング状態を解除
            setLoading(false)
        }
    }

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">カート内の商品</h2>
                {items.length > 0 && (
                    <button
                        onClick={handleRequestOrder}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? '依頼中...' : '依頼する'}
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="border p-4 rounded flex justify-between items-center bg-white shadow-sm">
                        <div>
                            <p className="font-bold">{item.title}</p>
                            <p className="text-sm text-slate-500">{item.url}</p>
                            <p className="text-sm">数量: {item.quantity}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}