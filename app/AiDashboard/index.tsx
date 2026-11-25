// app/AiDashboard/index.tsx
'use client'
import React, { useState, useEffect, useRef } from 'react';
import { IntelligenceData, RegionKey, CategoryKey, PipelinePhase, PipelineProgressState } from './types';
import Sidebar from './components/Sidebar';
import DeskViews from './components/DeskViews';
import ChatPanel from './components/ChatPanel';

interface PhaseDetail {
    step: string;
    title: string;
    percent: number;
    color: string;
    activeAgents: string[];
}

const TARGET_DAY_OPTIONS: { value: string; label: string }[] = [
    { value: 'Monday', label: '月曜（サービス解説）' },
    { value: 'Tuesday', label: '火曜（US/EU 2投稿）' },
    { value: 'Wednesday', label: '水曜（US/EU 2投稿）' },
    { value: 'Thursday', label: '木曜（US/EU 2投稿）' },
    { value: 'Friday', label: '金曜（US/EU 2投稿）' },
    { value: 'Saturday', label: '土曜（US/EU 2投稿）' },
    { value: 'Sunday', label: '日曜（5日まとめ）' },
];

const PHASE_DETAILS: Record<string, PhaseDetail> = {
    initialized: {
        step: 'PREPARE',
        title: 'パイプライン初期化中...',
        percent: 10,
        color: 'bg-blue-500',
        activeAgents: ['システムコントローラー']
    },
    researching: {
        step: 'STEP 1 / 5',
        title: '世界3大市場リサーチ (準備中)',
        percent: 15,
        color: 'bg-indigo-500',
        activeAgents: ['アービトラージリサーチチーム']
    },
    researching_us: {
        step: 'STEP 1 / 5',
        title: '北米(US)市場リサーチ ＆ 価格差検証中...',
        percent: 20,
        color: 'bg-indigo-500',
        activeAgents: ['💎 アービトラージ (US)', '📊 IG アナリスト']
    },
    researching_eu: {
        step: 'STEP 1 / 5',
        title: '欧州(EU)市場リサーチ ＆ 価格差検証中...',
        percent: 30,
        color: 'bg-indigo-500',
        activeAgents: ['💎 アービトラージ (EU)']
    },
    researching_asia: {
        step: 'STEP 1 / 5',
        title: 'アジア市場リサーチ ＆ Xアナリスト分析中...',
        percent: 40,
        color: 'bg-indigo-500',
        activeAgents: ['💎 アービトラージ (Asia)', '📈 X アナリスト']
    },
    gate1_auditing: {
        step: 'STEP 2 / 5',
        title: '商材データ 一次監査',
        percent: 50,
        color: 'bg-amber-500',
        activeAgents: [
            '⚖️ アービトラージ監査担当 (Gate 1-A)'
        ]
    },
    curating: {
        step: 'STEP 3 / 5',
        title: 'スロット編成 ＆ 看板MVP選定',
        percent: 65,
        color: 'bg-purple-500',
        activeAgents: [
            '👑 キュレーター'
        ]
    },
    generating_content: {
        step: 'STEP 4 / 5',
        title: 'SNS原稿制作（北米US / 欧州EU）',
        percent: 80,
        color: 'bg-pink-500',
        activeAgents: [
            '🎨 IG クリエイター',
            '✍️ X クリエイター'
        ]
    },
    gate2_auditing: {
        step: 'STEP 5 / 5',
        title: '配信前 表現・規約・機密漏洩 最終監査',
        percent: 90,
        color: 'bg-orange-500',
        activeAgents: [
            '🛡️ 品質・規約監査役 (Gate 2)'
        ]
    },
    ready_to_publish: {
        step: 'COMPLETE',
        title: '全フェーズ完了！配信原稿の準備が完了しました',
        percent: 100,
        color: 'bg-emerald-500',
        activeAgents: [
            '✔ 稼働完了（各デスクで原稿確認・自動配信可能）'
        ]
    },
    partially_failed: {
        step: 'AUDIT CHECK',
        title: 'Gate 2 監査完了（一部の原稿に規約指摘・修正要請があります）',
        percent: 100,
        color: 'bg-amber-500',
        activeAgents: [
            '🛡️ 品質・規約監査役デスクで指摘内容を確認・調整できます'
        ]
    },
    completed: {
        step: 'PUBLISHED',
        title: '配信完了・実績集計フェーズ',
        percent: 100,
        color: 'bg-slate-600',
        activeAgents: ['定期配信完了']
    }
};

export default function AiDashboard() {
    const [activeCategory, setActiveCategory] = useState<CategoryKey>('pokemon');
    const [targetDay, setTargetDay] = useState<string>('Thursday');
    const [aiActiveDesk, setAiActiveDesk] = useState<string>('desk_chief');
    const [activeArbitrageRegion, setActiveArbitrageRegion] = useState<RegionKey>('us');
    const [aiData, setAiData] = useState<IntelligenceData | null>(null);
    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [runningAction, setRunningAction] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isPublishingInstagram, setIsPublishingInstagram] = useState<string | null>(null);
    const [isPublishingX, setIsPublishingX] = useState<boolean>(false);
    const [isStopping, setIsStopping] = useState<boolean>(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastDispatchedPhaseRef = useRef<string | null>(null);

    const [pipelineProgress, setPipelineProgress] = useState<PipelineProgressState>({
        cycleId: null,
        status: null,
        gate1Audits: [],
        gate2Audits: [],
    });

    const loadCycleData = async (cycleId: string) => {
        setSelectedRecordId(cycleId);
        try {
            const res = await fetch(`/api/pipeline/status?cycleId=${cycleId}`);
            const json = await res.json();
            if (json.success && json.data) {
                setAiData({
                    profitableCards: json.data.profitableCards || { us: null, eu: null, asia: null },
                    chiefPackage: json.data.chiefPackage || null,
                    proofPackage: null,
                    snsPosts: json.data.snsPosts || null,
                    xPosts: json.data.xPosts || null,
                    accountInsights: json.data.accountInsights || null,
                    xAccountInsights: json.data.xAccountInsights || null,
                    rsiReport: null,
                });
                setPipelineProgress({
                    cycleId: json.cycle.id,
                    status: json.cycle.status,
                    gate1Audits: json.data.gate1Audits || [],
                    gate2Audits: json.data.gate2Audits || [],
                });
            }
        } catch (err) {
            console.error('サイクルデータ取得エラー:', err);
        }
    };

    const handleSelectHistory = (target: any) => {
        loadCycleData(target.id);
    };

    const runSingleAi = async (action: string, region?: RegionKey) => {
        const targetCycleId = selectedRecordId || pipelineProgress.cycleId;
        if (!targetCycleId) {
            alert('対象のサイクルが選択されていません。');
            return;
        }

        const deskNames: Record<string, string> = {
            chief: 'チーフ（AIキュレーター選定）',
            arbitrage: `アービトラージアナリスト (${region?.toUpperCase() || ''})`,
            account: '自社Instagramアナリスト',
            x_account: '自社Xアナリスト',
            sns: 'Instagramクリエイター (US/EU 2原稿制作)',
            x_posts: 'Xクリエイター (US/EU 2スレッド制作)',
            x: 'Xクリエイター (US/EU 2スレッド制作)',
        };
        const targetName = deskNames[action] || action;
        if (!window.confirm(`【${targetName}】（対象: ${targetDay}）のみを単独再実行しますか？\n（他のAIデータや全体パイプラインは維持されます）`)) return;

        setRunningAction(`${action}_${region || ''}`);
        try {
            const res = await fetch('/api/pipeline/single-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cycleId: targetCycleId,
                    action,
                    region,
                    category: activeCategory,
                    targetDay,
                })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || '単独実行に失敗しました');

            await loadCycleData(targetCycleId);
            alert(`✔ 【${targetName}】の更新が完了しました！`);
        } catch (err: any) {
            alert(`単独実行エラー: ${err.message}`);
        } finally {
            setRunningAction(null);
        }
    };

    const handleStopPipeline = async () => {
        if (!window.confirm('現在実行中の全AIパイプラインを強制停止しますか？')) return;

        setIsStopping(true);

        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        const targetCycleId = selectedRecordId || pipelineProgress.cycleId;

        if (targetCycleId) {
            try {
                await fetch('/api/pipeline/worker', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cycleId: targetCycleId, action: 'stop', targetDay }),
                });
            } catch (e) {
                console.error('停止通知エラー:', e);
            }
        }

        setAiLoading(false);
        setIsStopping(false);
        setPipelineProgress(prev => ({
            ...prev,
            status: 'partially_failed'
        }));

        alert('🛑 パイプラインの実行を停止しました。');

        try {
            const listRes = await fetch(`/api/pipeline/status?list=true&category=${activeCategory}`);
            const listJson = await listRes.json();
            if (listJson.success && listJson.cycles) {
                setHistory(listJson.cycles);
            }
        } catch (e) {
            console.error('履歴更新エラー:', e);
        }
    };

    const runIntelligenceAnalysis = async () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        lastDispatchedPhaseRef.current = null;
        setAiLoading(true);

        try {
            const res = await fetch('/api/pipeline/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: activeCategory, triggerType: 'manual', targetDay }),
            });
            const { cycleId } = await res.json();
            if (!cycleId) throw new Error('パイプラインの開始に失敗しました');

            setSelectedRecordId(cycleId);
            setPipelineProgress(prev => ({ ...prev, cycleId, status: 'initialized' }));

            pollIntervalRef.current = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/pipeline/status?cycleId=${cycleId}`);
                    const json = await statusRes.json();

                    if (json.success && json.cycle) {
                        const currentStatus = json.cycle.status as PipelinePhase;

                        setPipelineProgress({
                            cycleId,
                            status: currentStatus,
                            gate1Audits: json.data?.gate1Audits || [],
                            gate2Audits: json.data?.gate2Audits || [],
                        });

                        if (json.data) {
                            setAiData(prev => ({
                                ...prev,
                                profitableCards: json.data.profitableCards || prev?.profitableCards,
                                chiefPackage: json.data.chiefPackage,
                                snsPosts: json.data.snsPosts,
                                xPosts: json.data.xPosts,
                                accountInsights: json.data.accountInsights || prev?.accountInsights,
                                xAccountInsights: json.data.xAccountInsights || prev?.xAccountInsights,
                            } as any));
                        }

                        const activePhases: string[] = [
                            'initialized',
                            'researching',
                            'researching_us',
                            'researching_eu',
                            'researching_asia',
                            'gate1_auditing',
                            'curating',
                            'generating_content',
                            'gate2_auditing'
                        ];

                        if (
                            activePhases.includes(currentStatus) &&
                            lastDispatchedPhaseRef.current !== currentStatus
                        ) {
                            lastDispatchedPhaseRef.current = currentStatus;
                            console.log(`🚀 [Client Dispatch] 新しいフェーズ [${currentStatus}] (${targetDay}) の実行を指示します`);

                            fetch('/api/pipeline/worker', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ cycleId, targetDay }),
                            }).catch(e => console.error('Worker dispatch error:', e));
                        }

                        if (['ready_to_publish', 'partially_failed', 'completed'].includes(currentStatus)) {
                            if (pollIntervalRef.current) {
                                clearInterval(pollIntervalRef.current);
                                pollIntervalRef.current = null;
                            }
                            setAiLoading(false);

                            const listRes = await fetch(`/api/pipeline/status?list=true&category=${activeCategory}`);
                            const listJson = await listRes.json();
                            if (listJson.success && listJson.cycles) {
                                setHistory(listJson.cycles);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000);

        } catch (err: any) {
            alert(`分析エラー: ${err.message || '予期せぬエラー'}`);
            setAiLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000);
    };

    const handlePublishToInstagram = async (
        content: string,
        typeKey: string,
        images?: string[] | string
    ) => {
        if (!window.confirm(`Instagram に【${typeKey}】原稿を自動投稿しますか？`)) return;
        setIsPublishingInstagram(typeKey);
        try {
            const payload: any = { platform: 'instagram', content };
            if (Array.isArray(images)) {
                payload.imageUrls = images;
            } else if (images) {
                payload.imageUrl = images;
            }

            const res = await fetch('/api/ai/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            alert(`完了: ${json.message}`);
        } catch (err: any) {
            alert(`投稿エラー: ${err.message}`);
        } finally {
            setIsPublishingInstagram(null);
        }
    };

    const handlePublishToX = async (mainPost: string, threadPosts: string[] = [], imageUrl?: string) => {
        if (!window.confirm('X (Twitter) 公式アカウントへスレッドを自動投稿しますか？')) return;
        setIsPublishingX(true);
        try {
            const res = await fetch('/api/ai/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'x', mainPost, threadPosts, imageUrl })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            alert(`完了: ${json.message}`);
        } catch (err: any) {
            alert(`X投稿エラー: ${err.message}`);
        } finally {
            setIsPublishingX(false);
        }
    };

    useEffect(() => {
        const fetchLatestCycles = async () => {
            try {
                const res = await fetch(`/api/pipeline/status?list=true&category=${activeCategory}`);
                const json = await res.json();
                if (json.success && json.cycles && json.cycles.length > 0) {
                    setHistory(json.cycles);
                    await loadCycleData(json.cycles[0].id);
                } else {
                    setHistory([]);
                    setAiData(null);
                    setPipelineProgress({ cycleId: null, status: null, gate1Audits: [], gate2Audits: [] });
                }
            } catch (e) { console.error('履歴取得エラー:', e); }
        };
        fetchLatestCycles();
    }, [activeCategory]);

    const currentPhase = pipelineProgress.status ? PHASE_DETAILS[pipelineProgress.status] : null;

    return (
        <div className="flex h-full min-h-[820px] bg-slate-950 text-slate-50 overflow-hidden font-sans rounded-xl border border-slate-800 shadow-2xl animate-fadeIn">
            <Sidebar
                activeCategory={activeCategory} setActiveCategory={setActiveCategory}
                aiActiveDesk={aiActiveDesk} setAiActiveDesk={setAiActiveDesk}
                activeArbitrageRegion={activeArbitrageRegion} setActiveArbitrageRegion={setActiveArbitrageRegion}
                history={history} selectedRecordId={selectedRecordId} onSelectHistory={handleSelectHistory}
                aiLoading={aiLoading} runningAction={runningAction}
            />

            <div className="flex-1 flex flex-col relative bg-slate-950/50">
                <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-end gap-3 px-6 shrink-0">
                    <select
                        value={targetDay}
                        onChange={(e) => setTargetDay(e.target.value)}
                        disabled={aiLoading || Boolean(runningAction)}
                        className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer"
                    >
                        {TARGET_DAY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    {aiLoading ? (
                        <div className="flex items-center gap-3 animate-fadeIn">
                            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                パイプライン稼働中...
                            </div>
                            <button
                                onClick={handleStopPipeline}
                                disabled={isStopping}
                                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition active:scale-95 ring-2 ring-rose-500/40 disabled:opacity-50"
                            >
                                <span>🛑 {isStopping ? '停止処理中...' : 'パイプラインを強制停止'}</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={runIntelligenceAnalysis}
                            disabled={Boolean(runningAction)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-2 disabled:opacity-50 transition active:scale-95"
                        >
                            <span>🚀 全AIに一斉調査・発信制作を指示</span>
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-6 pb-28">
                    {currentPhase && (
                        <div className="mb-6 p-4 bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl animate-fadeIn space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                                        {currentPhase.step}
                                    </span>
                                    <span className="text-sm font-bold text-white tracking-wide">
                                        {currentPhase.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">進捗</span>
                                    <span className="text-sm font-mono font-extrabold text-blue-400">
                                        {currentPhase.percent}%
                                    </span>
                                </div>
                            </div>

                            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${currentPhase.color}`}
                                    style={{ width: `${currentPhase.percent}%` }}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full inline-block ${
                                        pipelineProgress.status === 'ready_to_publish' ? 'bg-emerald-400' :
                                        pipelineProgress.status === 'partially_failed' ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                                    }`} />
                                    ステータス:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentPhase.activeAgents.map((agent, i) => (
                                        <span
                                            key={i}
                                            className="bg-slate-950 text-slate-200 border border-slate-700 px-2.5 py-0.5 rounded-lg text-[11px] font-bold shadow-sm"
                                        >
                                            {agent}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {(pipelineProgress.gate1Audits.length > 0 || pipelineProgress.gate2Audits.length > 0) && (
                                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-5 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">⚖️ Gate 1 (アービトラージ監査):</span>
                                        <span className={`font-mono font-bold ${
                                            pipelineProgress.gate1Audits.every(a => a.status === 'passed') ? 'text-emerald-400' : 'text-amber-400'
                                        }`}>
                                            {pipelineProgress.gate1Audits.filter(a => a.status === 'passed').length} / {pipelineProgress.gate1Audits.length} 合格
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">🛡️ Gate 2 (品質・規約監査):</span>
                                        <span className={`font-mono font-bold ${
                                            pipelineProgress.gate2Audits.every(a => a.status === 'passed') ? 'text-emerald-400' : 'text-amber-400'
                                        }`}>
                                            {pipelineProgress.gate2Audits.filter(a => a.status === 'passed').length} / {pipelineProgress.gate2Audits.length} 承認
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DeskViews
                        aiActiveDesk={aiActiveDesk} activeArbitrageRegion={activeArbitrageRegion}
                        aiData={aiData}
                        gate1Audits={pipelineProgress.gate1Audits}
                        gate2Audits={pipelineProgress.gate2Audits}
                        runningAction={runningAction} runSingleAi={runSingleAi}
                        handleCopy={handleCopy} copiedKey={copiedKey}
                        handlePublishToInstagram={handlePublishToInstagram} isPublishingInstagram={isPublishingInstagram}
                        handlePublishToX={handlePublishToX} isPublishingX={isPublishingX}
                    />
                    <ChatPanel
                        aiActiveDesk={aiActiveDesk} activeArbitrageRegion={activeArbitrageRegion}
                        aiData={aiData} runSingleAi={runSingleAi} runningAction={runningAction} activeCategory={activeCategory}
                    />
                </div>
            </div>
        </div>
    );
}