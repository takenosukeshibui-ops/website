// app/[lang]/admin/ClientAdminPage.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { StatusBadge } from '@/components/StatusBadge'
import ItemStatusSelect from '@/components/ItemStatusSelect'
import {
    sendInvoice,
    deleteInvoice,
    shipOrder,
    deleteShip,
    cancelShip,
    updateItemQuantity,
    updateItemPrice,
    updateItemTitle,
    updateTrackingNumber,
    updateAdminNote,
    cancelAdminNote,
    updateOrderStatusToPaymentRequired,
    cancelPaymentRequired,
    updateItemStatus,
    sendPayPalInvoice
} from '@/app/actions/admin'

function ActionStateButton({ state, pendingText }: { state: 'save' | 'confirm', pendingText: string }) {
    const { pending } = useFormStatus();

    const bgClass = state === 'confirm'
        ? 'bg-blue-600 hover:bg-blue-700'
        : 'bg-slate-700 hover:bg-slate-800';

    const text = state === 'confirm' ? '確定' : '保存';

    return (
        <button
            type="submit"
            disabled={pending}
            className={`px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors text-white ${bgClass} disabled:opacity-50`}
        >
            {pending ? pendingText : text}
        </button>
    )
}

function getTrackingUrl(trackingNumber: string): string {
    const cleaned = trackingNumber.replace(/[\s-]/g, '');
    if (/^\d{12}$|^\d{15}$|^\d{20}$/.test(cleaned)) {
        return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(cleaned)}`;
    }
    return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo=${encodeURIComponent(cleaned)}`;
}

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
        defaultValue !== null && defaultValue !== undefined ? String(defaultValue) : ''
    )

    useEffect(() => {
        if (!isFocused) {
            setRawValue(defaultValue !== null && defaultValue !== undefined ? String(defaultValue) : '')
        }
    }, [defaultValue, isFocused])

    const formattedDisplay = () => {
        if (rawValue === '') return ''
        const num = Number(rawValue)
        if (isNaN(num)) return rawValue
        return `${num.toLocaleString()} 円`
    }

    return (
        <>
            {name && <input type="hidden" name={name} value={rawValue} />}
            <input
                type={isFocused ? 'number' : 'text'}
                value={isFocused ? rawValue : formattedDisplay()}
                placeholder={placeholder}
                onFocus={(e) => {
                    setIsFocused(true)
                    const target = e.target
                    setTimeout(() => target.select(), 0)
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

function calculateInvoiceDetails(
    order: any,
    calculatedFee: number | null,
    hasInvoice: boolean,
    isEditingWeight: boolean,
    wiseQuoteData: { fee: number; rate?: number; sourceCurrency?: string } | null = null
) {
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

    let shippingFee = 0;
    if (calculatedFee !== null && calculatedFee !== undefined) {
        shippingFee = calculatedFee;
    } else if (hasInvoice && !isEditingWeight && order.shipping_fee !== null && order.shipping_fee !== undefined) {
        shippingFee = Number(order.shipping_fee);
    }

    const baseAmount = productTotal + proxyFee + shippingFee;

    const rawPaymentMethod = order.payment_method ? String(order.payment_method).trim().toLowerCase() : '';
    const paymentMethod = rawPaymentMethod === 'wise' ? 'Wise' : 'PayPal';

    let paymentFee = 0;
    let grandTotal = baseAmount;
    let paymentFeeDetail = '';

    if (baseAmount > 0) {
        if (paymentMethod === 'Wise') {
            if (wiseQuoteData !== null && wiseQuoteData.fee !== undefined) {
                paymentFee = wiseQuoteData.fee;
                grandTotal = baseAmount + paymentFee;
                const effectiveRate = ((paymentFee / baseAmount) * 100).toFixed(2);
                paymentFeeDetail = `API取得 (${effectiveRate}% 相当)`;
            } else {
                const wiseFeeRate = 0.036;
                const fixedFee = 40;
                const gross = (baseAmount + fixedFee) / (1 - wiseFeeRate);
                paymentFee = Math.ceil(gross - baseAmount);
                paymentFee = paymentFee > 0 ? paymentFee : 0;
                grandTotal = baseAmount + paymentFee;
                paymentFeeDetail = '3.6% + 40円 (標準試算)';
            }
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

    if (!isEditingWeight && hasInvoice && order.total_amount && calculatedFee === null) {
        grandTotal = Number(order.total_amount);
    }

    return {
        productTotal,
        proxyFee,
        shippingFee,
        baseAmount,
        paymentFee,
        paymentFeeDetail,
        grandTotal
    };
}

function AdminNoteForm({
    orderId,
    item,
    onSubmit,
    onCancel
}: {
    orderId: string,
    item: any,
    onSubmit: (orderId: string, itemId: string, note: string) => Promise<void>,
    onCancel: (orderId: string, itemId: string) => Promise<void>
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const isNoteActive = item?.status === 'info_required'

    if (isNoteActive && !isEditing) {
        return (
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-red-600 font-bold">※送信済み (返信待ち)</span>
                    <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                    >
                        {showHistory ? 'メッセージを隠す ▲' : 'メッセージを表示 ▼'}
                    </button>
                </div>

                {showHistory && (
                    <div className="mt-1 flex flex-col gap-1.5 animate-fadeIn">
                        <div className="bg-red-50 border border-red-200 text-red-800 p-1.5 rounded text-xs whitespace-pre-wrap break-all shadow-inner">
                            {item?.admin_note}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="text-[10px] text-slate-500 hover:text-blue-600 underline"
                            >
                                修正
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (window.confirm('送信を取り消しますか？')) {
                                        await onCancel(orderId, item.id)
                                    }
                                }}
                                className="text-[10px] text-slate-500 hover:text-red-600 underline"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1">
            {!isNoteActive && item?.admin_note && (
                <div className="mb-0.5">
                    <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium"
                    >
                        {showHistory ? '過去の送信履歴を隠す ▲' : '過去の送信履歴を表示 ▼'}
                    </button>
                    {showHistory && (
                        <div className="bg-slate-50 border border-slate-200 p-1.5 rounded mt-1 text-[10px] text-slate-600 whitespace-pre-wrap break-all animate-fadeIn">
                            {item?.admin_note}
                        </div>
                    )}
                </div>
            )}

            <form action={async (formData) => {
                const note = formData.get('adminNote') as string
                if (!note) return
                await onSubmit(orderId, item.id, note)
                setIsEditing(false)
            }}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 w-full">
                        <input
                            name="adminNote"
                            defaultValue={isEditing ? item?.admin_note : ''}
                            placeholder="ユーザーへ確認(サイズ等)"
                            className="w-full p-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500 outline-none"
                            required
                        />
                        <button
                            type="submit"
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[11px] whitespace-nowrap shadow-sm transition-colors"
                        >
                            {isEditing ? '再送信' : '要確認送信'}
                        </button>
                    </div>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 self-start underline"
                        >
                            キャンセル
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}

function calculateOrderStatus(order: any) {
    if (order.status && order.status !== 'pending') {
        return order.status
    }

    const allStatuses = (order.order_items || []).map((oi: any) => {
        const itemObj = Array.isArray(oi.items) ? oi.items[0] : oi.items
        return itemObj?.status
    }).filter(Boolean)

    if (allStatuses.length === 0) return order.status || 'pending'

    if (allStatuses.every((s: string) => ['out_of_stock', 'cancelled'].includes(s))) {
        return 'cancelled'
    }
    if (allStatuses.every((s: string) => s === 'pending')) {
        return 'pending'
    }

    const activeStatuses = allStatuses.filter((s: string) => !['out_of_stock', 'cancelled'].includes(s))
    if (activeStatuses.length > 0) {
        if (activeStatuses.every((s: string) => s === 'in_warehouse')) {
            return 'calculating'
        }
        if (activeStatuses.every((s: string) => ['purchased', 'in_warehouse'].includes(s))) {
            return 'procured'
        }
    }

    return order.status || 'pending'
}

export default function ClientAdminPage({ orders: initialOrders }: { orders: any[] }) {
    const [orders, setOrders] = useState(() =>
        initialOrders.map(order => ({
            ...order,
            status: calculateOrderStatus(order)
        }))
    )
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

    const [orderInputs, setOrderInputs] = useState<Record<string, { weight: string }>>({})
    const [editingWeight, setEditingWeight] = useState<Set<string>>(new Set())

    const [calculatedFees, setCalculatedFees] = useState<Record<string, number>>({})
    const [calculatingOrders, setCalculatingOrders] = useState<Set<string>>(new Set())
    const [calcErrors, setCalcErrors] = useState<Record<string, string>>({})
    const [selectedServiceNames, setSelectedServiceNames] = useState<Record<string, string>>({})

    const [wiseQuoteData, setWiseQuoteData] = useState<Record<string, { fee: number; rate?: number; sourceCurrency?: string }>>({})

    const [activeAddressOrder, setActiveAddressOrder] = useState<any | null>(null)
    const [isGeneratingLabel, setIsGeneratingLabel] = useState<boolean>(false)

    useEffect(() => {
        try {
            const saved = localStorage.getItem('admin_order_weights')
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed && typeof parsed === 'object') {
                    setOrderInputs(parsed)
                }
            }
        } catch (e) {
            console.error('localStorage load error:', e)
        }
    }, [])

    useEffect(() => {
        if (Object.keys(orderInputs).length > 0) {
            try {
                localStorage.setItem('admin_order_weights', JSON.stringify(orderInputs))
            } catch (e) {
                console.error('localStorage save error:', e)
            }
        }
    }, [orderInputs])

    useEffect(() => {
        setOrders(prevOrders => {
            return initialOrders.map(newOrder => {
                const existing = prevOrders.find(o => o.id === newOrder.id)
                return {
                    ...newOrder,
                    status: calculateOrderStatus(newOrder),
                    weight: existing?.weight ?? newOrder.weight ?? null
                }
            })
        })
    }, [initialOrders])

    useEffect(() => {
        const fetchWiseQuote = async (orderId: string, amount: number) => {
            if (!amount || amount <= 0) return
            try {
                const res = await fetch('/api/wise/quote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount }),
                })

                const contentType = res.headers.get('content-type') || ''
                if (res.ok && contentType.includes('application/json')) {
                    const data = await res.json()
                    if (data.success && data.quote?.fee !== undefined) {
                        setWiseQuoteData(prev => ({
                            ...prev,
                            [orderId]: {
                                fee: data.quote.fee,
                                rate: data.quote.rate,
                                sourceCurrency: data.quote.sourceCurrency
                            }
                        }))
                    }
                }
            } catch (err) {
                console.error('Wise Quote Fetch Error:', err)
            }
        }

        orders.forEach(order => {
            if (order.payment_method === 'Wise') {
                const calculatedFee = calculatedFees[order.id] ?? null
                const details = calculateInvoiceDetails(order, calculatedFee, order.total_amount > 0, editingWeight.has(order.id), null)
                if (details.baseAmount > 0) {
                    fetchWiseQuote(order.id, details.baseAmount)
                }
            }
        })
    }, [calculatedFees, orders, editingWeight])

    useEffect(() => {
        const calculateFeesForOrders = async () => {
            for (const order of orders) {
                const inputs = orderInputs[order.id] || {};

                let weightStr = inputs.weight;
                if (weightStr === undefined) {
                    weightStr = '';
                }

                const weightVal = parseFloat(weightStr);
                if (isNaN(weightVal) || weightVal <= 0) {
                    if (calculatedFees[order.id] !== undefined) {
                        setCalculatedFees(prev => {
                            const next = { ...prev };
                            delete next[order.id];
                            return next;
                        });
                        setSelectedServiceNames(prev => {
                            const next = { ...prev };
                            delete next[order.id];
                            return next;
                        });
                    }
                    continue;
                }

                const destCountry = order.shipping_country || order.profiles?.country || 'US';
                const destPostalCode = order.shipping_zip_code || order.profiles?.zip_code || '';
                const selectedMethod = order.shipping_method || '最安プラン自動選択 (航空便)';

                try {
                    setCalculatingOrders(prev => new Set(prev).add(order.id));

                    const res = await fetch('/api/calculate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            destination: destCountry,
                            postalCode: destPostalCode, 
                            weight: weightVal,
                            targetCurrency: 'JPY'
                        })
                    });

                    const contentType = res.headers.get('content-type') || '';

                    if (res.ok && contentType.includes('application/json')) {
                        const data = await res.json();
                        let fee: number | null = null;
                        let resolvedServiceName = '';

                        if (selectedMethod.includes('船便')) {
                            fee = data.japanPost?.total || null;
                            resolvedServiceName = data.japanPost?.serviceName || '日本郵便 (船便)';
                            if (data.japanPost?.error) {
                                setCalcErrors(prev => ({ ...prev, [order.id]: data.japanPost.error }));
                            }
                        } else {
                            const fedexList = data.fedexRates || [];
                            if (fedexList.length > 0) {
                                if (selectedMethod.includes('最安プラン') || selectedMethod.includes('航空便')) {
                                    fee = fedexList[0].total;
                                    resolvedServiceName = fedexList[0].serviceName;
                                } else {
                                    const matched = fedexList.find((f: any) =>
                                        selectedMethod.includes(f.serviceName) || f.serviceName.includes(selectedMethod)
                                    );
                                    fee = matched ? matched.total : fedexList[0].total;
                                    resolvedServiceName = matched ? matched.serviceName : fedexList[0].serviceName;
                                }
                            } else if (data.fedexError) {
                                setCalcErrors(prev => ({ ...prev, [order.id]: data.fedexError }));
                            }
                        }

                        if (fee !== null) {
                            setCalculatedFees(prev => ({ ...prev, [order.id]: fee }));
                            if (resolvedServiceName) {
                                setSelectedServiceNames(prev => ({ ...prev, [order.id]: resolvedServiceName }));
                            }
                            setCalcErrors(prev => {
                                const next = { ...prev };
                                delete next[order.id];
                                return next;
                            });
                        }
                    } else {
                        setCalcErrors(prev => ({ ...prev, [order.id]: `計算APIエラー (${res.status})` }));
                    }
                } catch (err: any) {
                    console.error('送料の自動計算エラー:', err);
                    setCalcErrors(prev => ({ ...prev, [order.id]: '通信エラーが発生しました' }));
                } finally {
                    setCalculatingOrders(prev => {
                        const next = new Set(prev);
                        next.delete(order.id);
                        return next;
                    });
                }
            }
        };

        const timer = setTimeout(() => {
            calculateFeesForOrders();
        }, 300);

        return () => clearTimeout(timer);
    }, [orderInputs, orders]);

    const toggleOrder = (orderId: string) => {
        setExpandedOrders((prev) => {
            const next = new Set(prev)
            if (next.has(orderId)) next.delete(orderId)
            else next.add(orderId)
            return next
        })
    }

    const handleWeightChange = (orderId: string, value: string) => {
        setOrderInputs(prev => ({
            ...prev,
            [orderId]: { weight: value }
        }))
    }

    const handleItemStatusUpdated = async (orderId: string, itemId: string, newStatus: string) => {
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const updatedOrderItems = order.order_items.map((oi: any) => {
                    const isArr = Array.isArray(oi.items)
                    const itemObj = isArr ? oi.items[0] : oi.items
                    if (itemObj && itemObj.id === itemId) {
                        const newObj = { ...itemObj, status: newStatus }
                        return { ...oi, items: isArr ? [newObj] : newObj }
                    }
                    return oi
                })
                const tempOrder = { ...order, order_items: updatedOrderItems }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        try {
            await updateItemStatus(itemId, newStatus, orderId)
        } catch (error) {
            console.error('DBへのステータス保存に失敗しました:', error)
            alert('ステータスの保存に失敗しました')
        }
    }

    const handleNoteSubmit = async (orderId: string, itemId: string, note: string) => {
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const updatedOrderItems = order.order_items.map((oi: any) => {
                    const isArr = Array.isArray(oi.items)
                    const itemObj = isArr ? oi.items[0] : oi.items
                    if (itemObj && itemObj.id === itemId) {
                        const newObj = { ...itemObj, admin_note: note, status: 'info_required' }
                        return { ...oi, items: isArr ? [newObj] : newObj }
                    }
                    return oi
                })
                const tempOrder = { ...order, order_items: updatedOrderItems }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await updateAdminNote(itemId, note)
    }

    const handleCancelNote = async (orderId: string, itemId: string) => {
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const updatedOrderItems = order.order_items.map((oi: any) => {
                    const isArr = Array.isArray(oi.items)
                    const itemObj = isArr ? oi.items[0] : oi.items
                    if (itemObj && itemObj.id === itemId) {
                        const newObj = { ...itemObj, admin_note: null, status: 'pending' }
                        return { ...oi, items: isArr ? [newObj] : newObj }
                    }
                    return oi
                })
                const tempOrder = { ...order, order_items: updatedOrderItems }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await cancelAdminNote(itemId)
    }

    const handleGenerateFedExLabel = async (orderId: string) => {
        try {
            setIsGeneratingLabel(true)
            const res = await fetch('/api/admin/fedex/shipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            })

            const data = await res.json()

            if (!res.ok || data.error) {
                alert(`⚠️ FedExラベル発行エラー: ${data.error}`)
                return
            }

            if (data.trackingNumber) {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, tracking_number: data.trackingNumber } : o))
                await updateTrackingNumber(orderId, data.trackingNumber)
            }

            if (data.labelPdfBase64) {
                const byteCharacters = atob(data.labelPdfBase64)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: 'application/pdf' })
                const fileURL = URL.createObjectURL(blob)
                window.open(fileURL, '_blank')
            }

            alert(`✅ FedEx 配送ラベルを発行しました！\n追跡番号を自動入力しました: ${data.trackingNumber}`)
        } catch (err: any) {
            console.error('FedExラベル発行エラー:', err)
            alert('通信エラーが発生しました。')
        } finally {
            setIsGeneratingLabel(false)
        }
    }

    const handleInvoiceSubmit = async (orderId: string, currentShippingFee: number, currentTotalAmount: number, currentShippingMethod: string, formData: FormData) => {
        const weightStr = formData.get('weightStr') as string;
        const weightNum = parseFloat(weightStr);

        if (!weightStr || weightStr.trim() === '' || isNaN(weightNum) || weightNum === 0) {
            setOrderInputs(prev => {
                const next = { ...prev };
                delete next[orderId];
                return next;
            })
            setEditingWeight(prev => { const next = new Set(prev); next.delete(orderId); return next; })
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    const temp = { ...o, shipping_fee: null, total_amount: null, status: 'pending' };
                    return { ...temp, status: calculateOrderStatus(temp) };
                }
                return o;
            }))
            await deleteInvoice(orderId)
            return;
        }

        const targetOrder = orders.find(o => o.id === orderId)
        const hasExistingTracking = Boolean(targetOrder?.tracking_number && String(targetOrder.tracking_number).trim() !== '')

        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                return { ...order, shipping_fee: currentShippingFee, total_amount: currentTotalAmount, shipping_method: currentShippingMethod }
            })
        )

        setEditingWeight(prev => { const next = new Set(prev); next.delete(orderId); return next; })
        await sendInvoice(orderId, currentShippingFee, currentTotalAmount, currentShippingMethod)

        if (hasExistingTracking) {
            alert('総重量が変更されたため、新しい配送ラベルを自動作成します。')
            await handleGenerateFedExLabel(orderId)
        }
    }

    const handleMarkAsPaymentRequiredWithWise = async (order: any, amount: number) => {
        if (!amount || amount <= 0) {
            alert('お支払い金額（合計金額）が入力されていません。')
            return
        }

        const wiseEmail = order.profiles?.wise_email || ''
        const orderNumber = order.order_number ?? ''

        const copyText = `${wiseEmail}\n${orderNumber}\n${amount}`
        navigator.clipboard.writeText(copyText)

        alert(
            `✅ 以下の請求情報をクリップボードにコピーしました！\n\n` +
            `------------------------\n` +
            `${copyText}\n` +
            `------------------------\n\n` +
            `Wiseの画面が開いたら、上記内容を元に請求を作成してください。`
        )

        window.open('https://wise.com/flows/create-invoice/?utm_source=requested_payments_list#/create', '_blank')

        setOrders((prevOrders) =>
            prevOrders.map((o) => {
                if (o.id !== order.id) return o
                return { ...o, status: 'payment_required' }
            })
        )
        await updateOrderStatusToPaymentRequired(order.id)
    }

    const handleSendInvoiceByPaymentMethod = async (order: any, amount: number) => {
        if (!amount || amount <= 0) {
            alert('お支払い金額（合計金額）が入力されていません。総重量を入力するか確定してください。')
            return
        }

        const paymentMethod = order.payment_method || 'Wise'

        if (paymentMethod === 'PayPal') {
            const paypalEmail = order.profiles?.paypal_email || order.profiles?.email || '未登録'
            if (!window.confirm(`PayPalで以下の宛先に請求書を自動送信しますか？\n宛先: ${paypalEmail}\n金額: ${amount.toLocaleString()} 円`)) {
                return
            }

            try {
                setOrders((prevOrders) =>
                    prevOrders.map((o) => o.id === order.id ? { ...o, status: 'payment_required' } : o)
                )

                await sendPayPalInvoice(order.id)
                alert('✅ PayPal 請求書を自動送信しました！')
            } catch (err: any) {
                console.error(err)
                setOrders((prevOrders) =>
                    prevOrders.map((o) => o.id === order.id ? { ...o, status: calculateOrderStatus(o) } : o)
                )
                alert(`⚠️ PayPal 請求書の送信に失敗しました: ${err.message}`)
            }
            return
        }

        await handleMarkAsPaymentRequiredWithWise(order, amount)
    }

    const handleCancelPaymentRequired = async (order: any) => {
        if (!window.confirm('送信済みの状態を取り消しますか？')) return
        setOrders((prevOrders) =>
            prevOrders.map((o) => {
                if (o.id !== order.id) return o
                const tempOrder = { ...o, status: 'pending' }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder)
                }
            })
        )
        await cancelPaymentRequired(order.id)
    }

    const handleMarkAsShipped = async (order: any) => {
        setOrders((prevOrders) =>
            prevOrders.map((o) => {
                if (o.id !== order.id) return o
                return { ...o, status: 'shipped' }
            })
        )
        await shipOrder(order.id, order.tracking_number || '')
    }

    const handleCancelShip = async (orderId: string) => {
        if (!window.confirm('発送済みの状態を取り消しますか？（追跡番号は保持されます）')) return
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const tempOrder = { ...order, status: 'payment_required' }
                return {
                    ...tempOrder,
                    status: calculateOrderStatus(tempOrder),
                }
            })
        )
        await cancelShip(orderId)
    }

    const handlePriceChange = async (itemId: string, newPrice: number) => {
        try {
            await updateItemPrice(itemId, newPrice)
        } catch (e: any) {
            alert('価格の更新に失敗しました: ' + (e?.message || '不明なエラー'))
        }
    }

    const handleQuantityChange = async (itemId: string, newQuantity: number) => {
        try {
            await updateItemQuantity(itemId, newQuantity)
        } catch (e: any) {
            alert('数量の更新に失敗しました: ' + (e?.message || '不明なエラー'))
        }
    }

    const handleTitleChange = async (itemId: string, newTitle: string) => {
        try {
            await updateItemTitle(itemId, newTitle)
        } catch (e: any) {
            alert('商品名の更新に失敗しました: ' + (e?.message || '不明なエラー'))
        }
    }

    return (
        <div className="p-6 overflow-x-auto">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

            <table className="min-w-full border-collapse border border-slate-300 text-sm text-left bg-white shadow-sm">
                <thead className="bg-slate-100">
                    <tr>
                        <th className="border border-slate-300 p-2 w-10 text-center"></th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">注文No.</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center min-w-[130px]">ユーザー情報</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap">注文ステータス</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">商品数</th>
                        <th className="border border-slate-300 p-2 min-w-[200px] text-center">総重量</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center min-w-[140px]">配送ラベル</th>
                        <th className="border border-slate-300 p-2 min-w-[200px]">追跡番号</th>
                        <th className="border border-slate-300 p-2 min-w-[150px] text-right">着金金額</th>
                        <th className="border border-slate-300 p-2 min-w-[150px] text-right">お支払い金額</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">請求書送信</th>
                        <th className="border border-slate-300 p-2 whitespace-nowrap text-center">発送状態</th>
                    </tr>
                </thead>
                <tbody>
                    {orders?.map((order) => {
                        if (!order) return null
                        const isExpanded = expandedOrders.has(order.id)
                        const itemCount = order.order_items?.length || 0

                        const hasInvoice = order.total_amount !== null && order.total_amount !== undefined && Number(order.total_amount) > 0
                        const isPaymentRequired = order.status === 'payment_required'
                        const hasTracking = Boolean(order.tracking_number && String(order.tracking_number).trim() !== '')
                        const isShipped = order.status === 'shipped'

                        const hasInfoRequiredItem = order.order_items?.some((oi: any) => {
                            const item = Array.isArray(oi.items) ? oi.items[0] : oi.items
                            return item?.status === 'info_required'
                        })

                        const isEditingWeight = editingWeight.has(order.id);

                        const inputs = orderInputs[order.id] || {}

                        let displayWeight = '';
                        if (inputs.weight !== undefined) {
                            displayWeight = inputs.weight;
                        } else if (order.weight !== undefined && order.weight !== null) {
                            displayWeight = String(order.weight);
                        } else {
                            displayWeight = '';
                        }

                        const weightVal = parseFloat(displayWeight) || 0;

                        const calculatedFee = calculatedFees[order.id] ?? null;
                        const wiseQuote = wiseQuoteData[order.id] ?? null;
                        const details = calculateInvoiceDetails(order, calculatedFee, hasInvoice, isEditingWeight, wiseQuote);
                        const receivedAmount = details.productTotal + details.proxyFee + details.shippingFee;

                        const shippingServiceName = order.shipping_method;
                        const paymentServiceName = order.payment_method;

                        const isCalculating = calculatingOrders.has(order.id);
                        const calcErrorMsg = calcErrors[order.id];

                        const userNameDisp = order.profiles?.full_name || 'ユーザー詳細';

                        const canMarkAsShipped = isPaymentRequired && hasTracking

                        const canSendInvoice = hasInvoice || details.grandTotal > 0

                        const resolvedShippingDisp = (shippingServiceName?.includes('最安プラン') || !shippingServiceName)
                            ? (selectedServiceNames[order.id] ? `${selectedServiceNames[order.id]}` : (shippingServiceName || '最安プラン自動選択 (航空便)'))
                            : shippingServiceName;

                        return (
                            <React.Fragment key={order.id}>
                                <tr className="hover:bg-slate-50 transition-colors border-t border-slate-300">
                                    <td className="border border-slate-300 p-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleOrder(order.id)}
                                            className="p-1 rounded hover:bg-slate-200 text-slate-600 font-mono text-xs w-6 h-6 flex items-center justify-center"
                                        >
                                            {isExpanded ? '▼' : '▶'}
                                        </button>
                                    </td>

                                    <td className="border border-slate-300 p-2 font-mono text-xs font-bold text-center text-slate-700">
                                        #{order.order_number ?? '-'}
                                        {(shippingServiceName || paymentServiceName) && (
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                {shippingServiceName && (
                                                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded font-normal whitespace-nowrap">
                                                        配送: {shippingServiceName}
                                                    </span>
                                                )}
                                                {paymentServiceName && (
                                                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.2 rounded font-normal whitespace-nowrap">
                                                        決済: {paymentServiceName}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className="border border-slate-300 p-2 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setActiveAddressOrder(order)}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-1 rounded transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                                            >
                                                👤 {userNameDisp}
                                            </button>
                                        </div>
                                    </td>

                                    <td className="border border-slate-300 p-2">
                                        <StatusBadge status={order.status} />
                                    </td>

                                    <td className="border border-slate-300 p-2 text-center font-medium">
                                        <button
                                            type="button"
                                            onClick={() => toggleOrder(order.id)}
                                            className="text-blue-600 hover:underline block mx-auto"
                                        >
                                            {itemCount} 件
                                        </button>
                                        {hasInfoRequiredItem && (
                                            <div className="mt-1">
                                                <span className="inline-block bg-red-100 text-red-700 border border-red-300 text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse whitespace-nowrap">
                                                    要確認あり
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* 1. 総重量 */}
                                    <td className="border border-slate-300 p-2 text-center">
                                        {hasInvoice && !isEditingWeight ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="flex items-baseline gap-0.5 px-2">
                                                    <span className="font-mono font-bold text-slate-800 text-sm">{displayWeight || '-'}</span>
                                                    <span className="text-[10px] text-slate-500">kg</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOrderInputs(prev => ({ ...prev, [order.id]: { weight: displayWeight } }));
                                                        setEditingWeight(prev => new Set(prev).add(order.id));
                                                    }}
                                                    className="px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors text-white bg-emerald-500 hover:bg-emerald-600"
                                                >
                                                    変更
                                                </button>
                                            </div>
                                        ) : (
                                            <form action={handleInvoiceSubmit.bind(null, order.id, details.shippingFee, details.grandTotal, resolvedShippingDisp)} className="flex items-center justify-center gap-1.5">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    name="weightStr"
                                                    placeholder="重量"
                                                    value={displayWeight}
                                                    onChange={(e) => handleWeightChange(order.id, e.target.value)}
                                                    className="border border-slate-300 p-1.5 rounded text-xs w-20 text-right font-mono outline-blue-400 focus:border-blue-400 transition-colors bg-white"
                                                />
                                                <span className="text-[10px] text-slate-500">kg</span>
                                                <ActionStateButton state={hasInvoice ? 'confirm' : 'save'} pendingText="..." />

                                                {isEditingWeight && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingWeight(prev => { const next = new Set(prev); next.delete(order.id); return next; })}
                                                        className="text-[10px] text-rose-600 hover:text-rose-800 underline whitespace-nowrap"
                                                    >
                                                        取消
                                                    </button>
                                                )}
                                            </form>
                                        )}
                                    </td>

                                    {/* 2. 配送ラベル */}
                                    <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateFedExLabel(order.id)}
                                            disabled={isGeneratingLabel}
                                            className={`px-2.5 py-1.5 text-white font-bold rounded text-xs shadow-sm transition-colors whitespace-nowrap disabled:opacity-50 ${hasTracking ? 'bg-purple-900 hover:bg-purple-950' : 'bg-purple-700 hover:bg-purple-800'
                                                }`}
                                        >
                                            {isGeneratingLabel ? '処理中...' : hasTracking ? '📄 ラベル表示 (PDF)' : '📦 ラベル作成'}
                                        </button>
                                    </td>

                                    {/* 3. 追跡番号 */}
                                    <td className="border border-slate-300 p-2">
                                        {hasTracking ? (
                                            <div className="bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded flex items-center justify-between">
                                                <span className="text-xs font-mono text-emerald-900 font-bold truncate">
                                                    {order.tracking_number}
                                                </span>
                                                <a
                                                    href={getTrackingUrl(order.tracking_number)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="追跡状況を確認"
                                                    className="text-blue-600 hover:text-blue-800 font-bold ml-2 text-xs"
                                                >
                                                    ↗
                                                </a>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic px-1 block text-center">
                                                未発行
                                            </span>
                                        )}
                                    </td>

                                    {/* 4. 着金金額 */}
                                    <td className="border border-slate-300 p-2 text-right">
                                        <span className="font-bold text-slate-700 text-sm">
                                            {receivedAmount.toLocaleString()} 円
                                        </span>
                                    </td>

                                    {/* 5. お支払い金額 */}
                                    <td className="border border-slate-300 p-2 text-right">
                                        <div className="flex flex-col items-end justify-center bg-amber-50 p-1.5 rounded border border-amber-300">
                                            {isCalculating ? (
                                                <span className="text-xs text-blue-600 font-bold animate-pulse px-1">送料試算中...</span>
                                            ) : (
                                                <span className="font-bold text-amber-700 text-sm px-1">
                                                    {details.grandTotal.toLocaleString()} 円
                                                </span>
                                            )}
                                            {calcErrorMsg && (
                                                <span className="text-[9px] text-rose-600 font-bold mt-0.5" title={calcErrorMsg}>
                                                    ⚠️ {calcErrorMsg}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* 6. 請求書送信 (PayPal / Wise 対応) */}
                                    <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                                        {isPaymentRequired || isShipped ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="px-3 py-1.5 rounded text-xs font-bold shadow-sm text-white bg-emerald-500 cursor-default">
                                                    送信済み
                                                </span>
                                                {!isShipped && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelPaymentRequired(order)}
                                                        className="text-[10px] text-rose-600 hover:text-rose-800 underline whitespace-nowrap"
                                                    >
                                                        取消
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSendInvoiceByPaymentMethod(order, details.grandTotal)}
                                                disabled={!canSendInvoice}
                                                title={!canSendInvoice ? "総重量を入力してお支払い金額を算出してください" : `${paymentServiceName || 'Wise'}で請求を作成`}
                                                className={`px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-colors whitespace-nowrap text-white ${!canSendInvoice
                                                    ? 'bg-slate-300 cursor-not-allowed opacity-70'
                                                    : paymentServiceName === 'PayPal'
                                                        ? 'bg-[#003087] hover:bg-[#001C60]'
                                                        : 'bg-slate-700 hover:bg-slate-800'
                                                    }`}
                                            >
                                                {paymentServiceName === 'PayPal' ? '送信 (PayPal) ↗' : '送信 (Wise) ↗'}
                                            </button>
                                        )}
                                    </td>

                                    {/* 7. 発送状態 */}
                                    <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                                        {isShipped ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="px-3 py-1.5 rounded text-xs font-bold shadow-sm text-white bg-emerald-500 cursor-default">
                                                    発送済み
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelShip(order.id)}
                                                    className="text-[10px] text-rose-600 hover:text-rose-800 underline whitespace-nowrap"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleMarkAsShipped(order)}
                                                disabled={!canMarkAsShipped}
                                                title={!canMarkAsShipped ? "請求書の送信完了および配送ラベル/追跡番号の発行が必要です" : ""}
                                                className={`px-3 py-1.5 text-white rounded text-xs font-bold shadow-sm transition-colors ${canMarkAsShipped
                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                    : 'bg-slate-300 cursor-not-allowed opacity-70'
                                                    }`}
                                            >
                                                発送完了
                                            </button>
                                        )}
                                    </td>
                                </tr>

                                {isExpanded && (
                                    <tr className="bg-slate-50/70">
                                        <td colSpan={11} className="border border-slate-300 p-4 pl-12">
                                            <div className="bg-white border border-slate-200 rounded shadow-inner p-4 mb-4">
                                                <h4 className="text-xs font-bold text-slate-600 mb-3 border-b border-slate-200 pb-1 flex justify-between items-center">
                                                    <span>■ 請求明細</span>
                                                    {!hasInvoice && <span className="text-[10px] text-amber-600 font-normal">※ユーザー選択方法（{shippingServiceName || '航空便'}）＆重量に基づき試算中</span>}
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">商品価格合計</span>
                                                        <span className="text-sm font-mono text-slate-800">{details.productTotal.toLocaleString()} 円</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">代理手数料 (5%)</span>
                                                        <span className="text-sm font-mono text-slate-800">{details.proxyFee.toLocaleString()} 円</span>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            送料 <span className="text-slate-500 font-normal">({resolvedShippingDisp})</span>
                                                        </span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-sm font-mono text-slate-800">{details.shippingFee.toLocaleString()} 円</span>
                                                            <span className="text-[10px] font-mono text-blue-600 font-bold">
                                                                ({weightVal > 0 ? `${weightVal}kg` : '-'})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                            決済手数料 {paymentServiceName ? <span className="text-slate-400 font-normal">({paymentServiceName})</span> : ''}
                                                            {paymentServiceName === 'Wise' && wiseQuoteData[order.id] !== undefined && (
                                                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">API取得</span>
                                                            )}
                                                        </span>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-mono text-slate-800">{details.paymentFee.toLocaleString()} 円</span>
                                                            {details.paymentFeeDetail && (
                                                                <span className="text-[9px] text-slate-500 font-normal">
                                                                    内訳: {details.paymentFeeDetail}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col bg-amber-100/50 p-1.5 rounded border border-amber-200 -mt-1 -mb-1 justify-center px-2">
                                                        <span className="text-[10px] text-amber-800 font-bold">お支払い金額</span>
                                                        <span className="text-base font-mono font-bold text-amber-700">{details.grandTotal.toLocaleString()} 円</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded shadow-inner p-3">
                                                <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                                    注文商品一覧 ({itemCount}件)
                                                </h4>
                                                <table className="min-w-full border-collapse border border-slate-200 text-xs text-left">
                                                    <thead>
                                                        <tr className="bg-slate-100 text-slate-700">
                                                            <th className="border border-slate-200 p-2 font-semibold min-w-[180px]">商品名</th>
                                                            <th className="border border-slate-200 p-2 font-semibold">URL</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-24">備考(サイズ等)</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-16 text-center">依頼数量</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-16 text-center">確定数量</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-24 text-right">希望価格</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-28 text-right">購入価格(確定)</th>
                                                            <th className="border border-slate-200 p-2 font-semibold w-32">ステータス</th>
                                                            <th className="border border-slate-200 p-2 font-semibold min-w-[200px]">連絡欄 (ユーザーへ確認)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.order_items?.map((oi: any, idx: number) => {
                                                            const item = Array.isArray(oi.items) ? oi.items[0] : oi.items
                                                            if (!item) return null

                                                            const cartQty = item.quantity ?? 1
                                                            const adminQty = item.admin_quantity

                                                            return (
                                                                <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="border border-slate-200 p-2">
                                                                        <input
                                                                            type="text"
                                                                            defaultValue={item?.title || ''}
                                                                            placeholder="商品名を入力"
                                                                            onFocus={(e) => {
                                                                                const target = e.target
                                                                                setTimeout(() => target.select(), 0)
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                const val = e.target.value.trim()
                                                                                if (val !== (item?.title || '')) {
                                                                                    handleTitleChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="w-full border border-slate-300 p-1 rounded text-xs font-medium text-slate-800 outline-blue-400 focus:border-blue-400"
                                                                        />
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 max-w-[150px] truncate">
                                                                        {item.url ? (
                                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block">
                                                                                {item.url}
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-slate-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-xs text-slate-600 max-w-[120px] truncate" title={item.remarks}>
                                                                        {item.remarks || '-'}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-center font-mono text-slate-500">
                                                                        {cartQty}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            defaultValue={adminQty ?? cartQty}
                                                                            onFocus={(e) => {
                                                                                const target = e.target
                                                                                setTimeout(() => target.select(), 0)
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                const val = Number(e.target.value)
                                                                                if (val !== adminQty && val > 0) {
                                                                                    handleQuantityChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="border border-slate-300 p-1 rounded text-xs w-12 text-center font-mono font-bold"
                                                                        />
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-right font-mono text-slate-500">
                                                                        {item.desired_price ? `${Number(item.desired_price).toLocaleString()} 円` : '-'}
                                                                    </td>
                                                                    <td className="border border-slate-200 p-2 text-right">
                                                                        <CurrencyInput
                                                                            defaultValue={item.price}
                                                                            placeholder="落札/購入額"
                                                                            onValueChange={(val) => {
                                                                                if (val !== item.price) {
                                                                                    handlePriceChange(item.id, val)
                                                                                }
                                                                            }}
                                                                            className="border border-slate-300 p-1 rounded text-xs w-24 text-right font-mono"
                                                                        />
                                                                    </td>

                                                                    <td className="border border-slate-200 p-2 align-top">
                                                                        <ItemStatusSelect
                                                                            item={item}
                                                                            onStatusChange={(newStatus) => handleItemStatusUpdated(order.id, item.id, newStatus)}
                                                                        />
                                                                    </td>

                                                                    <td className="border border-slate-200 p-2 align-top">
                                                                        <AdminNoteForm
                                                                            orderId={order.id}
                                                                            item={item}
                                                                            onSubmit={handleNoteSubmit}
                                                                            onCancel={handleCancelNote}
                                                                        />
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

            {activeAddressOrder && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
                        <div className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-sm flex items-center gap-1.5">
                                <span>🏠 顧客基本情報・お届け先詳細</span>
                                <span className="font-mono text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                                    #{activeAddressOrder.order_number}
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveAddressOrder(null)}
                                className="text-slate-400 hover:text-white text-base font-bold px-2"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 space-y-4 text-xs text-slate-700 overflow-y-auto">
                            <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
                                <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1 flex justify-between items-center">
                                    <span>■ 基本情報・お届け先</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const o = activeAddressOrder;
                                            const p = o.profiles || {};
                                            const text = `担当者名: ${p.full_name || '-'}\n会社名: ${p.company_name || '-'}\n電話番号: ${p.phone || '-'}\n連絡先Email: ${p.contact_email || p.email || '-'}\n国: ${o.shipping_country || p.country || '-'}\nFedEx No: ${p.fedex_account_number || '-'}\n郵便番号: ${o.shipping_zip_code || p.zip_code || '-'}\n納税番号: ${p.tax_id || '-'}\n都市名: ${o.shipping_city || p.city || '-'}\n州・省: ${o.shipping_state_province || p.state_province || '-'}\n住所1: ${o.shipping_address_line1 || p.address_line1 || '-'}\n住所2: ${o.shipping_address_line2 || p.address_line2 || '-'}\n住所3: ${o.shipping_address_line3 || p.address_line3 || '-'}`;
                                            navigator.clipboard.writeText(text);
                                            alert('基本情報・お届け先をコピーしました');
                                        }}
                                        className="text-[10px] text-blue-600 hover:underline font-bold"
                                    >
                                        コピー
                                    </button>
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block font-bold">担当者名 (Full Name):</span>
                                        <span className="font-bold text-slate-800">{activeAddressOrder.profiles?.full_name || '未設定'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">会社名 (Company Name):</span>
                                        <span className="font-medium text-slate-800">{activeAddressOrder.profiles?.company_name || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">電話番号 (Phone):</span>
                                        <span className="font-mono font-bold text-slate-800">{activeAddressOrder.profiles?.phone || '未設定'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">連絡用Email (Contact Email):</span>
                                        <span className="font-mono font-bold text-blue-700">{activeAddressOrder.profiles?.contact_email || activeAddressOrder.profiles?.email || '未設定'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">国 (Country):</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeAddressOrder.shipping_country || activeAddressOrder.profiles?.country || '未設定'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">FedEx アカウント番号:</span>
                                        <span className="font-mono font-bold text-purple-700">{activeAddressOrder.profiles?.fedex_account_number || '未登録'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">郵便番号 (Zip Code):</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeAddressOrder.shipping_zip_code || activeAddressOrder.profiles?.zip_code || '未設定'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">納税番号 (Tax ID):</span>
                                        <span className="font-mono text-slate-800">{activeAddressOrder.profiles?.tax_id || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">都市名 (City):</span>
                                        <span className="font-medium text-slate-800">{activeAddressOrder.shipping_city || activeAddressOrder.profiles?.city || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">州または省 (State/Province):</span>
                                        <span className="font-medium text-slate-800">{activeAddressOrder.shipping_state_province || activeAddressOrder.profiles?.state_province || '-'}</span>
                                    </div>

                                    <div className="col-span-2 pt-1 border-t border-slate-200/80">
                                        <span className="text-slate-400 block font-bold">住所1 (Address Line 1):</span>
                                        <span className="font-medium text-slate-800 font-mono">
                                            {activeAddressOrder.shipping_address_line1 || activeAddressOrder.profiles?.address_line1 || '-'}
                                        </span>
                                    </div>

                                    {(activeAddressOrder.shipping_address_line2 || activeAddressOrder.profiles?.address_line2) && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400 block font-bold">住所2 (Address Line 2):</span>
                                            <span className="font-medium text-slate-800 font-mono">
                                                {activeAddressOrder.shipping_address_line2 || activeAddressOrder.profiles?.address_line2}
                                            </span>
                                        </div>
                                    )}

                                    {(activeAddressOrder.shipping_address_line3 || activeAddressOrder.profiles?.address_line3) && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400 block font-bold">住所3 (Address Line 3):</span>
                                            <span className="font-medium text-slate-800 font-mono">
                                                {activeAddressOrder.shipping_address_line3 || activeAddressOrder.profiles?.address_line3}
                                            </span>
                                        </div>
                                    )}

                                    <div className="col-span-2">
                                        <span className="text-slate-400 block font-bold">お届け先の種類:</span>
                                        <span className="font-medium text-slate-800">
                                            {(activeAddressOrder.shipping_is_residential ?? activeAddressOrder.profiles?.is_residential) ? '個人宅 (Residential)' : '事業所・会社 (Commercial)'}
                                        </span>
                                    </div>

                                    <div className="col-span-2 pt-1 border-t border-slate-200 mt-1">
                                        <span className="text-slate-400 block font-bold">ログイン用Email (システム管理用):</span>
                                        <span className="font-mono text-slate-600">{activeAddressOrder.profiles?.email || '未設定'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
                                <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1">■ お支払いアカウント情報</h4>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block font-bold">Wise用Email:</span>
                                        <span className="font-mono font-bold text-slate-800">{activeAddressOrder.profiles?.wise_email || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold">PayPalアカウント:</span>
                                        <span className="font-mono text-slate-800">{activeAddressOrder.profiles?.paypal_email || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}