// app/admin/ClientAdminPage.tsx (※パスは環境に合わせてください)
'use client'

import { StatusBadge } from '@/components/StatusBadge'
import { ItemStatusBadge } from '@/components/ItemStatusBadge'
import ItemStatusSelect from '@/components/ItemStatusSelect'
import { sendInvoice, shipOrder } from '@/app/actions/admin'
import { SubmitButton } from '@/components/SubmitButtons'

export default function ClientAdminPage({ orders }: { orders: any[] }) {
    // 請求書送信ハンドラ
    const handleInvoice = async (orderId: string, formData: FormData) => {
        const shippingFee = Number(formData.get('shippingFee')) || 0
        const totalAmount = Number(formData.get('totalAmount')) || 0
        await sendInvoice(orderId, shippingFee, totalAmount)
    }

    // 発送完了（追跡番号）ハンドラ
    const handleShip = async (orderId: string, formData: FormData) => {
        const trackingNumber = formData.get('trackingNumber') as string || ''
        await shipOrder(orderId, trackingNumber)
    }

    return (
        <div className="p-6 overflow-x-auto">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            
            <table className="min-w-full border-collapse border border-slate-300 text-sm text-left bg-white shadow-sm">
                <thead className="bg-slate-100">
                    <tr>
                        <th className="border border-slate-300 p-2 whitespace-nowrap">注文ID</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap">注文ステータス</th>
                        <th className="border border-slate-300 p-2 min-w-[200px]">商品名 / URL</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap">価格</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap">数量</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap min-w-[140px]">商品ステータス</th>
                        <th className="border border-slate-300 p-2 min-w-[150px]">請求書発行</th>
                        <th className="border border-slate-300 p-2 min-w-[150px]">追跡番号追加</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order) => {
                        // 万が一、商品がない注文があった場合のフェイルセーフ
                        if (!order.order_items || order.order_items.length === 0) return null;

                        return order.order_items.map((oi: any, idx: number) => {
                            const rowCount = order.order_items.length;
                            const isFirstRow = idx === 0;
                            const item = oi.items;

                            return (
                                <tr key={`${order.id}-${item.id || idx}`} className="hover:bg-slate-50 transition-colors">
                                    {/* 注文の共通情報（最初の商品の行のみ表示し、以降は縦に結合） */}
                                    {isFirstRow && (
                                        <>
                                            <td className="border border-slate-300 p-2 font-mono text-xs" rowSpan={rowCount}>
                                                {/* 長いUUIDの場合は見やすく先頭だけ表示するか、そのまま表示するか調整できます */}
                                                <span title={order.id}>{order.id.split('-')[0]}...</span>
                                            </td>
                                            <td className="border border-slate-300 p-2 align-top" rowSpan={rowCount}>
                                                <StatusBadge status={order.status} />
                                            </td>
                                        </>
                                    )}

                                    {/* 商品単位の情報（毎行表示） */}
                                    <td className="border border-slate-300 p-2 break-all" title={item.title || item.url}>
                                        {item.title || (
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {item.url}
                                            </a>
                                        )}
                                    </td>
                                    <td className="border border-slate-300 p-2 text-right whitespace-nowrap">
                                        {item.price ? `¥${item.price.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="border border-slate-300 p-2 text-center">
                                        {item.quantity}
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        <div className="flex flex-col gap-2 items-start">
                                            <ItemStatusBadge status={item.status} />
                                            <ItemStatusSelect item={item} />
                                        </div>
                                    </td>

                                    {/* アクションフォーム（最初の商品の行のみ表示し、以降は縦に結合） */}
                                    {isFirstRow && (
                                        <>
                                            <td className="border border-slate-300 p-2 align-top" rowSpan={rowCount}>
                                                <form action={handleInvoice.bind(null, order.id)} className="flex flex-col gap-2">
                                                    <input 
                                                        name="shippingFee" 
                                                        type="number" 
                                                        placeholder="送料" 
                                                        defaultValue={order.shipping_fee || ''}
                                                        className="border border-slate-300 p-1.5 rounded text-xs w-full" 
                                                    />
                                                    <input 
                                                        name="totalAmount" 
                                                        type="number" 
                                                        placeholder="合計金額" 
                                                        defaultValue={order.total_amount || ''}
                                                        className="border border-slate-300 p-1.5 rounded text-xs w-full" 
                                                    />
                                                    <SubmitButton pendingText="送信中...">請求書送信</SubmitButton>
                                                </form>
                                            </td>
                                            <td className="border border-slate-300 p-2 align-top" rowSpan={rowCount}>
                                                <form action={handleShip.bind(null, order.id)} className="flex flex-col gap-2">
                                                    <input 
                                                        name="trackingNumber" 
                                                        placeholder="追跡番号" 
                                                        defaultValue={order.tracking_number || ''}
                                                        className="border border-slate-300 p-1.5 rounded text-xs w-full" 
                                                    />
                                                    <SubmitButton pendingText="処理中...">発送完了</SubmitButton>
                                                </form>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            )
                        });
                    })}
                </tbody>
            </table>
        </div>
    )
}