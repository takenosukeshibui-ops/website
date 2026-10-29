'use client'
import React, { useState, useEffect } from 'react';

// ==========================================
// AIインテリジェンス用の型定義
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

export interface ChiefPackageData {
    selectedLeadMagnetType: 'TypeA_Arbitrage' | 'TypeB_Trend';
    winningRegion: 'us' | 'eu' | 'asia';
    chosenCardOrItem: string;
    selectionReason: string;
    coreHookFact: string;
    creativeDirective: {
        instagramAngle: string;
        discordOfferAngle: string;
    };
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

export type RegionKey = 'us' | 'eu' | 'asia';

export interface RegionalContainer<T> {
    us: T | null;
    eu: T | null;
    asia: T | null;
}

export interface IntelligenceData {
    trendInsights: RegionalContainer<StrategicReport> | null;
    profitableCards: RegionalContainer<StrategicReport> | null;
    chiefPackage: ChiefPackageData | null;
    accountInsights: StrategicReport | null;
    snsPosts: SnsPostsData | null;
    salesDM: SalesDMData | null;
}

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

export default function AiDashboard() {
    const [aiActiveDesk, setAiActiveDesk] = useState<string>('analysis_team');
    const [chatCommand, setChatCommand] = useState('');

    const [activeTrendRegion, setActiveTrendRegion] = useState<RegionKey>('us');
    const [activeArbitrageRegion, setActiveArbitrageRegion] = useState<RegionKey>('us');

    interface ChatMessage {
        id: string;
        sender: string;
        avatar: string;
        text: string;
        isUser: boolean;
        timestamp: string;
    }

    const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({});
    const [isChatSubmitting, setIsChatSubmitting] = useState<boolean>(false);

    interface KnowledgeItem {
        id: string;
        agent_key: string;
        content: string;
        created_at: string;
    }
    const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
    const [showKnowledgePanel, setShowKnowledgePanel] = useState<boolean>(false);

    const getActiveAgentKey = (desk: string): string | null => {
        if (desk.startsWith('desk_trend_')) return 'trend';
        if (desk.startsWith('desk_arbitrage_')) return 'arbitrage';
        if (desk.startsWith('desk_')) return desk.replace('desk_', '');
        return null;
    };

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

    const handlePinKnowledge = async (sender: string, text: string, isUserMessage: boolean = false) => {
        const senderToAgentKey: Record<string, string> = {
            'チーフマネージャー': 'chief',
            '市場アナリスト': 'trend',
            'アービトラージアナリスト': 'arbitrage',
            'IGアナリスト': 'account',
            'インスタ担当': 'sns',
            '有料コミュニティ担当': 'sales'
        };

        let agentKey = senderToAgentKey[sender];
        if (isUserMessage) {
            agentKey = getActiveAgentKey(aiActiveDesk) || '';
            if (!agentKey) {
                alert('チームビューでの指示は、個別デスクを開いてから学習登録してください。');
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
            fetchKnowledge();
        } catch (err: any) {
            alert(`⚠️ エラー: ${err.message}`);
        }
    };

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

    useEffect(() => {
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
    }, [aiActiveDesk]);

    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [runningAction, setRunningAction] = useState<string | null>(null);
    const [aiData, setAiData] = useState<IntelligenceData | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

    const [isPublishingDiscord, setIsPublishingDiscord] = useState<boolean>(false);
    const [isPublishingInstagram, setIsPublishingInstagram] = useState<string | null>(null);

    const runSingleAi = async (action: 'trend' | 'arbitrage' | 'chief' | 'account' | 'sns' | 'dm', region?: RegionKey) => {
        const actionKey = region ? `${action}_${region}` : action;
        setRunningAction(actionKey);
        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action, 
                    currentData: aiData || {},
                    recordId: selectedRecordId,
                    region: region || 'us'
                }),
            });

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const errorText = await res.text();
                throw new Error(`サーバーエラー (${res.status}): ${errorText.slice(0, 200)}`);
            }

            const json = await res.json();
            if (!json.success) throw new Error(json.error || '生成失敗');

            setAiData(prev => ({
                trendInsights: prev?.trendInsights || { us: null, eu: null, asia: null },
                profitableCards: prev?.profitableCards || { us: null, eu: null, asia: null },
                chiefPackage: prev?.chiefPackage || null,
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

    const runIntelligenceAnalysis = async () => {
        setAiLoading(true);
        setAiError(null);

        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'all' }),
            });

            if (!res.ok) throw new Error(`通信エラー: ${res.statusText}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || '分析失敗');

            setAiData(json.data);

            const historyRes = await fetch('/api/ai/intelligence');
            const historyJson = await historyRes.json();
            if (historyJson.success && historyJson.history) {
                setHistory(historyJson.history);
                setSelectedRecordId(json.savedRecordId || historyJson.history[0]?.id);
            }
        } catch (err: any) {
            setAiError(err.message || '予期せぬエラー');
        } finally {
            setAiLoading(false);
        }
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handlePublishToDiscord = async (content: string) => {
        if (!window.confirm('Discordの大口バイヤー用チャンネルへ直接オファー文を送信しますか？')) return;

        setIsPublishingDiscord(true);
        try {
            const res = await fetch('/api/ai/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'discord', content }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            alert(`✅ ${json.message}`);
        } catch (err: any) {
            alert(`⚠️ 送信エラー: ${err.message}`);
        } finally {
            setIsPublishingDiscord(false);
        }
    };

    const handlePublishToInstagram = async (content: string, typeKey: string, imageUrl?: string) => {
        if (!window.confirm('この内容を Instagram (worldwidejapan2023) に自動投稿しますか？')) return;

        setIsPublishingInstagram(typeKey);
        try {
            const res = await fetch('/api/ai/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'instagram', content, imageUrl }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            alert(`✅ ${json.message}`);
        } catch (err: any) {
            alert(`⚠️ Instagram投稿エラー: ${err.message}`);
        } finally {
            setIsPublishingInstagram(null);
        }
    };

    useEffect(() => {
        const fetchLatestHistory = async () => {
            try {
                const res = await fetch('/api/ai/intelligence');
                const json = await res.json();
                if (json.success && json.history && json.history.length > 0) {
                    setHistory(json.history);
                    const latest = json.history[0];
                    setAiData({
                        trendInsights: latest.trend_insights || { us: null, eu: null, asia: null },
                        profitableCards: latest.profitable_cards || { us: null, eu: null, asia: null },
                        chiefPackage: latest.chief_package || null,
                        snsPosts: latest.sns_posts,
                        salesDM: latest.sales_dm,
                        accountInsights: latest.account_insights || null,
                    });
                    setSelectedRecordId(latest.id);
                }
            } catch (e) {
                console.error('履歴取得エラー:', e);
            }
        };
        fetchLatestHistory();
    }, []);

    return (
        <div className="flex h-[820px] bg-slate-950 text-slate-50 overflow-hidden font-sans rounded-xl border border-slate-800 shadow-2xl animate-fadeIn">
            {/* ① 左サイドバー */}
            <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🤖</span>
                        <h1 className="text-base font-bold tracking-wider text-slate-100">AI STAFF OFFICE</h1>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">階層型 9 Agents</span>
                </div>

                <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                    <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Command & Desks
                    </h2>

                    {/* 👑 チーフマネージャーデスク */}
                    <div
                        onClick={() => setAiActiveDesk('desk_chief')}
                        className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_chief'
                            ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-800/60 border-amber-500/30 hover:bg-slate-800/90'
                        }`}
                    >
                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-xl shrink-0 border border-amber-500/40 text-amber-300">👑</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <p className="text-xs font-bold text-amber-200 truncate">チーフマネージャー</p>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold">統括</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">6レポート審査・最優秀案件選定</p>
                        </div>
                    </div>

                    {/* 🔮 市場トレンドアナリスト（米・欧・亜 展開選択） */}
                    <div className="border border-slate-700/60 rounded-xl p-2 bg-slate-900/60">
                        <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-amber-300">
                            <span className="flex items-center gap-1.5"><span>🔮</span> 市場トレンドアナリスト</span>
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">3名</span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                            {([
                                { key: 'us', label: '🇺🇸 北米担当', desc: 'eBay / TCGPlayer' },
                                { key: 'eu', label: '🇪🇺 欧州担当', desc: 'Cardmarket / EU' },
                                { key: 'asia', label: '🌏 アジア担当', desc: 'Shopee / アジア圏' }
                            ] as const).map(item => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveTrendRegion(item.key);
                                        setAiActiveDesk(`desk_trend_${item.key}`);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition ${
                                        aiActiveDesk === `desk_trend_${item.key}`
                                            ? 'bg-amber-600 text-white font-bold shadow'
                                            : 'text-slate-300 hover:bg-slate-800/80'
                                    }`}
                                >
                                    <span>{item.label}</span>
                                    <span className="text-[10px] opacity-60 font-mono">{item.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 💎 アービトラージアナリスト（米・欧・亜 展開選択） */}
                    <div className="border border-slate-700/60 rounded-xl p-2 bg-slate-900/60">
                        <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-emerald-300">
                            <span className="flex items-center gap-1.5"><span>💎</span> アービトラージアナリスト</span>
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">3名</span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                            {([
                                { key: 'us', label: '🇺🇸 北米サヤ', desc: '日米・eBay・FedEx' },
                                { key: 'eu', label: '🇪🇺 欧州サヤ', desc: '日欧・Cardmarket' },
                                { key: 'asia', label: '🌏 アジアサヤ', desc: '日亜・Shopee' }
                            ] as const).map(item => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveArbitrageRegion(item.key);
                                        setAiActiveDesk(`desk_arbitrage_${item.key}`);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition ${
                                        aiActiveDesk === `desk_arbitrage_${item.key}`
                                            ? 'bg-emerald-600 text-white font-bold shadow'
                                            : 'text-slate-300 hover:bg-slate-800/80'
                                    }`}
                                >
                                    <span>{item.label}</span>
                                    <span className="text-[10px] opacity-60 font-mono">{item.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* IGアナリスト */}
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

                    {/* SNS担当 */}
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

                    {/* 有料コミュニティ担当 */}
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

                <div className="p-3.5 border-t border-slate-800 bg-slate-900">
                    <span className="text-[10px] text-slate-400 mb-1.5 block font-bold">📅 過去のオフィス記録</span>
                    <select
                        value={selectedRecordId || ''}
                        disabled={aiLoading || Boolean(runningAction)}
                        onChange={(e) => {
                            const target = history.find(h => h.id === e.target.value);
                            if (target) {
                                setSelectedRecordId(target.id);
                                setAiData({
                                    trendInsights: target.trend_insights || { us: null, eu: null, asia: null },
                                    profitableCards: target.profitable_cards || { us: null, eu: null, asia: null },
                                    chiefPackage: target.chief_package || null,
                                    snsPosts: target.sns_posts,
                                    salesDM: target.sales_dm,
                                    accountInsights: target.account_insights,
                                });
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
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">7名</span>
                        </button>
                        <button
                            onClick={() => setAiActiveDesk('desk_chief')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${aiActiveDesk === 'desk_chief'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <span>👑 チーフ戦略</span>
                            {aiData?.chiefPackage && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-bold">決定済</span>}
                        </button>
                        <button
                            onClick={() => setAiActiveDesk('execution_team')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${aiActiveDesk === 'execution_team'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <span>⚡ 実行チーム</span>
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">2名</span>
                        </button>
                    </div>

                    <button
                        onClick={runIntelligenceAnalysis}
                        disabled={aiLoading || Boolean(runningAction)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-2 disabled:opacity-50 transition active:scale-95"
                    >
                        {aiLoading ? '🔄 階層型パイプライン稼働中...' : '🚀 全AIに一斉調査・戦略立案を指示'}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 pb-28">
                    {!aiData && !aiLoading ? (
                        <div className="text-center py-24 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
                            右上の「全AIに一斉調査・戦略立案を指示」をクリックすると、リサーチからチーフ審査、投稿制作まで自動で実行されます。
                        </div>
                    ) : (
                        <>
                            {/* 👑 チーフマネージャー専用デスク ビュー */}
                            {aiActiveDesk === 'desk_chief' && (
                                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">👑</span>
                                            <div>
                                                <h2 className="text-lg font-bold text-white">チーフマネージャー戦略デスク</h2>
                                                <p className="text-xs text-slate-400">6地域レポートから最優秀撒き餌案件を審査・ディレクション指示発行[cite: 1]</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => runSingleAi('chief')}
                                            disabled={Boolean(runningAction)}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md"
                                        >
                                            {runningAction === 'chief' ? '審査中...' : '🔄 案件を再審査・選定'}
                                        </button>
                                    </div>

                                    {aiData?.chiefPackage ? (
                                        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-5 shadow-xl">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                                <div>
                                                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold block mb-1">Winning Lead Magnet Package</span>
                                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                        <span>🏆</span>
                                                        <span>{aiData.chiefPackage.chosenCardOrItem}</span>
                                                    </h3>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-bold">
                                                        {aiData.chiefPackage.selectedLeadMagnetType === 'TypeA_Arbitrage' ? 'タイプA: 確定利ざや' : 'タイプB: 市場トレンド'}[cite: 1]
                                                    </span>
                                                    <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-bold uppercase">
                                                        対象地域: {aiData.chiefPackage.winningRegion}
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-bold text-slate-300 mb-1.5">⚖️ チーフの選定理由（戦略的根拠）</h4>
                                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                                                    {aiData.chiefPackage.selectionReason}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-bold text-amber-400 mb-1.5">🎯 無料SNS用『撒き餌』フック（Fact & Result）</h4>
                                                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-200 leading-relaxed">
                                                    {aiData.chiefPackage.coreHookFact}
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1 block">※国内仕入れルートや具体的手配方法（Reason/Action）は秘匿され、Discord・サイトへ誘導します[cite: 1]。</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <div className="bg-slate-950 p-3 rounded-lg border border-sky-500/30">
                                                    <h5 className="text-xs font-bold text-sky-400 mb-1">📸 SNSクリエイターへの指示</h5>
                                                    <p className="text-xs text-slate-400 leading-relaxed">{aiData.chiefPackage.creativeDirective?.instagramAngle}</p>
                                                </div>
                                                <div className="bg-slate-950 p-3 rounded-lg border border-purple-500/30">
                                                    <h5 className="text-xs font-bold text-purple-400 mb-1">✉️ 有料コミュニティ担当への指示</h5>
                                                    <p className="text-xs text-slate-400 leading-relaxed">{aiData.chiefPackage.creativeDirective?.discordOfferAngle}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
                                            まだチーフの選定が行われていません。「全AIに一斉調査・戦略立案を指示」または「案件を再審査・選定」を実行してください。
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 1. 分析チーム ビュー */}
                            {aiActiveDesk === 'analysis_team' && aiData && (
                                <div className="max-w-5xl mx-auto space-y-6">
                                    <div className="border-b border-slate-800 pb-3 flex justify-between items-end">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <span>📊</span> 市場分析チーム（米・欧・亜 リサーチ＆診断）
                                            </h2>
                                            <p className="text-xs text-slate-400 mt-1">3地域の市場トレンド・利ざやアービトラージ・自社Instagram反応を並行分析中</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {/* 市場トレンドアナリスト */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                                        <span>🔮</span> 市場トレンド (3地域)
                                                    </h3>
                                                    <button
                                                        onClick={() => runSingleAi('trend', activeTrendRegion)}
                                                        disabled={Boolean(runningAction)}
                                                        className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300"
                                                    >
                                                        {runningAction === `trend_${activeTrendRegion}` ? '...' : '🔄 調査'}
                                                    </button>
                                                </div>
                                                <div className="flex gap-1 mb-2">
                                                    {(['us', 'eu', 'asia'] as const).map(reg => (
                                                        <button
                                                            key={reg}
                                                            onClick={() => setActiveTrendRegion(reg)}
                                                            className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${activeTrendRegion === reg ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                                        >
                                                            {reg === 'us' ? '🇺🇸 米' : reg === 'eu' ? '🇪🇺 欧' : '🌏 亜'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto space-y-1.5">
                                                    {aiData.trendInsights?.[activeTrendRegion] ? (
                                                        <>
                                                            <p className="font-bold text-amber-300">{aiData.trendInsights[activeTrendRegion]?.title}</p>
                                                            <p className="text-slate-400 text-[11px]">{aiData.trendInsights[activeTrendRegion]?.claim}</p>
                                                        </>
                                                    ) : <span className="text-slate-600 italic">該当地域のデータなし</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => setAiActiveDesk(`desk_trend_${activeTrendRegion}`)} className="mt-4 text-[11px] text-amber-400 hover:underline text-left block">
                                                ➔ トレンドデスクを開く
                                            </button>
                                        </div>

                                        {/* アービトラージアナリスト */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                        <span>💎</span> アービトラージ (3地域)
                                                    </h3>
                                                    <button
                                                        onClick={() => runSingleAi('arbitrage', activeArbitrageRegion)}
                                                        disabled={Boolean(runningAction)}
                                                        className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300"
                                                    >
                                                        {runningAction === `arbitrage_${activeArbitrageRegion}` ? '...' : '🔄 査定'}
                                                    </button>
                                                </div>
                                                <div className="flex gap-1 mb-2">
                                                    {(['us', 'eu', 'asia'] as const).map(reg => (
                                                        <button
                                                            key={reg}
                                                            onClick={() => setActiveArbitrageRegion(reg)}
                                                            className={`px-2 py-0.5 text-[10px] rounded font-bold transition ${activeArbitrageRegion === reg ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                                        >
                                                            {reg === 'us' ? '🇺🇸 米' : reg === 'eu' ? '🇪🇺 欧' : '🌏 亜'}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto space-y-1.5">
                                                    {aiData.profitableCards?.[activeArbitrageRegion] ? (
                                                        <>
                                                            <p className="font-bold text-emerald-300">{aiData.profitableCards[activeArbitrageRegion]?.title}</p>
                                                            <p className="text-slate-400 text-[11px]">{aiData.profitableCards[activeArbitrageRegion]?.claim}</p>
                                                        </>
                                                    ) : <span className="text-slate-600 italic">該当地域のデータなし</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => setAiActiveDesk(`desk_arbitrage_${activeArbitrageRegion}`)} className="mt-4 text-[11px] text-emerald-400 hover:underline text-left block">
                                                ➔ アービトラージデスクを開く
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

                            {/* 2. 実行チーム ビュー */}
                            {aiActiveDesk === 'execution_team' && aiData && (
                                <div className="max-w-5xl mx-auto space-y-6">
                                    <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <span>⚡</span> コンテンツ実行チーム（Execution Team）
                                            </h2>
                                            <p className="text-xs text-slate-400 mt-1">チーフマネージャーの指示書に基づき、SNS投稿と大口バイヤー営業DMを作成・配信[cite: 1]</p>
                                        </div>
                                        {aiData.chiefPackage && (
                                            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg">
                                                対象: {aiData.chiefPackage.chosenCardOrItem}
                                            </span>
                                        )}
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
                            {aiActiveDesk.startsWith('desk_trend') && aiData && (
                                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">🔮</span>
                                            <div>
                                                <h2 className="text-lg font-bold text-white">
                                                    市場トレンドアナリスト ({activeTrendRegion === 'us' ? '🇺🇸 北米' : activeTrendRegion === 'eu' ? '🇪🇺 欧州' : '🌏 アジア'})
                                                </h2>
                                                <p className="text-xs text-slate-400">海外市場トレンド先行兆候調査（地域専任）[cite: 1]</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                                {(['us', 'eu', 'asia'] as const).map(reg => (
                                                    <button
                                                        key={reg}
                                                        onClick={() => {
                                                            setActiveTrendRegion(reg);
                                                            setAiActiveDesk(`desk_trend_${reg}`);
                                                        }}
                                                        className={`px-3 py-1 text-xs font-bold rounded transition ${activeTrendRegion === reg ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                                    >
                                                        {reg === 'us' ? '🇺🇸 北米' : reg === 'eu' ? '🇪🇺 欧州' : '🌏 アジア'}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => runSingleAi('trend', activeTrendRegion)}
                                                disabled={Boolean(runningAction)}
                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md"
                                            >
                                                {runningAction === `trend_${activeTrendRegion}` ? '調査中...' : `🔄 ${activeTrendRegion.toUpperCase()}担当に調査指示`}
                                            </button>
                                        </div>
                                    </div>
                                    <DocumentReportView report={aiData.trendInsights?.[activeTrendRegion] || null} accentColor="amber" icon="📈" />
                                </div>
                            )}

                            {aiActiveDesk.startsWith('desk_arbitrage') && aiData && (
                                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">💎</span>
                                            <div>
                                                <h2 className="text-lg font-bold text-white">
                                                    アービトラージアナリスト ({activeArbitrageRegion === 'us' ? '🇺🇸 北米' : activeArbitrageRegion === 'eu' ? '🇪🇺 欧州' : '🌏 アジア'})
                                                </h2>
                                                <p className="text-xs text-slate-400">実質純利益（Net ROI）査定レポート（地域専任）[cite: 1]</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                                {(['us', 'eu', 'asia'] as const).map(reg => (
                                                    <button
                                                        key={reg}
                                                        onClick={() => {
                                                            setActiveArbitrageRegion(reg);
                                                            setAiActiveDesk(`desk_arbitrage_${reg}`);
                                                        }}
                                                        className={`px-3 py-1 text-xs font-bold rounded transition ${activeArbitrageRegion === reg ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                                    >
                                                        {reg === 'us' ? '🇺🇸 北米' : reg === 'eu' ? '🇪🇺 欧州' : '🌏 アジア'}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => runSingleAi('arbitrage', activeArbitrageRegion)}
                                                disabled={Boolean(runningAction)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md"
                                            >
                                                {runningAction === `arbitrage_${activeArbitrageRegion}` ? '査定中...' : `🔄 ${activeArbitrageRegion.toUpperCase()}担当に査定指示`}
                                            </button>
                                        </div>
                                    </div>
                                    <DocumentReportView report={aiData.profitableCards?.[activeArbitrageRegion] || null} accentColor="emerald" icon="⚖️" />
                                </div>
                            )}

                            {aiActiveDesk === 'desk_account' && aiData && (
                                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">📊</span>
                                            <div>
                                                <h2 className="text-lg font-bold text-white">IGアナリスト専用デスク</h2>
                                                <p className="text-xs text-slate-400">自社アカウント反応分析・ファネル改善レポート[cite: 1]</p>
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
                                                <p className="text-xs text-slate-400">Instagramカルーセル構成 ＆ 誘導キャプション[cite: 1]</p>
                                            </div>
                                        </div>
                                        <button onClick={() => runSingleAi('sns')} disabled={runningAction === 'sns'} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold">
                                            {runningAction === 'sns' ? '作成中...' : '🔄 全パターン再生成'}
                                        </button>
                                    </div>

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

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-amber-400 block mb-2">★ 推奨: トレンド×サヤ</span>
                                                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">
                                                    {aiData.snsPosts?.posts?.hybridPost}
                                                </pre>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(aiData.snsPosts?.posts?.hybridPost || '', 'hybrid')} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">コピー</button>
                                                <button onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.hybridPost || '', 'hybrid')} className="text-xs bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-emerald-400 block mb-2">利益・価格差重視</span>
                                                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">
                                                    {aiData.snsPosts?.posts?.arbitragePost}
                                                </pre>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(aiData.snsPosts?.posts?.arbitragePost || '', 'arbitrage')} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">コピー</button>
                                                <button onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.arbitragePost || '', 'arbitrage')} className="text-xs bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-sky-400 block mb-2">考察・トレンド重視</span>
                                                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">
                                                    {aiData.snsPosts?.posts?.trendPost}
                                                </pre>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(aiData.snsPosts?.posts?.trendPost || '', 'trend')} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">コピー</button>
                                                <button onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.trendPost || '', 'trend')} className="text-xs bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
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
                                                <h2 className="text-lg font-bold text-white">有料コミュニティ担当専用デスク</h2>
                                                <p className="text-xs text-slate-400">大口バイヤー向け実務商談オファー（MOQ・商条件付き）[cite: 1]</p>
                                            </div>
                                        </div>
                                        <button onClick={() => runSingleAi('dm')} disabled={runningAction === 'dm'} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold">
                                            {runningAction === 'dm' ? '作成中...' : '🔄 営業文再生成'}
                                        </button>
                                    </div>

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

                            {/* チャットスレッド表示 */}
                            <div className="mt-8 border-t border-slate-800 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                        <span>💬</span>
                                        <span>
                                            {aiActiveDesk === 'analysis_team' && '分析チーム（7名）とのチャット'}
                                            {aiActiveDesk === 'desk_chief' && '👑 チーフマネージャーとの戦略チャット'}
                                            {aiActiveDesk === 'execution_team' && '実行チーム（2名）とのチャット'}
                                            {aiActiveDesk.startsWith('desk_trend') && `市場アナリスト(${activeTrendRegion.toUpperCase()})との個別チャット`}
                                            {aiActiveDesk.startsWith('desk_arbitrage') && `アービトラージアナリスト(${activeArbitrageRegion.toUpperCase()})との個別チャット`}
                                            {aiActiveDesk === 'desk_account' && 'IGアナリストとの個別チャット'}
                                            {aiActiveDesk === 'desk_sns' && 'SNS担当との個別チャット'}
                                            {aiActiveDesk === 'desk_sales' && '有料コミュニティ担当との個別チャット'}
                                        </span>
                                    </h3>

                                    <div className="flex items-center gap-3">
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

                {/* 下部コマンドバー */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
                    <form onSubmit={handleSendChatMessage} className="max-w-4xl mx-auto relative shadow-2xl">
                        <input
                            value={chatCommand}
                            disabled={isChatSubmitting}
                            onChange={e => setChatCommand(e.target.value)}
                            placeholder={
                                aiActiveDesk === 'analysis_team' ? '分析チーム全員に質問・指示を出す...' :
                                    aiActiveDesk === 'desk_chief' ? '👑 チーフマネージャーに戦略選定の指示や方針を伝える...' :
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
    );
}