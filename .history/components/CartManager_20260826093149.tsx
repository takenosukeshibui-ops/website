'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

// itemsの型を定義
type Item = {
    id: string
    title: string | null
    url: string
    quantity: number
    status: string
}

export default function CartManager({ initialItems }: { initialItems: Item[] }) {
    const [items, setItems] = useState<Item[]>(initialItems)
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

            // 2. 注文作成とアイテム更新をRPCで実行
            const { error: rpcError } = await supabase
                .rpc('place_order', { user_id_input: user.id })

            if (rpcError) {
                console.error('注文処理エラー詳細:', JSON.stringify(rpcError, null, 2))
                alert('注文の作成に失敗しました: ' + rpcError.message)
                return
            }

            // 成功時の処理
            setItems([])
            router.refresh()
        } catch (err) {
            console.error('予期せぬエラー:', err)
            alert('処理中に予期せぬエラーが発生しました')
        } finally {
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
                {items.length === 0 ? (
                    <p className="text-slate-500">カートに商品はありません。</p>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="border p-4 rounded flex justify-between items-center bg-white shadow-sm">
                            <div>
                                <p className="font-bold">{item.title ?? 'タイトルなし'}</p>
                                <p className="text-sm text-slate-500">{item.url}</p>
                                <p className="text-sm">数量: {item.quantity}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}