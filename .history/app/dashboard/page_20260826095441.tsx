import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BookmarkletGenerator from '@/components/BookmarkletGenerator';
import { SubmitButton } from '@/components/SubmitButtons';
import CartManager from '@/components/CartManager';
import { StatusBadge } from '@/components/StatusBadge';
import { ItemStatusBadge } from '@/components/ItemStatusBadge';

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
            status,
            created_at,
            shipping_fee,
            total_amount,
            tracking_number,
            order_items (
                items (
                    id,
                    title,
                    url,
                    quantity,
                    status
                )
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">マイページ</h1>
            <form action={async () => {
                'use server';
                const supabase = await createClient();
                await supabase.auth.signOut();
                redirect('/login');
            }}>
                <button className="text-sm text-slate-500 hover:text-slate-800">ログアウト</button>
            </form>

            <form action={handleAddToCart} className="my-8 p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                <input name="url" defaultValue={searchParams.url || ''} placeholder="URL" required className="w-full md:w-1/2 p-2 rounded border border-slate-300 bg-white text-slate-900" />
                <input name="title" defaultValue={searchParams.title || ''} placeholder="商品名" className="w-full md:w-1/4 p-2 rounded border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400" />
                <input name="quantity" type="number" defaultValue={1} className="w-full md:w-24 p-2 rounded border border-slate-300 bg-white text-slate-900" />
                <SubmitButton pendingText="追加中...">カートに追加</SubmitButton>
            </form>

            <BookmarkletGenerator />

            <CartManager initialItems={items || []} initialOrders={orders || []} />

            <div className="grid gap-4 mt-8">
                <h2 className="text-xl font-bold">依頼済みの注文一覧</h2>
                {orders?.map((order: any) => {
                    // ★ 修正点1: order_items が null だったり、items が配列で返ってきた場合でもエラーにならないように修正
                    const needsAttention = order.order_items?.some((oi: any) => {
                        const item = Array.isArray(oi.items) ? oi.items[0] : oi.items;
                        return item && ['info_required', 'price_changed'].includes(item.status);
                    });

                    return (
                        <details key={order.id} className="p-4 bg-white rounded border border-slate-200 group">
                            <summary className="font-semibold cursor-pointer text-slate-900 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span>注文 {new Date(order.created_at).toLocaleDateString()}</span>
                                    {needsAttention && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                            要確認（ユーザー対応待ち）
                                        </span>
                                    )}
                                </div>
                                <StatusBadge status={order.status} />
                            </summary>
                            <div className="mt-4 border-t pt-4 grid gap-4">
                                {/* ★ 修正点2: .map に オプショナルチェーン (?.) を追加し、配列/null を安全に処理 */}
                                {order.order_items?.map((oi: any, idx: number) => {
                                    const item = Array.isArray(oi.items) ? oi.items[0] : oi.items;
                                    
                                    // 削除された商品など、万が一データがない行はスキップする
                                    if (!item) return null;

                                    return (
                                        <div key={item.id || idx} className="flex flex-col gap-2 p-2 bg-slate-50 rounded">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-800">{item.title || 'タイトルなし'}</p>
                                                    {item.url && (
                                                        <a href={item.url} target="_blank" className="text-xs text-blue-600 hover:underline break-all">
                                                            {item.url}
                                                        </a>
                                                    )}
                                                </div>
                                                <ItemStatusBadge status={item.status} />
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-slate-500">
                                                <p>数量: {item.quantity}</p>
                                                {order.tracking_number && (
                                                    <p>追跡番号: {order.tracking_number}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                                {/* 商品が1つも紐づいていない場合のメッセージ */}
                                {(!order.order_items || order.order_items.length === 0) && (
                                    <p className="text-sm text-slate-500">商品がありません</p>
                                )}
                            </div>
                        </details>
                    );
                })}
            </div>
        </div>
    );
}