import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import BookmarkletGenerator from '@/components/BookmarkletGenerator';
import { removeFromCart, createOrder, submitOrder, updateItemQuantity } from '@/app/actions/cart';
import { StatusBadge } from '@/components/StatusBadge';
import { ItemStatusBadge } from '@/components/ItemStatusBadge';
import { SubmitButton, OrderButton, DeleteButton } from '@/components/SubmitButtons';

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

    const cartItems = items?.filter(i => i.status === 'draft') || [];

    const initialData = {
        url: searchParams.url || '',
        title: searchParams.title || ''
    };

    async function handleAddToCart(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const url = (formData.get('url') as string) || '';
        const title = (formData.get('title') as string) || '名称未設定';
        const quantityRaw = formData.get('quantity');
        const quantity = quantityRaw ? parseInt(quantityRaw as string) : 1;
        const { data: { user } } = await supabase.auth.getUser();

        if (!url) {
            console.error('URL is required');
            return;
        }

        if (user) {
            console.log('Adding item to cart:', { user_id: user.id, url, title, quantity });
            const { data, error } = await supabase.from('items').insert({
                user_id: user.id,
                url,
                title,
                quantity,
                status: 'draft'
            });

            if (error) {
                console.error('Failed to add item to cart:', error);
            } else {
                console.log('Item added successfully:', data);
                revalidatePath('/dashboard');
            }
        } else {
            console.warn('Attempted to add item without user session');
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
                <input name="url" defaultValue={initialData.url} placeholder="URL" required className="w-full md:w-1/3 p-2 rounded border border-slate-300 bg-white text-slate-900" />
                <input name="title" defaultValue={initialData.title} placeholder="商品名" className="w-full md:w-1/2 p-2 rounded border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400" />
                <input name="quantity" type="number" defaultValue={1} className="w-full md:w-24 p-2 rounded border border-slate-300 bg-white text-slate-900" />
                <SubmitButton pendingText="追加中...">カートに追加</SubmitButton>
            </form>

            <BookmarkletGenerator />

            <div className="grid gap-4 mb-8">
                <h2 className="text-xl font-bold">カート</h2>
                {cartItems.length === 0 ? (
                    <p className="text-slate-500">カートは空です。</p>
                ) : (
                    <>
                        {cartItems.map((item) => (
                            <div key={item.id} className="p-4 bg-white rounded border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900">{item.title}</p>
                                    <a href={item.url} target="_blank" className="text-sm text-blue-600 hover:underline break-all block">{item.url}</a>
                                </div>
                                <div className="flex items-center gap-4">
                                    <form action={async (formData: FormData) => {
                                        'use server';
                                        const quantity = parseInt(formData.get('quantity') as string);
                                        await updateItemQuantity(item.id, quantity);
                                    }} className="flex items-center gap-2">
                                        <label className="text-sm text-slate-500">数量:</label>
                                        <input name="quantity" type="number" defaultValue={item.quantity} className="w-20 p-1 border rounded" />
                                        <SubmitButton pendingText="更新中...">変更</SubmitButton>
                                    </form>
                                    <form action={removeFromCart.bind(null, item.id)}>
                                        <DeleteButton pendingText="削除中...">削除</DeleteButton>
                                    </form>
                                </div>
                            </div>
                        ))}
                        <form action={async () => {
                            'use server';
                            await submitOrder();
                        }}>
                            <OrderButton pendingText="依頼中...">購入依頼を送信する</OrderButton>
                        </form>
                    </>
                )}
            </div>

            <div className="grid gap-4">
                <h2 className="text-xl font-bold">依頼済みの注文一覧</h2>
                {orders?.map((order: any) => {
                    const needsAttention = order.order_items.some((oi: any) =>
                        ['info_required', 'price_changed'].includes(oi.items.status)
                    );
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
                                {order.shipping_fee && (
                                    <div className="text-sm font-normal text-slate-600">
                                        配送料: {order.shipping_fee?.toLocaleString()}円
                                    </div>
                                )}
                                {order.total_amount && (
                                    <div className="text-sm font-normal text-slate-600">
                                        合計金額: {order.total_amount?.toLocaleString()}円
                                    </div>
                                )}
                                {order.tracking_number && (
                                    <div className="text-sm font-normal text-slate-600">
                                        追跡番号: {order.tracking_number}{' '}
                                        <a href={`https://t.tracking-app.com/${order.tracking_number}`} target="_blank" className="text-blue-600 hover:underline underline">配送状況を確認</a>
                                    </div>
                                )}
                                <StatusBadge status={order.status} />
                            </summary>
                            <div className="mt-4 border-t pt-4 grid gap-2">
                                {order.order_items.map((oi: any) => (
                                    <div key={oi.items.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div>
                                                <p className="font-medium text-slate-800">{oi.items.title}</p>
                                                <a href={oi.items.url} target="_blank" className="text-xs text-blue-600 hover:underline">{oi.items.url}</a>
                                            </div>
                                            <ItemStatusBadge status={oi.items.status} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-slate-500">数量: {oi.items.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    );
                })}
            </div>
        </div>
    );
}
