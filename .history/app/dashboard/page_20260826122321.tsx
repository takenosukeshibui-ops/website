import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BookmarkletGenerator from '@/components/BookmarkletGenerator';
import { SubmitButton } from '@/components/SubmitButtons';
import CartManager from '@/components/CartManager';
import { StatusBadge } from '@/components/StatusBadge';
import { ItemStatusBadge } from '@/components/ItemStatusBadge';

// 追跡番号から配送会社URLを判定する関数 (日本郵便 / FedEx)
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

    // 注文一覧を取得 (admin_quantity を追加)
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
                    quantity,
                    admin_quantity,
                    status
                )
            )
        `)
        .eq('user_id', user.id)
        .order('order_number', { ascending: false });

    // ユーザーが所持する全アイテムを取得（カート用）
    const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    async function handleAddToCart(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const url = (formData.get('url') as string) || '';
        const title = (formData.get('title') as string) || '名称未設定';
        const quantityRaw = formData.get('quantity');
        const quantity = quantityRaw ? parseInt(quantityRaw as string) : 1;
        const { data: { user } } = await supabase.auth.getUser();

        if (url && user) {
            await supabase.from('items').insert({
                user_id: user.id,
                url,
                title,
                quantity,
                status: 'draft'
            });
        }
    }

    return (
        <div className="container mx-auto p-4 max-w-4xl">
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
            <form action={handleAddToCart} className="my-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                <input name="url" defaultValue={searchParams.url || ''} placeholder="URL" required className="w-full md:w-1/2 p-2 rounded border border-slate-300 bg-white text-slate-900" />
                <input name="title" defaultValue={searchParams.title || ''} placeholder="商品名" className="w-full md:w-1/4 p-2 rounded border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400" />
                <input name="quantity" type="number" defaultValue={1} className="w-full md:w-24 p-2 rounded border border-slate-300 bg-white text-slate-900" />
                <SubmitButton pendingText="追加中...">カートに追加</SubmitButton>
            </form>

            <BookmarkletGenerator />

            {/* カート管理コンポーネント */}
            <CartManager initialItems={items || []} initialOrders={orders || []} />

            {/* 依頼済みの注文一覧 */}
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

                        // 商品価格の合計金額を算定（単価×最終有効数量）
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
                                    {/* サマリー情報（商品合計 / 請求確定額 / 追跡番号） */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-100 rounded border border-slate-200 text-xs">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div>
                                                <span className="text-slate-500 mr-1">商品小計:</span>
                                                <span className="font-mono font-bold text-slate-800 text-sm">
                                                    {itemsSubtotal > 0 ? `${itemsSubtotal.toLocaleString()} 円` : '計算中'}
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

                                    {/* 注文商品リスト (データベース型テーブル) */}
                                    {order.order_items && order.order_items.length > 0 ? (
                                        <div className="overflow-x-auto border border-slate-200 rounded">
                                            <table className="min-w-full border-collapse text-xs text-left">
                                                <thead>
                                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                                        <th className="p-2.5">商品名</th>
                                                        <th className="p-2.5 max-w-[180px]">URL</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">依頼数量</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">確定数量</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">単価</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">小計</th>
                                                        <th className="p-2.5 w-32 whitespace-nowrap">ステータス</th>
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

                                                        return (
                                                            <tr key={item.id || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                                                                {/* 依頼時数量 */}
                                                                <td className="p-2.5 text-center font-mono text-slate-500">
                                                                    {cartQty}
                                                                </td>
                                                                {/* 管理者変更後の確定数量 */}
                                                                <td className="p-2.5 text-center font-mono font-bold">
                                                                    {adminQty !== null && adminQty !== undefined ? (
                                                                        <span className={adminQty !== cartQty ? 'text-amber-600 font-extrabold' : 'text-slate-800'}>
                                                                            {adminQty} {adminQty !== cartQty && '(変更済)'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-800">{cartQty}</span>
                                                                    )}
                                                                </td>
                                                                {/* 単価（管理者側と同期） */}
                                                                <td className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                                                                    {itemPrice > 0 ? `${itemPrice.toLocaleString()} 円` : '-'}
                                                                </td>
                                                                {/* 小計 */}
                                                                <td className="p-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                                                    {rowSubtotal > 0 ? `${rowSubtotal.toLocaleString()} 円` : '-'}
                                                                </td>
                                                                <td className="p-2.5 whitespace-nowrap">
                                                                    <ItemStatusBadge status={item.status} />
                                                                </td>
                                                            </tr>
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