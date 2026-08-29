// app/dashboard/page.tsx
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BookmarkletGenerator from '@/components/BookmarkletGenerator';
import { SubmitButton } from '@/components/SubmitButtons';
import CartManager from '@/components/CartManager';
import { StatusBadge } from '@/components/StatusBadge';
import { ItemStatusBadge } from '@/components/ItemStatusBadge';
import { addToCart, replyToAdminNote } from '@/app/actions/items';

function getTrackingUrl(trackingNumber: string): string {
    const cleaned = trackingNumber.replace(/[\s-]/g, '');

    if (/^\d{12}$|^\d{15}$|^\d{20}$/.test(cleaned)) {
        return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(cleaned)}`;
    }

    return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo=${encodeURIComponent(cleaned)}`;
}

export default async function DashboardPage(props: {
    searchParams: Promise<{ url?: string; title?: string }>
}) {
    const searchParams = await props.searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: orders } = await supabase
        .from('orders')
        .select(`
            id,
            order_number,
            status,
            created_at,
            shipping_fee,
            total_amount,
            tracking_number,
            order_items (
                id,
                item_id,
                items (
                    id,
                    title,
                    url,
                    price,
                    desired_price,
                    quantity,
                    admin_quantity,
                    status,
                    remarks,
                    admin_note
                )
            )
        `)
        .eq('user_id', user.id)
        .order('order_number', { ascending: false });

    const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto p-4 max-w-5xl">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">マイページ</h1>
                <form action={async () => {
                    'use server';
                    const supabase = await createClient();
                    await supabase.auth.signOut();
                    redirect('/login');
                }}>
                    <button className="text-sm text-slate-500 hover:text-slate-800">ログアウト</button>
                </form>
            </div>

            {/* 商品追加フォーム */}
            <form action={addToCart} className="my-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                    <input name="url" defaultValue={searchParams.url || ''} placeholder="商品URL" required className="w-full md:w-1/3 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
                    <input name="title" defaultValue={searchParams.title || ''} placeholder="商品名" className="w-full md:w-1/4 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs placeholder:text-slate-400" />
                    <input name="desiredPrice" type="number" placeholder="希望価格(任意)" className="w-full md:w-28 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
                    <input name="quantity" type="number" defaultValue={1} min={1} className="w-full md:w-20 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
                    <SubmitButton pendingText="追加中...">カートに追加</SubmitButton>
                </div>
                <input name="remarks" placeholder="サイズ・カラー・状態などの指定があれば入力してください(任意)" className="w-full p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
            </form>

            <BookmarkletGenerator />

            <CartManager initialItems={items || []} initialOrders={orders || []} />

            <div className="grid gap-4 mt-8">
                <h2 className="text-xl font-bold text-slate-800">依頼済みの注文一覧</h2>
                
                {(!orders || orders.length === 0) ? (
                    <p className="text-slate-500 text-sm">依頼済みの注文はありません。</p>
                ) : (
                    orders.map((order: any) => {
                        const needsAttention = order.order_items?.some((oi: any) => {
                            const targetItem = Array.isArray(oi.items) ? oi.items[0] : oi.items;
                            return targetItem && ['info_required', 'price_changed'].includes(targetItem.status);
                        });

                        const hasInvoice = order.total_amount !== null && order.total_amount !== undefined && Number(order.total_amount) > 0;
                        const hasTracking = Boolean(order.tracking_number && String(order.tracking_number).trim() !== '');
                        const itemCount = order.order_items?.length || 0;

                        const itemsSubtotal = (order.order_items || []).reduce((sum: number, oi: any) => {
                            const item = Array.isArray(oi.items) ? oi.items[0] : oi.items;
                            if (!item || !item.price) return sum;
                            const finalQty = item.admin_quantity !== null && item.admin_quantity !== undefined 
                                ? Number(item.admin_quantity) 
                                : Number(item.quantity || 1);
                            return sum + (Number(item.price) * finalQty);
                        }, 0);

                        return (
                            <details key={order.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm group">
                                <summary className="font-semibold cursor-pointer text-slate-900 flex flex-wrap justify-between items-center gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-800 text-white font-mono text-xs font-bold px-2.5 py-1 rounded">
                                            #{order.order_number ?? '-'}
                                        </span>
                                        <span className="text-sm text-slate-600">
                                            {new Date(order.created_at).toLocaleDateString('ja-JP')} 注文
                                        </span>
                                        <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                            商品数: {itemCount}件
                                        </span>
                                        {needsAttention && (
                                            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                                要確認（ユーザー対応待ち）
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={order.status} />
                                    </div>
                                </summary>

                                <div className="mt-4 border-t pt-4 grid gap-3">
                                    <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-100 rounded border border-slate-200 text-xs">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div>
                                                <span className="text-slate-500 mr-1">商品購入小計:</span>
                                                <span className="font-mono font-bold text-slate-800 text-sm">
                                                    {itemsSubtotal > 0 ? `${itemsSubtotal.toLocaleString()} 円` : '購入待ち/未確定'}
                                                </span>
                                            </div>
                                            {hasInvoice && (
                                                <div className="border-l border-slate-300 pl-4">
                                                    <span className="text-slate-500 mr-1">確定お支払い合計 (送料込):</span>
                                                    <span className="font-mono font-bold text-amber-700 text-sm">
                                                        {Number(order.total_amount).toLocaleString()} 円
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {hasTracking && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-500 mr-1">追跡番号:</span>
                                                <a
                                                    href={getTrackingUrl(order.tracking_number)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline text-sm inline-flex items-center gap-1"
                                                >
                                                    {order.tracking_number}
                                                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {order.order_items && order.order_items.length > 0 ? (
                                        <div className="overflow-x-auto border border-slate-200 rounded">
                                            <table className="min-w-full border-collapse text-xs text-left">
                                                <thead>
                                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                                        <th className="p-2.5">商品名</th>
                                                        <th className="p-2.5 max-w-[180px]">URL</th>
                                                        <th className="p-2.5 w-32">備考(サイズ等)</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">依頼数量</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">確定数量</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">希望価格</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">購入価格(確定)</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">小計</th>
                                                        <th className="p-2.5 w-28 whitespace-nowrap">ステータス</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {order.order_items.map((oi: any, idx: number) => {
                                                        const item = Array.isArray(oi.items) ? oi.items[0] : oi.items;

                                                        if (!item) return null;

                                                        const cartQty = item.quantity ?? 1;
                                                        const adminQty = item.admin_quantity;
                                                        const effectiveQty = adminQty !== null && adminQty !== undefined ? adminQty : cartQty;
                                                        const itemPrice = item.price ? Number(item.price) : 0;
                                                        const rowSubtotal = itemPrice * effectiveQty;
                                                        const isInfoRequired = item.status === 'info_required';

                                                        return (
                                                            <React.Fragment key={item.id || idx}>
                                                                <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isInfoRequired ? 'bg-red-50/50' : ''}`}>
                                                                    <td className="p-2.5 font-medium text-slate-800">
                                                                        {item.title || '名称未設定'}
                                                                    </td>
                                                                    <td className="p-2.5 max-w-[180px] truncate">
                                                                        {item.url ? (
                                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block truncate" title={item.url}>
                                                                                {item.url}
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-slate-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2.5 text-slate-600 text-[11px]" title={item.remarks}>
                                                                        {item.remarks || '-'}
                                                                    </td>
                                                                    <td className="p-2.5 text-center font-mono text-slate-500">
                                                                        {cartQty}
                                                                    </td>
                                                                    <td className="p-2.5 text-center font-mono font-bold">
                                                                        {adminQty !== null && adminQty !== undefined ? (
                                                                            <span className={adminQty !== cartQty ? 'text-amber-600 font-extrabold' : 'text-slate-800'}>
                                                                                {adminQty}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-800">{cartQty}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                                                                        {item.desired_price ? `${Number(item.desired_price).toLocaleString()} 円` : '-'}
                                                                    </td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                                                        {itemPrice > 0 ? `${itemPrice.toLocaleString()} 円` : '-'}
                                                                    </td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                                                        {rowSubtotal > 0 ? `${rowSubtotal.toLocaleString()} 円` : '-'}
                                                                    </td>
                                                                    <td className="p-2.5 whitespace-nowrap">
                                                                        <ItemStatusBadge status={item.status} />
                                                                    </td>
                                                                </tr>

                                                                {/* 管理者からの確認連絡がある場合、返信入力枠を表示 */}
                                                                {isInfoRequired && (
                                                                    <tr className="bg-red-50 border-b border-red-200">
                                                                        <td colSpan={9} className="p-3">
                                                                            <div className="flex flex-col gap-2 bg-white p-2.5 rounded border border-red-200">
                                                                                <div className="flex items-center gap-2 text-xs text-red-700 font-bold">
                                                                                    <span>⚠️ 管理者からの確認事項:</span>
                                                                                    <span className="font-normal text-slate-800">{item.admin_note || '確認事項があります。詳細を指定してください。'}</span>
                                                                                </div>
                                                                                <form action={async (formData) => {
                                                                                    'use server';
                                                                                    const replyRemarks = formData.get('replyRemarks') as string;
                                                                                    if (replyRemarks) {
                                                                                        await replyToAdminNote(item.id, replyRemarks);
                                                                                    }
                                                                                }} className="flex items-center gap-2 mt-1">
                                                                                    <input 
                                                                                        name="replyRemarks" 
                                                                                        defaultValue={item.remarks || ''} 
                                                                                        placeholder="指定内容（サイズ・色など）を記入して返信" 
                                                                                        required 
                                                                                        className="flex-1 p-1.5 border border-slate-300 rounded text-xs text-slate-900"
                                                                                    />
                                                                                    <button type="submit" className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs shadow-sm whitespace-nowrap">
                                                                                        回答を送信
                                                                                    </button>
                                                                                </form>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">商品がありません</p>
                                    )}
                                </div>
                            </details>
                        );
                    })
                )}
            </div>
        </div>
    );
}