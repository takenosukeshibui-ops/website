'use client'
import React, { useState, useEffect, useTransition } from 'react'
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
sendPayPalInvoice,
addAdminAdjustmentItem,
updateAllOrderItemsStatus
} from '@/app/actions/admin'
// ==========================================
// AIインテリジェンス用の型定義
// ==========================================
interface ProfitableCard {
cardName: string;
jpPriceJPY: number;
usPriceUSD: number;
estimatedProfitUSD: number;
reason: string;
imageUrl?: string;
}
interface SnsPosts {
trendPost: string;
arbitragePost: string;
hybridPost: string;
}
interface IntelligenceData {
trendInsights: string[];
profitableCards: ProfitableCard[];
snsPosts: SnsPosts;
salesDM: string;
accountInsights?: string;
}
// ==========================================
// 既存の補助コンポーネント群
// ==========================================
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
let proxyFeeTargetTotal = 0;
    (order.order_items || []).forEach((oi: any) => {
        const item = Array.isArray(oi.items) ? oi.items[0] : oi.items;
        if (item) {
            const qty = item.admin_quantity ?? item.quantity ?? 1;
            const isInhouse = item.url?.startsWith('inhouse://') || item.url?.startsWith('inhouse-item-');
            const price = item.price ?? (isInhouse ? item.price_estimated : 0);
            const subtotal = qty * price;
            productTotal += subtotal;

            if (!isInhouse) {
                proxyFeeTargetTotal += subtotal;
            }
        }
    });

    const proxyFeeRate = 0.05;
    const proxyFee = Math.floor(proxyFeeTargetTotal * proxyFeeRate);

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

    return { productTotal, proxyFee, shippingFee, baseAmount, paymentFee, paymentFeeDetail, grandTotal };
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
function AddAdjustmentForm({ orderId, userId }: { orderId: string; userId: string }) {
const [title, setTitle] = useState('')
const [price, setPrice] = useState<string>('')
const [isPending, startTransition] = useTransition()
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || price === '') return

        startTransition(async () => {
            await addAdminAdjustmentItem(orderId, userId, title, Number(price))
            setTitle('')
            setPrice('')
        })
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3 p-2 bg-slate-50 border border-slate-200 rounded">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">➕ 調整項目追加:</span>
            <input
                type="text"
                placeholder="項目名 (例: 値引き, 梱包補強費)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-slate-300 px-2 py-1 text-xs rounded w-48 bg-white outline-blue-400"
                required
            />
            <input
                type="number"
                placeholder="金額 (例: -1000)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="border border-slate-300 px-2 py-1 text-xs rounded w-28 bg-white font-mono outline-blue-400"
                required
            />
            <button
                type="submit"
                disabled={isPending}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded shadow-sm disabled:opacity-50 whitespace-nowrap transition-colors"
            >
                {isPending ? '追加中...' : '追加'}
            </button>
        </form>
    )
}
function BulkStatusSelectForm({
orderId,
onBulkUpdate
}: {
orderId: string
onBulkUpdate: (orderId: string, newStatus: string) => Promise<void>
}) {
const [status, setStatus] = useState('purchased')
const [isPending, startTransition] = useTransition()
    const handleApply = () => {
        if (!window.confirm('全商品のステータスを一括で変更しますか？')) return
        startTransition(async () => {
            await onBulkUpdate(orderId, status)
        })
    }

    return (
        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">⚡️ 一括変更:</span>
            <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs border border-slate-300 rounded px-1.5 py-0.5 bg-white font-medium text-slate-700 outline-none"
            >
                <option value="pending">依頼済み (pending)</option>
                <option value="purchased">購入完了 (purchased)</option>
                <option value="in_warehouse">倉庫到着 (in_warehouse)</option>
                <option value="cancelled">キャンセル (cancelled)</option>
            </select>
            <button
                type="button"
                onClick={handleApply}
                disabled={isPending}
                className="bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm disabled:opacity-50 whitespace-nowrap transition-colors"
            >
                {isPending ? '更新中...' : '全商品に適用'}
            </button>
        </div>
    )
}
// ==========================================
// メインコンポーネント (タブ機能統合)
// ==========================================
export default function ClientAdminPage({ orders: initialOrders }: { orders: any[] }) {
// タブ切り替え用のState
const [activeTab, setActiveTab] = useState<'orders' | 'intelligence'>('orders')
    // AIインテリジェンス用のState
    const [aiLoading, setAiLoading] = useState<boolean>(false)
    const [runningAction, setRunningAction] = useState<string | null>(null) // 🌟 個別実行中キー
    const [aiData, setAiData] = useState<IntelligenceData | null>(null)
    const [aiError, setAiError] = useState<string | null>(null)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)
    const [history, setHistory] = useState<any[]>([])
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

    // Discord送信用のローディングState
    const [isPublishingDiscord, setIsPublishingDiscord] = useState<boolean>(false)
    // 🌟 Instagram送信用のローディングState
    const [isPublishingInstagram, setIsPublishingInstagram] = useState<string | null>(null)

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

    // 🌟 単体AIの個別実行ハンドラー
    const runSingleAi = async (action: 'trend' | 'arbitrage' | 'account' | 'sns' | 'dm') => {
        setRunningAction(action);
        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, currentData: aiData || {} }),
            });

            // JSON以外のエラー（500/HTMLテキスト等）を検知してメッセージ表示
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const errorText = await res.text();
                throw new Error(`サーバーエラー (${res.status}): ${errorText.slice(0, 200)}`);
            }

            const json = await res.json();
            if (!json.success) throw new Error(json.error || '生成失敗');

            setAiData(prev => ({
                trendInsights: prev?.trendInsights || [],
                profitableCards: prev?.profitableCards || [],
                snsPosts: prev?.snsPosts || { trendPost: '', arbitragePost: '', hybridPost: '' },
                salesDM: prev?.salesDM || '',
                accountInsights: prev?.accountInsights || '',
                ...json.data
            }));
        } catch (err: any) {
            alert(`⚠️ 実行エラー: ${err.message}`);
        } finally {
            setRunningAction(null);
        }
    };

    // AIパイプライン（一括）を実行する
    const runIntelligenceAnalysis = async () => {
        setAiLoading(true)
        setAiError(null)

        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'all' }),
            })

            if (!res.ok) throw new Error(`通信エラー: ${res.statusText}`)
            const json = await res.json()
            if (!json.success) throw new Error(json.error || '分析失敗')

            setAiData(json.data)

            // 実行後に最新履歴一覧を再取得してセレクターを最新化
            const historyRes = await fetch('/api/ai/intelligence')
            const historyJson = await historyRes.json()
            if (historyJson.success && historyJson.history) {
                setHistory(historyJson.history)
                setSelectedRecordId(json.savedRecordId || historyJson.history[0]?.id)
            }
        } catch (err: any) {
            setAiError(err.message || '予期せぬエラー')
        } finally {
            setAiLoading(false)
        }
    }

    // コピー機能
    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 2000)
    }

    // 💡 Discord直接送信ハンドラー
    const handlePublishToDiscord = async (content: string) => {
        if (!window.confirm('Discordの大口バイヤー用チャンネルへ直接オファー文を送信しますか？')) return

        setIsPublishingDiscord(true)
        try {
            const res = await fetch('/api/ai/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'discord', content }),
            })

            const json = await res.json()
            if (!json.success) throw new Error(json.error)

            alert(`✅ ${json.message}`)
        } catch (err: any) {
            alert(`⚠️ 送信エラー: ${err.message}`)
        } finally {
            setIsPublishingDiscord(false)
        }
    }

    // 🌟 Instagram直接投稿ハンドラー
    const handlePublishToInstagram = async (content: string, typeKey: string, imageUrl?: string) => {
        if (!window.confirm('この内容を Instagram (worldwidejapan2023) に自動投稿しますか？')) return

        setIsPublishingInstagram(typeKey)
        try {
            const res = await fetch('/api/ai/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'instagram', content, imageUrl }),
            })

            const json = await res.json()
            if (!json.success) throw new Error(json.error)

            alert(`✅ ${json.message}`)
        } catch (err: any) {
            alert(`⚠️ Instagram投稿エラー: ${err.message}`)
        } finally {
            setIsPublishingInstagram(null)
        }
    }

    useEffect(() => {
        const fetchLatestHistory = async () => {
            try {
                const res = await fetch('/api/ai/intelligence')
                const json = await res.json()
                if (json.success && json.history && json.history.length > 0) {
                    setHistory(json.history)
                    const latest = json.history[0]
                    setAiData({
                        trendInsights: latest.trend_insights,
                        profitableCards: latest.profitable_cards,
                        snsPosts: latest.sns_posts,
                        salesDM: latest.sales_dm,
                        accountInsights: latest.account_insights,
                    })
                    setSelectedRecordId(latest.id)
                }
            } catch (e) {
                console.error('履歴取得エラー:', e)
            }
        }
        fetchLatestHistory()
    }, [])
    
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
                let weightStr = inputs.weight ?? '';
                const weightVal = parseFloat(weightStr);

                if (isNaN(weightVal) || weightVal <= 0) {
                    if (calculatedFees[order.id] !== undefined) {
                        setCalculatedFees(prev => { const next = { ...prev }; delete next[order.id]; return next; });
                        setSelectedServiceNames(prev => { const next = { ...prev }; delete next[order.id]; return next; });
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
                            if (data.japanPost?.error) setCalcErrors(prev => ({ ...prev, [order.id]: data.japanPost.error }));
                        } else {
                            const fedexList = data.fedexRates || [];
                            if (fedexList.length > 0) {
                                if (selectedMethod.includes('最安プラン') || selectedMethod.includes('航空便')) {
                                    fee = fedexList[0].total;
                                    resolvedServiceName = fedexList[0].serviceName;
                                } else {
                                    const matched = fedexList.find((f: any) => selectedMethod.includes(f.serviceName) || f.serviceName.includes(selectedMethod));
                                    fee = matched ? matched.total : fedexList[0].total;
                                    resolvedServiceName = matched ? matched.serviceName : fedexList[0].serviceName;
                                }
                            } else if (data.fedexError) {
                                setCalcErrors(prev => ({ ...prev, [order.id]: data.fedexError }));
                            }
                        }

                        if (fee !== null) {
                            setCalculatedFees(prev => ({ ...prev, [order.id]: fee }));
                            if (resolvedServiceName) setSelectedServiceNames(prev => ({ ...prev, [order.id]: resolvedServiceName }));
                            setCalcErrors(prev => { const next = { ...prev }; delete next[order.id]; return next; });
                        }
                    } else {
                        setCalcErrors(prev => ({ ...prev, [order.id]: `計算APIエラー (${res.status})` }));
                    }
                } catch (err: any) {
                    setCalcErrors(prev => ({ ...prev, [order.id]: '通信エラーが発生しました' }));
                } finally {
                    setCalculatingOrders(prev => { const next = new Set(prev); next.delete(order.id); return next; });
                }
            }
        };

        const timer = setTimeout(() => { calculateFeesForOrders(); }, 300);
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
        setOrderInputs(prev => ({ ...prev, [orderId]: { weight: value } }))
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
                return { ...tempOrder, status: calculateOrderStatus(tempOrder) }
            })
        )
        try {
            await updateItemStatus(itemId, newStatus, orderId)
        } catch (error) {
            alert('ステータスの保存に失敗しました')
        }
    }

    const handleBulkStatusUpdate = async (orderId: string, newStatus: string) => {
        setOrders((prevOrders) =>
            prevOrders.map((order) => {
                if (order.id !== orderId) return order
                const updatedOrderItems = order.order_items.map((oi: any) => {
                    const isArr = Array.isArray(oi.items)
                    const itemObj = isArr ? oi.items[0] : oi.items
                    if (itemObj) {
                        const newObj = { ...itemObj, status: newStatus }
                        return { ...oi, items: isArr ? [newObj] : newObj }
                    }
                    return oi
                })
                const tempOrder = { ...order, order_items: updatedOrderItems }
                return { ...tempOrder, status: calculateOrderStatus(tempOrder) }
            })
        )
        try {
            await updateAllOrderItemsStatus(orderId, newStatus)
        } catch (error: any) {
            alert(error?.message || 'ステータスの一括更新に失敗しました')
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
                return { ...tempOrder, status: calculateOrderStatus(tempOrder) }
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
                return { ...tempOrder, status: calculateOrderStatus(tempOrder) }
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
            alert(`✅ FedEx 配送ラベルを発行しました！\n追跡番号: ${data.trackingNumber}`)
        } catch (err: any) {
            alert('通信エラーが発生しました。')
        } finally {
            setIsGeneratingLabel(false)
        }
    }

    const handleInvoiceSubmit = async (orderId: string, currentShippingFee: number, currentTotalAmount: number, currentShippingMethod: string, formData: FormData) => {
        const weightStr = formData.get('weightStr') as string;
        const weightNum = parseFloat(weightStr);

        if (!weightStr || weightStr.trim() === '' || isNaN(weightNum) || weightNum === 0) {
            setOrderInputs(prev => { const next = { ...prev }; delete next[orderId]; return next; })
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
            alert('お支払い金額が入力されていません。')
            return
        }
        const wiseEmail = order.profiles?.wise_email || ''
        const orderSeq = order.user_order_seq ?? order.order_number ?? ''
        const copyText = `${wiseEmail}\n${orderSeq}\n${amount}`
        navigator.clipboard.writeText(copyText)

        alert(`✅ 請求情報をコピーしました！\n\n${copyText}\n\nWiseを開きます。`)
        window.open('https://wise.com/flows/create-invoice/?utm_source=requested_payments_list#/create', '_blank')

        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'payment_required' } : o))
        await updateOrderStatusToPaymentRequired(order.id)
    }

    const handleSendInvoiceByPaymentMethod = async (order: any, amount: number) => {
        if (!amount || amount <= 0) {
            alert('お支払い金額が入力されていません。')
            return
        }
        const paymentMethod = order.payment_method || 'Wise'
        if (paymentMethod === 'PayPal') {
            const paypalEmail = order.profiles?.paypal_email || order.profiles?.email || '未登録'
            if (!window.confirm(`PayPalで請求書を自動送信しますか？\n宛先: ${paypalEmail}\n金額: ${amount.toLocaleString()} 円`)) return
            try {
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'payment_required' } : o))
                await sendPayPalInvoice(order.id)
                alert('✅ PayPal 請求書を自動送信しました！')
            } catch (err: any) {
                alert(`⚠️ 送信失敗: ${err.message}`)
            }
            return
        }
        await handleMarkAsPaymentRequiredWithWise(order, amount)
    }

    const handleCancelPaymentRequired = async (order: any) => {
        if (!window.confirm('送信済みの状態を取り消しますか？')) return
        setOrders(prev => prev.map(o => {
            if (o.id !== order.id) return o
            const temp = { ...o, status: 'pending' }
            return { ...temp, status: calculateOrderStatus(temp) }
        }))
        await cancelPaymentRequired(order.id)
    }

    const handleMarkAsShipped = async (order: any) => {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'shipped' } : o))
        await shipOrder(order.id, order.tracking_number || '')
    }

    const handleCancelShip = async (orderId: string) => {
        if (!window.confirm('発送済みの状態を取り消しますか？')) return
        setOrders(prev => prev.map(order => {
            if (order.id !== orderId) return order
            const temp = { ...order, status: 'payment_required' }
            return { ...temp, status: calculateOrderStatus(temp) }
        }))
        await cancelShip(orderId)
    }

    const handlePriceChange = async (itemId: string, newPrice: number) => {
        try { await updateItemPrice(itemId, newPrice) } catch (e: any) { alert(e?.message) }
    }

    const handleQuantityChange = async (itemId: string, newQuantity: number) => {
        try { await updateItemQuantity(itemId, newQuantity) } catch (e: any) { alert(e?.message) }
    }

    const handleTitleChange = async (itemId: string, newTitle: string) => {
        try { await updateItemTitle(itemId, newTitle) } catch (e: any) { alert(e?.message) }
    }

    return (
        <div className="p-6">
            {/* タブ切り替えボタン */}
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-6">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                        activeTab === 'orders'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <span>📦 注文管理 ({orders.length}件)</span>
                </button>

                <button
                    onClick={() => setActiveTab('intelligence')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                        activeTab === 'intelligence'
                            ? 'bg-slate-900 text-amber-400 shadow-sm border border-slate-800'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <span>⚡ AI市場インテリジェンス (日米サヤ & SNS)</span>
                    <span className="bg-amber-400/20 text-amber-600 text-[10px] px-1.5 py-0.5 rounded font-mono">NEW</span>
                </button>
            </div>

            {/* ========================================================= */}
            {/* 1. AI市場インテリジェンス タブの内容 */}
            {/* ========================================================= */}
            {activeTab === 'intelligence' && (
                <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl border border-slate-800 animate-fadeIn">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                                <span className="text-amber-400">⚡</span> 自律型トレカ市場インテリジェンス
                            </h2>
                            <p className="text-slate-400 text-xs mt-1">
                                各AIの個別実行、または一括分析を実行してSNS投稿3パターン＆大口DM文を自動生成します。
                            </p>
                        </div>

                        <button
                            onClick={runIntelligenceAnalysis}
                            disabled={aiLoading || Boolean(runningAction)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                                aiLoading
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-500/20 disabled:opacity-50'
                            }`}
                        >
                            {aiLoading ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    AIエージェント分析実行中...
                                </>
                            ) : (
                                <span>🚀 一括インテリジェンス実行</span>
                            )}
                        </button>
                    </div>

                    {/* 過去履歴セレクターバー */}
                    {history.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900 border border-slate-800 p-3 rounded-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold">📅 過去の保存履歴:</span>
                                <select
                                    value={selectedRecordId || ''}
                                    disabled={aiLoading || Boolean(runningAction)}
                                    onChange={(e) => {
                                        const target = history.find(h => h.id === e.target.value)
                                        if (target) {
                                            setSelectedRecordId(target.id)
                                            setAiData({
                                                trendInsights: target.trend_insights,
                                                profitableCards: target.profitable_cards,
                                                snsPosts: target.sns_posts,
                                                salesDM: target.sales_dm,
                                                accountInsights: target.account_insights,
                                            })
                                        }
                                    }}
                                    className="bg-slate-950 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                                >
                                    {history.map((h) => (
                                        <option key={h.id} value={h.id}>
                                            {new Date(h.created_at).toLocaleString('ja-JP')} [{h.trigger_type === 'cron' ? '⏰ 自動定期' : '👤 手動'}]
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                全 {history.length} 件の履歴を保持中
                            </span>
                        </div>
                    )}

                    {aiError && (
                        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs">
                            {aiError}
                        </div>
                    )}

                    {!aiData && !aiLoading && !aiError && (
                        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                            右上の「🚀 一括インテリジェンス実行」または各項目の「🔄 個別実行」をクリックすると、AIが動き出します。
                        </div>
                    )}

                    {aiData && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 左カラム：情報収集＆サヤ発掘結果 */}
                            <div className="space-y-5">
                                {/* トレンドインサイト */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                                            <span>🔮</span> 市場トレンドインサイト（予言者AI）
                                        </h3>
                                        <button
                                            onClick={() => runSingleAi('trend')}
                                            disabled={Boolean(runningAction) || aiLoading}
                                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[11px] font-bold transition disabled:opacity-50"
                                        >
                                            {runningAction === 'trend' ? '分析中...' : '🔄 トレンド再分析'}
                                        </button>
                                    </div>
                                    <ul className="space-y-2">
                                        {aiData.trendInsights.map((insight, idx) => (
                                            <li key={idx} className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                                                {insight}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* サヤ抜きカード発掘 */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                            <span>💎</span> 日米サヤ抜き発掘カード（サヤ分析AI）
                                        </h3>
                                        <button
                                            onClick={() => runSingleAi('arbitrage')}
                                            disabled={Boolean(runningAction) || aiLoading}
                                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-[11px] font-bold transition disabled:opacity-50"
                                        >
                                            {runningAction === 'arbitrage' ? '発掘中...' : '🔄 サヤ再発掘'}
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {aiData.profitableCards.map((card, idx) => (
                                            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="font-bold text-white text-xs">{card.cardName}</span>
                                                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] rounded-full whitespace-nowrap">
                                                        想定利益 +${card.estimatedProfitUSD}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 text-[11px] text-slate-400 font-mono">
                                                    <span>日本仕入: <strong className="text-slate-200">¥{card.jpPriceJPY.toLocaleString()}</strong></span>
                                                    <span>米相場: <strong className="text-slate-200">${card.usPriceUSD}</strong></span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 leading-relaxed">
                                                    {card.reason}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 自社Instagramアカウント分析 */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-pink-400 flex items-center gap-1.5">
                                            <span>📊</span> 自社Instagram反応分析（アカウント分析AI）
                                        </h3>
                                        <button
                                            onClick={() => runSingleAi('account')}
                                            disabled={Boolean(runningAction) || aiLoading}
                                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-pink-300 rounded text-[11px] font-bold transition disabled:opacity-50"
                                        >
                                            {runningAction === 'account' ? '分析中...' : '🔄 アカウント再分析'}
                                        </button>
                                    </div>
                                    <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap border border-slate-800 leading-relaxed">
                                        {aiData.accountInsights || "過去の分析データはありません。「🔄 アカウント再分析」を実行すると直近の投稿エンゲージメントから改善指示を抽出します。"}
                                    </div>
                                </div>
                            </div>

                            {/* 右カラム：SNS＆DMコンテンツ */}
                            <div className="space-y-5">
                                {/* SNS投稿（3パターン） */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-sky-400 flex items-center gap-1.5">
                                            <span>📱</span> 海外向けSNS投稿（X / Instagram）
                                        </h3>
                                        <button
                                            onClick={() => runSingleAi('sns')}
                                            disabled={Boolean(runningAction) || aiLoading}
                                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[11px] font-bold transition disabled:opacity-50"
                                        >
                                            {runningAction === 'sns' ? '作成中...' : '🔄 投稿文を再生成'}
                                        </button>
                                    </div>

                                    {/* ハイブリッド */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-amber-400 text-[11px]">★ 推奨: トレンド×サヤ ハイブリッド型</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handlePublishToInstagram(aiData.snsPosts.hybridPost, 'hybrid', aiData.profitableCards[0]?.imageUrl)}
                                                    disabled={Boolean(isPublishingInstagram)}
                                                    className="px-2 py-0.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white rounded text-[11px] font-bold transition disabled:opacity-50"
                                                >
                                                    {isPublishingInstagram === 'hybrid' ? '投稿中...' : '📸 IG投稿'}
                                                </button>
                                                <button
                                                    onClick={() => handleCopy(aiData.snsPosts.hybridPost, 'hybrid')}
                                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                                                >
                                                    {copiedKey === 'hybrid' ? '✓ コピー完了' : 'コピー'}
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-2.5 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 leading-relaxed">
                                            {aiData.snsPosts.hybridPost}
                                        </pre>
                                    </div>

                                    {/* サヤ特化 */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-emerald-400 text-[11px]">利益・スプレッド特化型</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handlePublishToInstagram(aiData.snsPosts.arbitragePost, 'arbitrage', aiData.profitableCards[0]?.imageUrl)}
                                                    disabled={Boolean(isPublishingInstagram)}
                                                    className="px-2 py-0.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white rounded text-[11px] font-bold transition disabled:opacity-50"
                                                >
                                                    {isPublishingInstagram === 'arbitrage' ? '投稿中...' : '📸 IG投稿'}
                                                </button>
                                                <button
                                                    onClick={() => handleCopy(aiData.snsPosts.arbitragePost, 'arbitrage')}
                                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                                                >
                                                    {copiedKey === 'arbitrage' ? '✓ コピー完了' : 'コピー'}
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-2.5 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 leading-relaxed">
                                            {aiData.snsPosts.arbitragePost}
                                        </pre>
                                    </div>

                                    {/* トレンド特化 */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-sky-400 text-[11px]">トレンド・考察特化型</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handlePublishToInstagram(aiData.snsPosts.trendPost, 'trend', aiData.profitableCards[0]?.imageUrl)}
                                                    disabled={Boolean(isPublishingInstagram)}
                                                    className="px-2 py-0.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white rounded text-[11px] font-bold transition disabled:opacity-50"
                                                >
                                                    {isPublishingInstagram === 'trend' ? '投稿中...' : '📸 IG投稿'}
                                                </button>
                                                <button
                                                    onClick={() => handleCopy(aiData.snsPosts.trendPost, 'trend')}
                                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                                                >
                                                    {copiedKey === 'trend' ? '✓ コピー完了' : 'コピー'}
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-2.5 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 leading-relaxed">
                                            {aiData.snsPosts.trendPost}
                                        </pre>
                                    </div>
                                </div>

                                {/* 営業DM */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-purple-400 flex items-center gap-1.5">
                                            <span>✉️</span> 大口バイヤー向け営業オファー文
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => runSingleAi('dm')}
                                                disabled={Boolean(runningAction) || aiLoading}
                                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[11px] font-bold transition disabled:opacity-50"
                                            >
                                                {runningAction === 'dm' ? '作成中...' : '🔄 DM文を再生成'}
                                            </button>
                                            {/* 💡 Discord直接送信ボタン */}
                                            <button
                                                onClick={() => handlePublishToDiscord(aiData.salesDM)}
                                                disabled={isPublishingDiscord}
                                                className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold transition disabled:opacity-50 flex items-center gap-1 shadow-sm"
                                            >
                                                {isPublishingDiscord ? '送信中...' : '💬 Discord送信'}
                                            </button>
                                            <button
                                                onClick={() => handleCopy(aiData.salesDM, 'dm')}
                                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                                            >
                                                {copiedKey === 'dm' ? '✓ コピー完了' : 'コピー'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap border border-slate-800 max-h-80 overflow-y-auto leading-relaxed">
                                        {aiData.salesDM}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 2. 既存の注文管理テーブル タブの内容 */}
            {/* ========================================================= */}
            {activeTab === 'orders' && (
                <div className="overflow-x-auto">
                    <h2 className="text-lg font-bold mb-3 text-slate-800">注文一覧</h2>
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
                                let displayWeight = inputs.weight !== undefined ? inputs.weight : (order.weight !== undefined && order.weight !== null ? String(order.weight) : '');
                                const weightVal = parseFloat(displayWeight) || 0;
                                const calculatedFee = calculatedFees[order.id] ?? null;
                                const wiseQuote = wiseQuoteData[order.id] ?? null;
                                const details = calculateInvoiceDetails(order, calculatedFee, hasInvoice, isEditingWeight, wiseQuote);
                                const receivedAmount = details.productTotal + details.proxyFee + details.shippingFee;
                                const shippingServiceName = order.shipping_method;
                                const paymentServiceName = order.payment_method;
                                const isCalculating = calculatingOrders.has(order.id);
                                const calcErrorMsg = calcErrors[order.id];
                                const fullName = order.profiles?.full_name;
                                const companyName = order.profiles?.company_name;
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
                                                #{order.user_order_seq ?? order.order_number ?? '-'}
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
                                                    <div className="flex flex-col items-center leading-tight">
                                                        <span className="font-bold text-slate-800 text-xs">
                                                            {fullName || companyName || '担当者未設定'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveAddressOrder(order)}
                                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 mt-1 rounded transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                                                    >
                                                        詳細
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

                                            <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleGenerateFedExLabel(order.id)}
                                                    disabled={isGeneratingLabel}
                                                    className={`px-2.5 py-1.5 text-white font-bold rounded text-xs shadow-sm transition-colors whitespace-nowrap disabled:opacity-50 ${hasTracking ? 'bg-purple-900 hover:bg-purple-950' : 'bg-purple-700 hover:bg-purple-800'}`}
                                                >
                                                    {isGeneratingLabel ? '処理中...' : hasTracking ? '📄 ラベル表示 (PDF)' : '📦 ラベル作成'}
                                                </button>
                                            </td>

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

                                            <td className="border border-slate-300 p-2 text-right">
                                                <span className="font-bold text-slate-700 text-sm">
                                                    {receivedAmount.toLocaleString()} 円
                                                </span>
                                            </td>

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
                                                <td colSpan={12} className="border border-slate-300 p-4 pl-12">
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
                                                                <span className="text-[10px] text-slate-500 font-medium">送料 ({resolvedShippingDisp})</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-sm font-mono text-slate-800">{details.shippingFee.toLocaleString()} 円</span>
                                                                    <span className="text-[10px] font-mono text-blue-600 font-bold">({weightVal > 0 ? `${weightVal}kg` : '-'})</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                                    決済手数料 {paymentServiceName ? `(${paymentServiceName})` : ''}
                                                                </span>
                                                                <span className="text-sm font-mono text-slate-800">{details.paymentFee.toLocaleString()} 円</span>
                                                            </div>
                                                            <div className="flex flex-col bg-amber-100/50 p-1.5 rounded border border-amber-200 -mt-1 -mb-1 justify-center px-2">
                                                                <span className="text-[10px] text-amber-800 font-bold">お支払い金額</span>
                                                                <span className="text-base font-mono font-bold text-amber-700">{details.grandTotal.toLocaleString()} 円</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white border border-slate-200 rounded shadow-inner p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                                注文商品一覧 ({itemCount}件)
                                                            </h4>
                                                            <BulkStatusSelectForm orderId={order.id} onBulkUpdate={handleBulkStatusUpdate} />
                                                        </div>
                                                        <table className="min-w-full border-collapse border border-slate-200 text-xs text-left">
                                                            <thead>
                                                                <tr className="bg-slate-100 text-slate-700">
                                                                    <th className="border border-slate-200 p-2 font-semibold min-w-[180px]">商品名</th>
                                                                    <th className="border border-slate-200 p-2 font-semibold">URL</th>
                                                                    <th className="border border-slate-200 p-2 font-semibold w-24">備考(サイズ等)</th>
                                                                    <th className="border border-slate-200 p-2 font-semibold w-20 text-center whitespace-nowrap">依頼数量</th>
                                                                    <th className="border border-slate-200 p-2 font-semibold w-24 text-center whitespace-nowrap">確定数量</th>
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
                                                                    const isInhouse = item.url?.startsWith('inhouse://') || item.url?.startsWith('inhouse-item-');
                                                                    const displayPrice = item.price ?? (isInhouse ? item.price_estimated : null);

                                                                    return (
                                                                        <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                                                            <td className="border border-slate-200 p-2">
                                                                                <input
                                                                                    type="text"
                                                                                    defaultValue={item?.title || ''}
                                                                                    placeholder="商品名を入力"
                                                                                    onBlur={(e) => {
                                                                                        const val = e.target.value.trim()
                                                                                        if (val !== (item?.title || '')) handleTitleChange(item.id, val)
                                                                                    }}
                                                                                    className="w-full border border-slate-300 p-1 rounded text-xs font-medium text-slate-800 outline-blue-400"
                                                                                />
                                                                            </td>
                                                                            <td className="border border-slate-200 p-2 max-w-[150px] truncate">
                                                                                {isInhouse ? (
                                                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold border border-blue-300">
                                                                                        In-House Inventory
                                                                                    </span>
                                                                                ) : item.url ? (
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
                                                                                {Number(cartQty).toLocaleString()}
                                                                            </td>
                                                                            <td className="border border-slate-200 p-2 text-center">
                                                                                <input
                                                                                    type="number"
                                                                                    min={1}
                                                                                    defaultValue={adminQty ?? cartQty}
                                                                                    onBlur={(e) => {
                                                                                        const val = Number(e.target.value)
                                                                                        if (val !== adminQty && val > 0) handleQuantityChange(item.id, val)
                                                                                    }}
                                                                                    className="border border-slate-300 p-1 rounded text-xs w-20 text-center font-mono font-bold"
                                                                                />
                                                                            </td>
                                                                            <td className="border border-slate-200 p-2 text-right font-mono text-slate-500">
                                                                                {item.desired_price ? `${Number(item.desired_price).toLocaleString()} 円` : '-'}
                                                                            </td>
                                                                            <td className="border border-slate-200 p-2 text-right">
                                                                                <CurrencyInput
                                                                                    defaultValue={displayPrice}
                                                                                    placeholder="落札/購入額"
                                                                                    onValueChange={(val) => {
                                                                                        if (val !== item.price) handlePriceChange(item.id, val)
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
                                                        <AddAdjustmentForm orderId={order.id} userId={order.user_id} />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* モーダル表示 */}
            {activeAddressOrder && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
                        <div className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-sm flex items-center gap-1.5">
                                <span>🏠 顧客基本情報・お届け先詳細</span>
                                <span className="font-mono text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                                    #{activeAddressOrder.user_order_seq ?? activeAddressOrder.order_number}
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
                                    <div><span className="text-slate-400 block font-bold">担当者名:</span><span className="font-bold text-slate-800">{activeAddressOrder.profiles?.full_name || '未設定'}</span></div>
                                    <div><span className="text-slate-400 block font-bold">会社名:</span><span className="font-medium text-slate-800">{activeAddressOrder.profiles?.company_name || '-'}</span></div>
                                    <div><span className="text-slate-400 block font-bold">電話番号:</span><span className="font-mono font-bold text-slate-800">{activeAddressOrder.profiles?.phone || '未設定'}</span></div>
                                    <div><span className="text-slate-400 block font-bold">連絡用Email:</span><span className="font-mono font-bold text-blue-700">{activeAddressOrder.profiles?.contact_email || activeAddressOrder.profiles?.email || '未設定'}</span></div>
                                    <div><span className="text-slate-400 block font-bold">国:</span><span className="font-bold text-slate-800 font-mono">{activeAddressOrder.shipping_country || activeAddressOrder.profiles?.country || '未設定'}</span></div>
                                    <div><span className="text-slate-400 block font-bold">FedEx No:</span><span className="font-mono font-bold text-purple-700">{activeAddressOrder.profiles?.fedex_account_number || '未登録'}</span></div>
                                    <div><span className="text-slate-400 block font-bold">郵便番号:</span><span className="font-bold text-slate-800 font-mono">{activeAddressOrder.shipping_zip_code || activeAddressOrder.profiles?.zip_code || '未設定'}</span></div>
                                    <div><span className="text-slate-400 block font-bold">納税番号:</span><span className="font-mono text-slate-800">{activeAddressOrder.profiles?.tax_id || '-'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}