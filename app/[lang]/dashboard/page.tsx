// app/[lang]/dashboard/page.tsx
import { getDictionary } from "@/lib/dictionaries";
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BookmarkletGenerator from '@/components/BookmarkletGenerator';
import { SubmitButton } from '@/components/SubmitButtons';
import CartManager from '@/components/CartManager';
import { StatusBadge } from '@/components/StatusBadge';
import { ItemStatusBadge } from '@/components/ItemStatusBadge';
import { TrackingLink } from '@/components/TrackingLink';
import { addToCart, replyToAdminNote } from '@/app/actions/items';

function getTrackingUrl(trackingNumber: string): string {
    const cleaned = trackingNumber.replace(/[\s-]/g, '');

    if (/^\d{12}$|^\d{15}$|^\d{20}$/.test(cleaned)) {
        return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(cleaned)}`;
    }

    return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo=${encodeURIComponent(cleaned)}`;
}

function calculateUserInvoiceDetails(order: any) {
    let productTotal = 0;
    (order.order_items || []).forEach((oi: any) => {
        const item = Array.isArray(oi.items) ? oi.items[0] : oi.items;
        if (item) {
            const qty = item.admin_quantity ?? item.quantity ?? 1;
            const price = item.price ?? 0;
            productTotal += qty * price;
        }
    });

    const proxyFeeRate = 0.05;
    const proxyFee = Math.floor(productTotal * proxyFeeRate);

    const shippingFee = order.shipping_fee !== null && order.shipping_fee !== undefined ? Number(order.shipping_fee) : 0;
    const baseAmount = productTotal + proxyFee + shippingFee;

    const rawPaymentMethod = order.payment_method ? String(order.payment_method).trim().toLowerCase() : '';
    const paymentMethod = rawPaymentMethod === 'wise' ? 'Wise' : 'PayPal';

    let paymentFee = 0;
    let grandTotal = baseAmount;
    let paymentFeeDetail = '';

    if (order.total_amount !== null && order.total_amount !== undefined && Number(order.total_amount) > 0) {
        grandTotal = Number(order.total_amount);
        paymentFee = grandTotal > baseAmount ? grandTotal - baseAmount : 0;

        if (paymentMethod === 'Wise') {
            const effectiveRate = baseAmount > 0 ? ((paymentFee / baseAmount) * 100).toFixed(2) : '0';
            paymentFeeDetail = `API取得 (${effectiveRate}% 相当)`;
        } else {
            paymentFeeDetail = '8.1% + 40円 (海外決済+為替換算)';
        }
    } else if (baseAmount > 0) {
        if (paymentMethod === 'Wise') {
            const wiseFeeRate = 0.036;
            const fixedFee = 40;
            const gross = (baseAmount + fixedFee) / (1 - wiseFeeRate);
            paymentFee = Math.ceil(gross - baseAmount);
            paymentFee = paymentFee > 0 ? paymentFee : 0;
            grandTotal = baseAmount + paymentFee;
            paymentFeeDetail = '3.6% + 40円 (標準試算)';
        } else {
            const paypalFeeRate = 0.081;
            const fixedFee = 40;
            const gross = (baseAmount + fixedFee) / (1 - paypalFeeRate);
            paymentFee = Math.ceil(gross - baseAmount);
            paymentFee = paymentFee > 0 ? paymentFee : 0;
            grandTotal = baseAmount + paymentFee;
            paymentFeeDetail = '8.1% + 40円 (海外決済+為替換算)';
        }
    }

    const resolvedShippingName = order.shipping_method || '最安プラン自動選択 (航空便)';

    return {
        productTotal,
        proxyFee,
        shippingFee,
        baseAmount,
        paymentFee,
        paymentFeeDetail,
        resolvedShippingName,
        grandTotal
    };
}

export default async function DashboardPage(props: {
    params: Promise<{ lang: 'en' | 'ja' }>;
    searchParams: Promise<{ url?: string; title?: string; desiredPrice?: string; quantity?: string; remarks?: string }>
}) {
    const { lang } = await props.params;
    const dict = await getDictionary(lang);
    const searchParams = await props.searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
            id,
            order_number,
            status,
            created_at,
            shipping_fee,
            total_amount,
            tracking_number,
            shipping_method,
            payment_method,
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

    if (ordersError) {
        console.error('注文取得エラー:', ordersError.message);
    }

    const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto p-4 max-w-5xl">
            {/* ヘッダー最上部領域 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{dict?.dashboard?.title || 'ダッシュボード'}</h1>
                    {/* [UPDATED] 連絡先・お届け国のバッジを完全に削除 */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">
                            ログインアカウント: <span className="font-mono font-medium text-slate-700">{user.email}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <Link
                        href="/calculator"
                        target="_blank"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1"
                    >
                        {dict?.dashboard?.shippingCalculator || '送料シミュレーター'}
                    </Link>

                    <Link href={`/${lang}/dashboard/settings`} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">
                        {dict?.dashboard?.accountSettings || 'アカウント設定'}
                    </Link>

                    <form action={async () => {
                        'use server';
                        const supabase = await createClient();
                        await supabase.auth.signOut();
                        redirect(`/${lang}/login`);
                    }}>
                        <button className="text-xs text-slate-500 hover:text-slate-800 underline">{dict?.dashboard?.logout || 'ログアウト'}</button>
                    </form>
                </div>
            </div>

            {/* 商品追加フォーム */}
            <form action={addToCart} className="my-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                    <input name="url" defaultValue={searchParams?.url || ''} placeholder={dict?.dashboard?.form?.urlPlaceholder || 'URL'} required className="w-full md:w-1/3 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
                    <input name="title" defaultValue={searchParams?.title || ''} placeholder={dict?.dashboard?.form?.titlePlaceholder || '商品名'} className="w-full md:w-1/4 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs placeholder:text-slate-400" />
                    <input name="desiredPrice" type="number" defaultValue={searchParams?.desiredPrice || ''} placeholder={dict?.dashboard?.form?.pricePlaceholder || '希望価格'} className="w-full md:w-28 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
                    <input name="quantity" type="number" defaultValue={searchParams?.quantity || 1} min={1} className="w-full md:w-20 p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
                    <SubmitButton pendingText={dict?.dashboard?.form?.addingButton || '追加中...'}>{dict?.dashboard?.form?.addButton || '追加'}</SubmitButton>
                </div>
                <input name="remarks" defaultValue={searchParams?.remarks || ''} placeholder={dict?.dashboard?.form?.remarksPlaceholder || '備考'} className="w-full p-2 rounded border border-slate-300 bg-white text-slate-900 text-xs" />
            </form>

            <BookmarkletGenerator dict={dict} />

            <CartManager dict={dict} initialItems={items || []} initialOrders={orders || []} userProfile={profile} />

            <div className="grid gap-4 mt-8">
                <h2 className="text-xl font-bold text-slate-800">{dict?.dashboard?.orderHistory || '注文履歴'}</h2>

                {(!orders || orders.length === 0) ? (
                    <p className="text-slate-500 text-sm">{dict?.dashboard?.noOrders || '注文はありません'}</p>
                ) : (
                    orders.map((order: any) => {
                        const needsAttention = order.order_items?.some((oi: any) => {
                            const targetItem = Array.isArray(oi.items) ? oi.items[0] : oi.items;
                            return targetItem && ['info_required', 'price_changed'].includes(targetItem.status);
                        });

                        const hasInvoice = (order.total_amount !== null && Number(order.total_amount) > 0) ||
                            (order.shipping_fee !== null && Number(order.shipping_fee) >= 0) ||
                            ['payment_required', 'shipped'].includes(order.status);

                        const hasTracking = Boolean(order.tracking_number && String(order.tracking_number).trim() !== '');
                        const itemCount = order.order_items?.length || 0;

                        const invoiceDetails = calculateUserInvoiceDetails(order);
                        const paymentServiceName = order.payment_method || 'Wise';

                        return (
                            <details key={order.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm group">
                                <summary className="font-semibold cursor-pointer text-slate-900 flex flex-wrap justify-between items-center gap-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="bg-slate-800 text-white font-mono text-xs font-bold px-2.5 py-1 rounded">
                                            #{order.order_number ?? '-'}
                                        </span>
                                        <span className="text-sm text-slate-600">
                                            {new Date(order.created_at).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US')} {dict?.dashboard?.table?.order}
                                        </span>
                                        <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                            {dict?.dashboard?.itemCount} {itemCount}
                                        </span>

                                        <div className="flex items-center gap-1.5 text-xs">
                                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">
                                                {dict?.dashboard?.status?.shipping} {invoiceDetails.resolvedShippingName}
                                            </span>
                                            <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium">
                                                {dict?.dashboard?.status?.payment} {paymentServiceName}
                                            </span>
                                        </div>

                                        {hasTracking && (
                                            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                                                <span className="text-emerald-700 font-bold">{dict?.dashboard?.status?.tracking}</span>
                                                <TrackingLink
                                                    trackingNumber={order.tracking_number}
                                                    trackingUrl={getTrackingUrl(order.tracking_number)}
                                                />
                                            </div>
                                        )}

                                        {needsAttention && (
                                            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                                {dict?.dashboard?.status?.attention}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge dict={dict} status={order.status} />
                                    </div>
                                </summary>

                                <div className="mt-4 border-t pt-4 grid gap-3">
                                    {/* 請求明細パネル */}
                                    {hasInvoice && (
                                        <div className="bg-white border border-slate-200 rounded shadow-inner p-4 mb-4">
                                            <h4 className="text-xs font-bold text-slate-600 mb-3 border-b border-slate-200 pb-1 flex justify-between items-center">
                                                <span>{dict?.dashboard?.invoice?.title}</span>
                                                {!(order.total_amount !== null && Number(order.total_amount) > 0) && (
                                                    <span className="text-[10px] text-amber-600 font-normal">
                                                        {dict?.dashboard?.invoice?.shippingNote}
                                                    </span>
                                                )}
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-500 font-medium">{dict?.dashboard?.invoice?.productTotal}</span>
                                                    <span className="text-sm font-mono text-slate-800">{invoiceDetails.productTotal.toLocaleString()} {lang === 'ja' ? '円' : ''}</span>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-500 font-medium">{dict?.dashboard?.invoice?.proxyFee}</span>
                                                    <span className="text-sm font-mono text-slate-800">{invoiceDetails.proxyFee.toLocaleString()} {lang === 'ja' ? '円' : ''}</span>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                        {dict?.dashboard?.invoice?.shipping} <span className="text-slate-500 font-normal">({invoiceDetails.resolvedShippingName})</span>
                                                    </span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-mono text-slate-800">{invoiceDetails.shippingFee.toLocaleString()} {lang === 'ja' ? '円' : ''}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                        {dict?.dashboard?.invoice?.paymentFee} {paymentServiceName ? <span className="text-slate-400 font-normal">({paymentServiceName})</span> : ''}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-mono text-slate-800">{invoiceDetails.paymentFee.toLocaleString()} {lang === 'ja' ? '円' : ''}</span>
                                                        {invoiceDetails.paymentFeeDetail && (
                                                            <span className="text-[9px] text-slate-500 font-normal">
                                                                {invoiceDetails.paymentFeeDetail}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col bg-amber-100/50 p-1.5 rounded border border-amber-200 -mt-1 -mb-1 justify-center px-2">
                                                    <span className="text-[10px] text-amber-800 font-bold">{dict?.dashboard?.invoice?.grandTotal}</span>
                                                    <span className="text-base font-mono font-bold text-amber-700">{invoiceDetails.grandTotal.toLocaleString()} {lang === 'ja' ? '円' : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 注文商品テーブル */}
                                    {order.order_items && order.order_items.length > 0 ? (
                                        <div className="overflow-x-auto border border-slate-200 rounded">
                                            <table className="min-w-full border-collapse text-xs text-left">
                                                <thead>
                                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                                                        <th className="p-2.5">{dict?.dashboard?.table?.item}</th>
                                                        <th className="p-2.5 max-w-[180px]">{dict?.dashboard?.table?.url}</th>
                                                        <th className="p-2.5 w-32">{dict?.dashboard?.table?.remarks}</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">{dict?.dashboard?.table?.requestedQuantity}</th>
                                                        <th className="p-2.5 text-center whitespace-nowrap">{dict?.dashboard?.table?.confirmedQuantity}</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">{dict?.dashboard?.table?.desiredPrice}</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">{dict?.dashboard?.table?.price}</th>
                                                        <th className="p-2.5 text-right whitespace-nowrap">{dict?.dashboard?.table?.subtotal}</th>
                                                        <th className="p-2.5 w-28 whitespace-nowrap">{dict?.dashboard?.table?.status}</th>
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
                                                                        {item?.title || '名称未設定'}
                                                                    </td>
                                                                    <td className="p-2.5 max-w-[180px] truncate">
                                                                        {item?.url ? (
                                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block truncate" title={item.url}>
                                                                                {item.url}
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-slate-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2.5 text-slate-600 text-[11px]" title={item?.remarks}>
                                                                        {item?.remarks || '-'}
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
                                                                        {item?.desired_price ? `${Number(item.desired_price).toLocaleString()} ${lang === 'ja' ? '円' : ''}` : '-'}
                                                                    </td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                                                        {itemPrice > 0 ? `${itemPrice.toLocaleString()} ${lang === 'ja' ? '円' : ''}` : '-'}
                                                                    </td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                                                                        {rowSubtotal > 0 ? `${rowSubtotal.toLocaleString()} ${lang === 'ja' ? '円' : ''}` : '-'}
                                                                    </td>
                                                                    <td className="p-2.5 whitespace-nowrap">
                                                                        <ItemStatusBadge dict={dict} status={item?.status} />
                                                                    </td>
                                                                </tr>
                                                                {isInfoRequired && (
                                                                    <tr className="bg-red-50 border-b border-red-200">
                                                                        <td colSpan={9} className="p-3">
                                                                            <div className="flex flex-col gap-2 bg-white p-2.5 rounded border border-red-200">
                                                                                <div className="flex items-center gap-2 text-xs text-red-700 font-bold">
                                                                                    <span>{dict?.dashboard?.form?.adminNoteLabel || '⚠️'}</span>
                                                                                    <span className="font-normal text-slate-800">{item?.admin_note || '確認事項があります。詳細を指定してください。'}</span>
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
                                                                                        defaultValue={item?.remarks || ''}
                                                                                        placeholder={dict?.dashboard?.form?.replyPlaceholder || '回答を入力'}
                                                                                        required
                                                                                        className="flex-1 p-1.5 border border-slate-300 rounded text-xs text-slate-900"
                                                                                    />
                                                                                    <button type="submit" className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs shadow-sm whitespace-nowrap">
                                                                                        {dict?.dashboard?.form?.replyButton || '送信'}
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