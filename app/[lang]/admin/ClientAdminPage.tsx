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
// AIインテリジェンス用の型定義（6項目レポート対応）
// ==========================================
export interface FactItem {
    label: string;
    value: string;
}

export interface RiskAndMitigation {
    risk: string;
    mitigation: string;
}

export interface StrategicReport {
    title: string;
    claim: string;
    reasons: string[];
    facts: FactItem[];
    soWhat: string;
    riskAndMitigation: RiskAndMitigation;
    verificationChecklist: string[];
}

export interface ProfitableCardReport extends StrategicReport {
    cardName: string;
    jpPriceJPY: number;
    usPriceUSD: number;
    estimatedProfitUSD: number;
    imageUrl?: string;
}

export interface SnsPostsData {
    theme: string;
    recommendedTiming: string;
    visualGuideline: {
        coverSlide: string;
        carouselSlides: string[];
    };
    posts: {
        hybridPost: string;
        arbitragePost: string;
        trendPost: string;
    };
    discordCTA: string;
}

export interface SalesDMData {
    targetSegment: string;
    offerSummary: string;
    discordMessage: string;
    commercialTerms: {
        minimumOrderQty: string;
        shippingMethod: string;
        paymentMethod: string;
    };
    negotiationTip: string;
}

export interface IntelligenceData {
    trendInsights: StrategicReport | null;
    profitableCards: StrategicReport | null;
    accountInsights: StrategicReport | null;
    snsPosts: SnsPostsData | null;
    salesDM: SalesDMData | null;
}

// ==========================================
// 1本のドキュメント（報告書）を表示するコンポーネント
// ==========================================
function DocumentReportView({
    report,
    accentColor = 'amber',
    icon = '📄'
}: {
    report: StrategicReport | null;
    accentColor?: 'amber' | 'emerald' | 'pink';
    icon?: string;
}) {
    if (!report || !report.title) return <div className="text-slate-500 text-xs italic">レポートデータがありません</div>;

    const accentClasses = {
        amber: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
        emerald: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
        pink: 'border-pink-500/30 text-pink-300 bg-pink-500/10'
    };
    
    const colorClass = accentClasses[accentColor];

    return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl overflow-hidden font-sans">
            <div className={`p-4 border-b border-slate-700/80 flex items-center gap-3 bg-slate-950/50`}>
                <span className="text-3xl">{icon}</span>
                <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-0.5">Strategic Intelligence Report</span>
                    <h3 className="text-base font-bold text-white leading-tight">{report.title}</h3>
                </div>
            </div>
            <div className="p-5 space-y-5">
                <div className={`p-3 rounded-lg border ${colorClass}`}>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-80 flex items-center gap-1">
                        <span>🎯</span> 1. 結論・推奨アクション (Claim)
                    </h4>
                    <p className="text-sm font-bold leading-relaxed">{report.claim}</p>
                </div>
                <div>
                    <h4 className="text-[11px] font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">💡 2. 戦略的根拠 (Reason)</h4>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pl-1">
                        {report.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 className="text-[11px] font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">📊 3. 客観的データ・市場数値 (Data / Fact)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {report.facts?.map((f, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/60">
                                <span className="text-slate-400 text-[11px]">{f.label}</span>
                                <span className="text-white font-mono font-bold text-xs">{f.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
                    <h4 className="text-[11px] font-bold text-blue-400 mb-1.5">🔍 4. 自社事業への示唆 (So What?)</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{report.soWhat}</p>
                </div>
                <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                    <h4 className="text-[11px] font-bold text-rose-400 mb-2">⚠️ 5. 想定リスクと対抗策 (Counterargument)</h4>
                    <div className="text-xs text-slate-300 space-y-1.5 pl-1">
                        <p><span className="text-rose-400 font-bold mr-1">懸念:</span> {report.riskAndMitigation?.risk}</p>
                        <p><span className="text-emerald-400 font-bold mr-1">対策:</span> {report.riskAndMitigation?.mitigation}</p>
                    </div>
                </div>
                <div className="pt-2">
                    <h4 className="text-[11px] font-bold text-slate-400 mb-2">📋 6. 実務チェックリスト (Fact Check)</h4>
                    <div className="space-y-1.5 pl-1">
                        {report.verificationChecklist?.map((c, i) => (
                            <label key={i} className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-200 group">
                                <input type="checkbox" className="mt-0.5 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5" />
                                <span className="leading-snug">{c}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
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
    const [activeTab, setActiveTab] = useState<'orders' | 'intelligence'>('orders')
    // 🌟 AI Office 用のState（タイムライン / デスク切り替え、チャット入力）
    const [aiActiveDesk, setAiActiveDesk] = useState<string>('analysis_team')
    const [chatCommand, setChatCommand] = useState('')

    // 🌟 チャット用のメッセージ履歴型
    interface ChatMessage {
        id: string;
        sender: string;
        avatar: string;
        text: string;
        isUser: boolean;
        timestamp: string;
    }

    // 🌟 デスク・チームごとのメッセージ履歴 State（初期値は空）
    const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({});
    const [isChatSubmitting, setIsChatSubmitting] = useState<boolean>(false);

    // 🌟 登録済みナレッジ用 State
    interface KnowledgeItem {
        id: string;
        agent_key: string;
        content: string;
        created_at: string;
    }
    const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
    const [showKnowledgePanel, setShowKnowledgePanel] = useState<boolean>(false);

    // デスクに対応する agentKey を取得するヘルパー
    const getActiveAgentKey = (desk: string): string | null => {
        if (desk.startsWith('desk_')) return desk.replace('desk_', '');
        return null;
    };

    // ナレッジ一覧の取得関数
    const fetchKnowledge = async () => {
        const agentKey = getActiveAgentKey(aiActiveDesk);
        try {
            const url = agentKey ? `/api/ai/knowledge?agentKey=${agentKey}` : '/api/ai/knowledge?agentKey=all';
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setKnowledgeList(json.knowledge || []);
        } catch (e) {
            console.error('ナレッジ取得エラー:', e);
        }
    };

    // ナレッジ削除ハンドラー
    const handleDeleteKnowledge = async (id: string) => {
        if (!window.confirm('このナレッジ（学習ルール）を削除しますか？次回からAIはこのルールを参照しなくなります。')) return;
        try {
            const res = await fetch(`/api/ai/knowledge?id=${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setKnowledgeList(prev => prev.filter(k => k.id !== id));
            alert('🗑️ ナレッジを削除しました');
        } catch (err: any) {
            alert(`⚠️ 削除エラー: ${err.message}`);
        }
    };

    // 🌟 ナレッジ登録処理（AI発言・ユーザー発言双方に対応）
    const handlePinKnowledge = async (sender: string, text: string, isUserMessage: boolean = false) => {
        const senderToAgentKey: Record<string, string> = {
            '市場アナリスト': 'trend',
            'アービトラージアナリスト': 'arbitrage',
            'IGアナリスト': 'account',
            'インスタ担当': 'sns',
            '有料コミュニティ担当': 'sales'
        };

        // ユーザーの発言の場合は、現在開いている個別デスクのAIを対象にする
        let agentKey = senderToAgentKey[sender];
        if (isUserMessage) {
            agentKey = getActiveAgentKey(aiActiveDesk) || '';
            if (!agentKey) {
                alert('チームビューでの指示は、個別デスク（アナリストやSNS担当など）を開いてから学習登録してください。');
                return;
            }
        }

        if (!agentKey) return alert('対象のエージェントが特定できません。');

        const confirmMsg = isUserMessage
            ? `あなたのこの指示を、担当AIの「社内ルール（ナレッジ）」として学習させますか？\n\n${text.slice(0, 60)}...`
            : `この発言を「${sender}」の社内ルール（ナレッジ）として学習させますか？\n\n${text.slice(0, 60)}...`;

        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/ai/knowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentKey, content: text }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            alert('📌 ナレッジとして学習・登録しました！次回からこのルールを参考にして回答します。');
            fetchKnowledge(); // 登録後に一覧を即時更新
        } catch (err: any) {
            alert(`⚠️ エラー: ${err.message}`);
        }
    };

    // 🌟 チャット送信処理ハンドラー
    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatCommand.trim() || isChatSubmitting) return;

        const userMsgText = chatCommand.trim();
        const currentTarget = aiActiveDesk;
        const nowTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

        const newUserMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'あなた',
            avatar: '👤',
            text: userMsgText,
            isUser: true,
            timestamp: nowTime,
        };

        // 1. ユーザーの発言を画面に即時反映
        setChatLogs(prev => ({
            ...prev,
            [currentTarget]: [...(prev[currentTarget] || []), newUserMessage]
        }));
        setChatCommand('');
        setIsChatSubmitting(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: currentTarget,
                    message: userMsgText,
                    contextData: aiData || {},
                }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'チャット応答の取得に失敗しました');

            // 2. AIからの返信をチャットログに追加
            const incomingReplies: ChatMessage[] = json.replies.map((rep: any, idx: number) => ({
                id: `${Date.now()}_${idx}`,
                sender: rep.sender,
                avatar: rep.avatar,
                text: rep.text,
                isUser: false,
                timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            }));

            setChatLogs(prev => ({
                ...prev,
                [currentTarget]: [...(prev[currentTarget] || []), ...incomingReplies]
            }));
        } catch (err: any) {
            alert(`⚠️ チャットエラー: ${err.message}`);
        } finally {
            setIsChatSubmitting(false);
        }
    };

    // 🌟 デスク切り替え時にチャット履歴をDBから取得
    useEffect(() => {
        if (activeTab !== 'intelligence') return;

        const fetchChatLogs = async () => {
            try {
                const res = await fetch(`/api/ai/chat?target=${aiActiveDesk}`);
                const json = await res.json();
                if (json.success && json.logs) {
                    const formatted = json.logs.map((log: any) => ({
                        id: log.id,
                        sender: log.sender,
                        avatar: log.avatar,
                        text: log.text,
                        isUser: log.is_user,
                        timestamp: new Date(log.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                    }));
                    setChatLogs(prev => ({ ...prev, [aiActiveDesk]: formatted }));
                }
            } catch (e) {
                console.error('Chat log fetch error:', e);
            }
        };
        fetchChatLogs();
    }, [aiActiveDesk, activeTab]);

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
                body: JSON.stringify({
                    action, 
                    currentData: aiData || {},
                    recordId: selectedRecordId 
                }),
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
                trendInsights: prev?.trendInsights || null,
                profitableCards: prev?.profitableCards || null,
                snsPosts: prev?.snsPosts || {
                    theme: '',
                    recommendedTiming: '',
                    visualGuideline: { coverSlide: '', carouselSlides: [] },
                    posts: { trendPost: '', arbitragePost: '', hybridPost: '' },
                    discordCTA: ''
                },
                salesDM: prev?.salesDM || {
                    targetSegment: '',
                    offerSummary: '',
                    discordMessage: '',
                    commercialTerms: { minimumOrderQty: '', shippingMethod: '', paymentMethod: '' },
                    negotiationTip: ''
                },
                accountInsights: prev?.accountInsights || null,
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
                        trendInsights: latest.trend_insights || null,
                        profitableCards: latest.profitable_cards || null,
                        snsPosts: latest.sns_posts,
                        salesDM: latest.sales_dm,
                        accountInsights: latest.account_insights || null,
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
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'orders'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    <span>📦 注文管理 ({orders.length}件)</span>
                </button>

                <button
                    onClick={() => setActiveTab('intelligence')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'intelligence'
                        ? 'bg-slate-900 text-amber-400 shadow-sm border border-slate-800'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    <span>⚡ AI市場インテリジェンス (日米サヤ & SNS)</span>
                    <span className="bg-amber-400/20 text-amber-600 text-[10px] px-1.5 py-0.5 rounded font-mono">NEW</span>
                </button>
            </div>

            {/* ========================================================= */}
            {/* 1. AI STAFF OFFICE ダッシュボード */}
            {/* ========================================================= */}
            {activeTab === 'intelligence' && (
                <div className="flex h-[820px] bg-slate-950 text-slate-50 overflow-hidden font-sans rounded-xl border border-slate-800 shadow-2xl animate-fadeIn">

                    {/* ① 左サイドバー: ACTIVE TEAM（クリックで個別デスク展開） */}
                    <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                            <div className="flex items-center gap-2.5">
                                <span className="text-2xl">🤖</span>
                                <h1 className="text-base font-bold tracking-wider text-slate-100">AI STAFF OFFICE</h1>
                            </div>
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">5 Agents</span>
                        </div>

                        <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                                Active Team（デスク選択）
                            </h2>

                            {/* 1. アナリスト */}
                            <div
                                onClick={() => setAiActiveDesk('desk_trend')}
                                className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_trend'
                                        ? 'bg-amber-500/10 border-amber-500/60 shadow-sm'
                                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-700">🔮</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-xs font-bold text-slate-200 truncate">市場アナリスト</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">分析</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">海外市場トレンド調査</p>
                                </div>
                            </div>

                            <div
                                onClick={() => setAiActiveDesk('desk_arbitrage')}
                                className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_arbitrage'
                                        ? 'bg-emerald-500/10 border-emerald-500/60 shadow-sm'
                                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-700">💎</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-xs font-bold text-slate-200 truncate">アービトラージアナリスト</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">分析</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">サヤ抜きできる商品調査</p>
                                </div>
                            </div>

                            {/* 3. IG分析ディレクター */}
                            <div
                                onClick={() => setAiActiveDesk('desk_account')}
                                className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_account'
                                        ? 'bg-pink-500/10 border-pink-500/60 shadow-sm'
                                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-700">📊</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-xs font-bold text-slate-200 truncate">IGアナリスト</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-medium">分析</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">自社アカウント反応分析</p>
                                </div>
                            </div>

                            {/* 4. SNS担当 */}
                            <div
                                onClick={() => setAiActiveDesk('desk_sns')}
                                className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_sns'
                                        ? 'bg-sky-500/10 border-sky-500/60 shadow-sm'
                                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-700">📸</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-xs font-bold text-slate-200 truncate">SNS担当</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-medium">実行</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">Instagram原稿＆自動投稿</p>
                                </div>
                            </div>

                            {/* 5. 有料コミュニティ担当 */}
                            <div
                                onClick={() => setAiActiveDesk('desk_sales')}
                                className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_sales'
                                        ? 'bg-purple-500/10 border-purple-500/60 shadow-sm'
                                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-700">✉️</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-xs font-bold text-slate-200 truncate">有料コミュニティ担当</p>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-medium">実行</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">Discord有料コミュニティ投稿</p>
                                </div>
                            </div>
                        </div>

                        {/* 過去履歴セレクター */}
                        <div className="p-3.5 border-t border-slate-800 bg-slate-900">
                            <span className="text-[10px] text-slate-400 mb-1.5 block font-bold">📅 過去のオフィス記録</span>
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
                                className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                            >
                                {history.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {new Date(h.created_at).toLocaleString('ja-JP')} [{h.trigger_type === 'cron' ? '⏰ 自動' : '👤 手動'}]
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ② 右メインエリア */}
                    <div className="flex-1 flex flex-col relative bg-slate-950/50">
                        {/* 上部ヘッダー（2チーム切り替えタブ ＋ 一括実行ボタン） */}
                        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1 border border-slate-800">
                                <button
                                    onClick={() => setAiActiveDesk('analysis_team')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${aiActiveDesk === 'analysis_team'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    <span>📊 分析チーム</span>
                                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">3</span>
                                </button>
                                <button
                                    onClick={() => setAiActiveDesk('execution_team')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${aiActiveDesk === 'execution_team'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    <span>⚡ 実行チーム</span>
                                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">2</span>
                                </button>
                            </div>

                            <button
                                onClick={runIntelligenceAnalysis}
                                disabled={aiLoading || Boolean(runningAction)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-2 disabled:opacity-50 transition active:scale-95"
                            >
                                {aiLoading ? '🔄 チーム一斉稼働中...' : '🚀 全AIに一斉調査を指示'}
                            </button>
                        </header>

                        {/* メインコンテンツ領域 */}
                        <div className="flex-1 overflow-y-auto p-6 pb-28">
                            {!aiData && !aiLoading ? (
                                <div className="text-center py-24 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
                                    右上の「全AIに一斉調査を指示」をクリックすると、全チームが活動を開始します。
                                </div>
                            ) : (
                                <>
                                    {/* 1. 分析チーム ビュー（市場アナリスト + アービトラージアナリスト + IGアナリスト） */}
                                    {/* 1. 分析チーム ビュー */}
                                    {aiActiveDesk === 'analysis_team' && aiData && (
                                        <div className="max-w-5xl mx-auto space-y-6">
                                            <div className="border-b border-slate-800 pb-3 flex justify-between items-end">
                                                <div>
                                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                        <span>📊</span> 市場分析チーム（Intelligence Team）
                                                    </h2>
                                                    <p className="text-xs text-slate-400 mt-1">海外トレンド、サヤ抜き価格差、自社Instagramの反応データを収集・分析中</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                {/* 市場アナリスト */}
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                                                <span>🔮</span> 市場アナリスト
                                                            </h3>
                                                            <button onClick={() => runSingleAi('trend')} disabled={runningAction === 'trend'} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300">
                                                                {runningAction === 'trend' ? '...' : '🔄 再調査'}
                                                            </button>
                                                        </div>
                                                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto space-y-1.5">
                                                            {aiData.trendInsights ? (
                                                                <>
                                                                    <p className="font-bold text-amber-300">{aiData.trendInsights.title}</p>
                                                                    <p className="text-slate-400 text-[11px]">{aiData.trendInsights.claim}</p>
                                                                </>
                                                            ) : "データがありません。"}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setAiActiveDesk('desk_trend')} className="mt-4 text-[11px] text-amber-400 hover:underline text-left block">
                                                        ➔ 分析デスクを開く
                                                    </button>
                                                </div>

                                                {/* アービトラージアナリスト */}
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                                <span>💎</span> アービトラージアナリスト
                                                            </h3>
                                                            <button onClick={() => runSingleAi('arbitrage')} disabled={runningAction === 'arbitrage'} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300">
                                                                {runningAction === 'arbitrage' ? '...' : '🔄 再発掘'}
                                                            </button>
                                                        </div>
                                                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto space-y-1.5">
                                                            {aiData.profitableCards ? (
                                                                <>
                                                                    <p className="font-bold text-emerald-300">{aiData.profitableCards.title}</p>
                                                                    <p className="text-slate-400 text-[11px]">{aiData.profitableCards.claim}</p>
                                                                </>
                                                            ) : "データがありません。"}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setAiActiveDesk('desk_arbitrage')} className="mt-4 text-[11px] text-emerald-400 hover:underline text-left block">
                                                        ➔ 分析デスクを開く
                                                    </button>
                                                </div>

                                                {/* IGアナリスト */}
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h3 className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                                                                <span>📊</span> IGアナリスト
                                                            </h3>
                                                            <button onClick={() => runSingleAi('account')} disabled={runningAction === 'account'} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300">
                                                                {runningAction === 'account' ? '...' : '🔄 再分析'}
                                                            </button>
                                                        </div>
                                                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto space-y-1.5">
                                                            {aiData.accountInsights ? (
                                                                <>
                                                                    <p className="text-pink-300 font-bold text-[11px]">🎯 {aiData.accountInsights.claim}</p>
                                                                    <p className="text-slate-400 text-[10px]">💡 {aiData.accountInsights.soWhat}</p>
                                                                </>
                                                            ) : "データがありません。"}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setAiActiveDesk('desk_account')} className="mt-4 text-[11px] text-pink-400 hover:underline text-left block">
                                                        ➔ 分析デスクを開く
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. 実行チーム ビュー（SNS投稿ディレクター + 営業DM） */}
                                    {aiActiveDesk === 'execution_team' && aiData && (
                                        <div className="max-w-5xl mx-auto space-y-6">
                                            <div className="border-b border-slate-800 pb-3">
                                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                    <span>⚡</span> コンテンツ実行チーム（Execution Team）
                                                </h2>
                                                <p className="text-xs text-slate-400 mt-1">分析データをもとに、SNS投稿と大口バイヤー営業DMの作成・配信を実行</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* SNSディレクター */}
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                                                            <span>📸</span> Instagram投稿（推奨ハイブリッド）
                                                        </h3>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => runSingleAi('sns')} disabled={runningAction === 'sns'} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300">
                                                                {runningAction === 'sns' ? '生成中...' : '🔄 原稿リライト'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-60 overflow-y-auto leading-relaxed">
                                                        {aiData.snsPosts?.posts?.hybridPost}
                                                    </pre>
                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                                        <button onClick={() => setAiActiveDesk('desk_sns')} className="text-[11px] text-sky-400 hover:underline">
                                                            他2パターンを確認 ➔
                                                        </button>
                                                        <button
                                                            onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.hybridPost || '', 'hybrid')}
                                                            disabled={Boolean(isPublishingInstagram)}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                                        >
                                                            {isPublishingInstagram === 'hybrid' ? '投稿中...' : '📸 承認してInstagram投稿'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 有料コミュニティ担当 */}
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                                            <span>✉️</span> Discord 有料コミュニティ投稿
                                                        </h3>
                                                        <button onClick={() => runSingleAi('dm')} disabled={runningAction === 'dm'} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300">
                                                            {runningAction === 'dm' ? '生成中...' : '🔄 DMリライト'}
                                                        </button>
                                                    </div>
                                                    <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-60 overflow-y-auto leading-relaxed">
                                                        {aiData.salesDM?.discordMessage}
                                                    </pre>
                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                                        <button onClick={() => setAiActiveDesk('desk_sales')} className="text-[11px] text-purple-400 hover:underline">
                                                            営業デスク詳細 ➔
                                                        </button>
                                                        <button
                                                            onClick={() => handlePublishToDiscord(aiData.salesDM?.discordMessage || '')}
                                                            disabled={isPublishingDiscord}
                                                            className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                                        >
                                                            {isPublishingDiscord ? '送信中...' : '💬 承認してDiscord送信'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. 個別デスク ビュー群 */}
                                    {aiActiveDesk === 'desk_trend' && aiData && (
                                        <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                           <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">🔮</span>
                                                    <div>
                                                        <h2 className="text-lg font-bold text-white">市場アナリスト専用デスク</h2>
                                                        <p className="text-xs text-slate-400">海外市場トレンド戦略レポート（6項目ペーパー形式）</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => runSingleAi('trend')} disabled={runningAction === 'trend'} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md">
                                                    {runningAction === 'trend' ? '調査中...' : '🔄 最新レポートを作成'}
                                                </button>
                                            </div>
                                            <DocumentReportView report={aiData.trendInsights} accentColor="amber" icon="📈" />
                                        </div>
                                    )}

                                    {aiActiveDesk === 'desk_arbitrage' && aiData && (
                                        <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">💎</span>
                                                    <div>
                                                        <h2 className="text-lg font-bold text-white">アービトラージアナリスト専用デスク</h2>
                                                        <p className="text-xs text-slate-400">日米サヤ抜き投資判断レポート</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => runSingleAi('arbitrage')} disabled={runningAction === 'arbitrage'} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md">
                                                    {runningAction === 'arbitrage' ? '計算中...' : '🔄 サヤ抜き査定を実行'}
                                                </button>
                                            </div>
                                            <DocumentReportView report={aiData.profitableCards} accentColor="emerald" icon="⚖️" />
                                        </div>
                                    )}

                                    {aiActiveDesk === 'desk_account' && aiData && (
                                        <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">📊</span>
                                                    <div>
                                                        <h2 className="text-lg font-bold text-white">IGアナリスト専用デスク</h2>
                                                        <p className="text-xs text-slate-400">自社アカウント反応分析・ファネル改善レポート</p>
                                                   </div>
                                                </div>
                                                <button onClick={() => runSingleAi('account')} disabled={runningAction === 'account'} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md">
                                                    {runningAction === 'account' ? '分析中...' : '🔄 アカウント再分析'}
                                                </button>
                                            </div>
                                            <DocumentReportView report={aiData.accountInsights} accentColor="pink" icon="📱" />
                                        </div>
                                    )}

                                    {aiActiveDesk === 'desk_sns' && aiData && (
                                        <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">📸</span>
                                                    <div>
                                                        <h2 className="text-lg font-bold text-white">SNS担当専用デスク</h2>
                                                        <p className="text-xs text-slate-400">Instagramカルーセル構成 ＆ Discord誘導キャプション</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => runSingleAi('sns')} disabled={runningAction === 'sns'} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold">
                                                    {runningAction === 'sns' ? '作成中...' : '🔄 全パターン再生成'}
                                                </button>
                                            </div>

                                            {/* 🌟 カルーセル画像指示 & 投稿タイミング */}
                                            <div className="bg-slate-900 border border-sky-500/30 rounded-xl p-4 text-xs space-y-2">
                                                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                                    <span className="font-bold text-sky-300">🎨 推奨カルーセルスライド構成</span>
                                                    <span className="font-mono text-slate-400">⏰ {aiData.snsPosts?.recommendedTiming}</span>
                                                </div>
                                                <p className="text-slate-300 font-medium">1枚目(カバー): {aiData.snsPosts?.visualGuideline?.coverSlide}</p>
                                                <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-2">
                                                    {aiData.snsPosts?.visualGuideline?.carouselSlides?.map((slide, i) => (
                                                        <li key={i}>{slide}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* 3パターンキャプション */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* ハイブリッド */}
                                                <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <span className="text-xs font-bold text-amber-400 block mb-2">★ 推奨: トレンド×サヤ</span>
                                                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">
                                                            {aiData.snsPosts?.posts?.hybridPost}
                                                        </pre>
                                                    </div>
                                                    <div className="flex gap-2">
                                                       <button onClick={() => handleCopy(aiData.snsPosts?.posts?.hybridPost || '', 'hybrid')}>コピー</button>
                                                       <button onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.hybridPost || '', 'hybrid')}>IG投稿</button>
                                                    </div>
                                                </div>

                                                {/* サヤ特化 */}
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <span className="text-xs font-bold text-emerald-400 block mb-2">利益・価格差重視</span>
                                                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">
                                                            {aiData.snsPosts?.posts?.arbitragePost}
                                                        </pre>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleCopy(aiData.snsPosts?.posts?.arbitragePost || '', 'arbitrage')}>コピー</button>
                                                        <button onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.arbitragePost || '', 'arbitrage')} className="text-[11px] bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
                                                    </div>
                                                </div>

                                                {/* トレンド特化 */}
                                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                                    <div>
                                                        <span className="text-xs font-bold text-sky-400 block mb-2">考察・トレンド重視</span>
                                                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">
                                                            {aiData.snsPosts?.posts?.trendPost}
                                                        </pre>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleCopy(aiData.snsPosts?.posts?.trendPost || '', 'trend')} className="text-[11px] bg-slate-800 px-2 py-1 rounded text-slate-300">コピー</button>
                                                        <button onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.trendPost || '', 'trend')} className="text-[11px] bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {aiActiveDesk === 'desk_sales' && aiData && (
                                        <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">✉️</span>
                                                    <div>
                                                        <h2 className="text-lg font-bold text-white">有料コミュニティ担当専用デスク（限定Discordコミュニティ）</h2>
                                                        <p className="text-xs text-slate-400">大口バイヤー向け実務商談オファー（MOQ・商条件付き）</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => runSingleAi('dm')} disabled={runningAction === 'dm'} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold">
                                                    {runningAction === 'dm' ? '作成中...' : '🔄 営業文再生成'}
                                                </button>
                                            </div>

                                            {/* 🌟 商条件 ＆ 交渉対策 */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 space-y-1">
                                                    <span className="font-bold text-indigo-300 block mb-1">📦 取引条件 (Commercial Terms)</span>
                                                    <p className="text-slate-300">最低ロット: <span className="text-white font-mono">{aiData.salesDM?.commercialTerms?.minimumOrderQty}</span></p>
                                                    <p className="text-slate-300">配送便: <span className="text-white">{aiData.salesDM?.commercialTerms?.shippingMethod}</span></p>
                                                    <p className="text-slate-300">決済方法: <span className="text-white">{aiData.salesDM?.commercialTerms?.paymentMethod}</span></p>
                                                </div>
                                                <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 space-y-1">
                                                    <span className="font-bold text-amber-300 block mb-1">🤝 価格交渉対策 (Negotiation Tip)</span>
                                                    <p className="text-slate-300 leading-relaxed text-[11px]">{aiData.salesDM?.negotiationTip}</p>
                                                </div>
                                            </div>

                                            {/* Discord投稿用メッセージ */}
                                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-white">{aiData.salesDM?.offerSummary}</span>
                                                    <span className="text-slate-400 font-mono text-[10px]">Target: {aiData.salesDM?.targetSegment}</span>
                                                </div>
                                                <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                                                    {aiData.salesDM?.discordMessage}
                                                </pre>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleCopy(aiData.salesDM?.discordMessage || '', 'dm')} className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">
                                                        {copiedKey === 'dm' ? '✓ コピー完了' : 'コピー'}
                                                    </button>
                                                    <button onClick={() => handlePublishToDiscord(aiData.salesDM?.discordMessage || '')} disabled={isPublishingDiscord} className="text-xs font-bold px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg flex items-center gap-1.5 shadow-sm">
                                                        {isPublishingDiscord ? '送信中...' : '💬 Discord有料コミュニティへ送信'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 🌟 チーム・デスク共通のチャットスレッド表示 */}
                                    <div className="mt-8 border-t border-slate-800 pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                                <span>💬</span>
                                                <span>
                                                    {aiActiveDesk === 'analysis_team' && '分析チーム（3名）とのチャット'}
                                                    {aiActiveDesk === 'execution_team' && '実行チーム（2名）とのチャット'}
                                                    {aiActiveDesk === 'desk_trend' && '市場アナリストとの個別チャット'}
                                                    {aiActiveDesk === 'desk_arbitrage' && 'アービトラージアナリストとの個別チャット'}
                                                    {aiActiveDesk === 'desk_account' && 'IGアナリストとの個別チャット'}
                                                    {aiActiveDesk === 'desk_sns' && 'SNS担当との個別チャット'}
                                                    {aiActiveDesk === 'desk_sales' && '有料コミュニティ担当との個別チャット'}
                                                </span>
                                            </h3>

                                            <div className="flex items-center gap-3">
                                                {/* 🌟 ナレッジ管理アコーディオン切り替えボタン */}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
                                                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-all"
                                                >
                                                    <span>📖 蓄積ナレッジ ({knowledgeList.length})</span>
                                                    <span>{showKnowledgePanel ? '▲' : '▼'}</span>
                                                </button>

                                                {isChatSubmitting && (
                                                    <span className="text-[10px] text-blue-400 animate-pulse font-mono flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                                                        AIが入力中...
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 🌟 ナレッジ一覧管理パネル（展開時） */}
                                        {showKnowledgePanel && (
                                            <div className="mb-4 bg-slate-900 border border-amber-500/40 rounded-xl p-4 animate-fadeIn shadow-lg">
                                                <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-2">
                                                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                                        <span>🧠</span> 学習済み社内ルール一覧（Geminiプロンプトへ自動注入中）
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">不要になったルールはゴミ箱で削除可能</span>
                                                </div>

                                                {knowledgeList.length === 0 ? (
                                                    <p className="text-xs text-slate-500 py-3 text-center">まだ登録されたルールはありません。チャットから「📌 ルールとして学習」を押すと蓄積されます。</p>
                                                ) : (
                                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                        {knowledgeList.map((item) => (
                                                            <div key={item.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-start gap-3">
                                                                <div className="text-xs text-slate-300 flex-1 whitespace-pre-wrap leading-relaxed">
                                                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono mr-2">
                                                                        {item.agent_key}
                                                                    </span>
                                                                    {item.content}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteKnowledge(item.id)}
                                                                    className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 bg-slate-900 hover:bg-red-500/10 rounded transition-colors"
                                                                    title="このルールを削除"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* チャットふきだし一覧 */}
                                        <div className="space-y-3 bg-slate-900/40 rounded-xl p-4 border border-slate-800/80 max-h-72 overflow-y-auto">
                                            {(chatLogs[aiActiveDesk] || []).map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex gap-3 text-xs ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    {!msg.isUser && (
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-base">
                                                            {msg.avatar}
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm ${msg.isUser
                                                            ? 'bg-blue-600 text-white rounded-br-none'
                                                            : 'bg-slate-800 border border-slate-700/60 text-slate-200 rounded-bl-none'
                                                        }`}>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-[11px] opacity-80">{msg.sender}</span>
                                                            <span className="text-[9px] opacity-50 font-mono">{msg.timestamp}</span>
                                                        </div>
                                                        <div className="whitespace-pre-wrap">{msg.text}</div>

                                                        {/* AIのメッセージの場合：学習ボタン */}
                                                        {!msg.isUser && (
                                                            <div className="mt-2 pt-2 border-t border-slate-700/50 text-right">
                                                                <button
                                                                    onClick={() => handlePinKnowledge(msg.sender, msg.text, false)}
                                                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 ml-auto transition-colors"
                                                                >
                                                                    <span>📌</span> 回答をルールとして学習
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* 🌟 ユーザーのメッセージの場合：直接ルール化ボタン（個別デスク時のみ） */}
                                                        {msg.isUser && aiActiveDesk.startsWith('desk_') && (
                                                            <div className="mt-2 pt-2 border-t border-blue-500/50 text-right">
                                                                <button
                                                                    onClick={() => handlePinKnowledge('YOU', msg.text, true)}
                                                                    className="text-[10px] text-blue-100 hover:text-white font-bold flex items-center gap-1 ml-auto transition-colors opacity-90 hover:opacity-100"
                                                                >
                                                                    <span>📌</span> この指示を社内ルール化
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {msg.isUser && (
                                                        <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0 text-white text-xs font-bold">
                                                            YOU
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 下部コマンドバー（全画面共通） */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
                            <form
                                onSubmit={handleSendChatMessage}
                                className="max-w-4xl mx-auto relative shadow-2xl"
                            >
                                <input
                                    value={chatCommand}
                                    disabled={isChatSubmitting}
                                    onChange={e => setChatCommand(e.target.value)}
                                    placeholder={
                                        aiActiveDesk === 'analysis_team' ? '分析チーム全員に質問・指示を出す...' :
                                            aiActiveDesk === 'execution_team' ? '実行チーム全員に質問・指示を出す...' :
                                                'この担当AIにチャットを送る...'
                                    }
                                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-4 pr-16 py-3.5 focus:outline-none focus:border-blue-500 shadow-inner disabled:opacity-60"
                                />
                                <button
                                    type="submit"
                                    disabled={isChatSubmitting || !chatCommand.trim()}
                                    className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg shadow-sm transition text-xs font-bold disabled:opacity-40"
                                >
                                    {isChatSubmitting ? '...' : '送信'}
                                </button>
                            </form>
                        </div>
                    </div>
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