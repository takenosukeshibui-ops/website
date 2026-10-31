// app/AiDashboard/index.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { IntelligenceData, RegionKey, CategoryKey, PipelinePhase, PipelineProgressState } from './types';
import Sidebar from './components/Sidebar';
import DeskViews from './components/DeskViews';
import ChatPanel from './components/ChatPanel';

const PHASE_LABELS: Record<string, { label: string; percent: number; color: string }> = {
    initialized: { label: 'パイプライン初期化中...', percent: 10, color: 'bg-blue-500' },
    researching: { label: '米・欧・亜 6名リサーチャー & SNSアナリスト並行調査中...', percent: 25, color: 'bg-indigo-500' },
    curating: { label: 'AIキュレーターが7日分スロット & 看板MVPを選定中...', percent: 45, color: 'bg-purple-500' },
    gate1_auditing: { label: '【Gate 1】商材・数値監査役が四則検算 & 大会規約をチェック中...', percent: 60, color: 'bg-amber-500' },
    generating_content: { label: 'IG・Xクリエイター & Discord営業が原稿を自律制作中...', percent: 75, color: 'bg-emerald-500' },
    gate2_auditing: { label: '【Gate 2】表現・規約監査役が機密漏洩 & 2股CTAを最終審査中...', percent: 90, color: 'bg-orange-500' },
    ready_to_publish: { label: '全監査クリア！成果物の配信準備が完了しました', percent: 100, color: 'bg-green-600' },
    partially_failed: { label: '一部監査で差し戻し・調整が必要な項目があります', percent: 100, color: 'bg-red-500' },
    completed: { label: '配信完了・実績集計フェーズ', percent: 100, color: 'bg-gray-600' }
};

export default function AiDashboard() {
    const [activeCategory, setActiveCategory] = useState<CategoryKey>('pokemon');
    const [aiActiveDesk, setAiActiveDesk] = useState<string>('desk_chief');
    const [activeTrendRegion, setActiveTrendRegion] = useState<RegionKey>('us');
    const [activeArbitrageRegion, setActiveArbitrageRegion] = useState<RegionKey>('us');
    const [aiData, setAiData] = useState<IntelligenceData | null>(null);
    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [runningAction, setRunningAction] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [isPublishingDiscord, setIsPublishingDiscord] = useState<boolean>(false);
    const [isPublishingInstagram, setIsPublishingInstagram] = useState<string | null>(null);
    const [isPublishingX, setIsPublishingX] = useState<boolean>(false);

    const [pipelineProgress, setPipelineProgress] = useState<PipelineProgressState>({
        cycleId: null,
        status: null,
        gate1Audits: [],
        gate2Audits: [],
    });

    // 🌟 1. 特定サイクルの全データを読み込んでダッシュボードに反映
    const loadCycleData = async (cycleId: string) => {
        setSelectedRecordId(cycleId);
        try {
            const res = await fetch(`/api/pipeline/status?cycleId=${cycleId}`);
            const json = await res.json();
            if (json.success && json.data) {
                setAiData({
                    trendInsights: json.data.trendInsights || { us: null, eu: null, asia: null },
                    profitableCards: json.data.profitableCards || { us: null, eu: null, asia: null },
                    chiefPackage: json.data.chiefPackage || null,
                    proofPackage: null,
                    snsPosts: json.data.snsPosts || null,
                    xPosts: json.data.xPosts || null,
                    salesDM: json.data.salesDM || null,
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

    // 🌟 2. 個別デスクからの再実行指示も新パイプライン（二重監査付き）に統合
    const runSingleAi = async (_action: string, _region?: RegionKey) => {
        if (!window.confirm('新パイプラインを一斉実行し、二重監査（Gate 1 / Gate 2）を通して全成果物を最新化しますか？')) return;
        runIntelligenceAnalysis();
    };

    // 🌟 3. パイプライン実行（自己推進型）
    const runIntelligenceAnalysis = async () => {
        setAiLoading(true);
        try {
            const res = await fetch('/api/pipeline/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: activeCategory, triggerType: 'manual' }),
            });
            const { cycleId } = await res.json();
            if (!cycleId) throw new Error('パイプラインの開始に失敗しました');

            setSelectedRecordId(cycleId);
            setPipelineProgress(prev => ({ ...prev, cycleId, status: 'initialized' }));

            let isAdvancing = false;

            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/pipeline/status?cycleId=${cycleId}`);
                    const json = await statusRes.json();

                    if (json.success && json.cycle) {
                        const currentStatus = json.cycle.status as PipelinePhase;

                        setPipelineProgress({
                            cycleId,
                            status: currentStatus,
                            gate1Audits: json.data.gate1Audits || [],
                            gate2Audits: json.data.gate2Audits || [],
                        });

                        if (json.data) {
                            setAiData(prev => ({
                                ...prev,
                                trendInsights: json.data.trendInsights || prev?.trendInsights,
                                profitableCards: json.data.profitableCards || prev?.profitableCards,
                                chiefPackage: json.data.chiefPackage,
                                snsPosts: json.data.snsPosts,
                                xPosts: json.data.xPosts,
                                salesDM: json.data.salesDM,
                                accountInsights: json.data.accountInsights || prev?.accountInsights,
                                xAccountInsights: json.data.xAccountInsights || prev?.xAccountInsights,
                            } as any));
                        }

                        // フェイルセーフ（クライアントサイド推進）
                        const activePhases: PipelinePhase[] = [
                            'initialized',
                            'curating',
                            'gate1_auditing',
                            'generating_content',
                            'gate2_auditing'
                        ];

                        if (activePhases.includes(currentStatus) && !isAdvancing) {
                            isAdvancing = true;
                            fetch('/api/pipeline/worker', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ cycleId }),
                            }).finally(() => {
                                isAdvancing = false;
                            });
                        }

                        // 完了時の処理
                        if (['ready_to_publish', 'partially_failed', 'completed'].includes(currentStatus)) {
                            clearInterval(pollInterval);
                            setAiLoading(false);
                            
                            // 履歴リストを新テーブルから再取得
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

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000);
    };

    const handlePublishToDiscord = async (content: string) => {
        if (!window.confirm('Discordの大口バイヤー用チャンネルへ送信しますか？')) return;
        setIsPublishingDiscord(true);
        try {
            const res = await fetch('/api/ai/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: 'discord', content }) });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            alert(`完了: ${json.message}`);
        } catch (err: any) { alert(`送信エラー: ${err.message}`); } finally { setIsPublishingDiscord(false); }
    };

    const handlePublishToInstagram = async (content: string, typeKey: string, imageUrl?: string) => {
        if (!window.confirm(`Instagram に【${typeKey}】原稿を自動投稿しますか？`)) return;
        setIsPublishingInstagram(typeKey);
        try {
            const res = await fetch('/api/ai/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: 'instagram', content, imageUrl }) });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            alert(`完了: ${json.message}`);
        } catch (err: any) { alert(`投稿エラー: ${err.message}`); } finally { setIsPublishingInstagram(null); }
    };

    const handlePublishToX = async (mainPost: string, threadPosts: string[] = []) => {
        if (!window.confirm('X (Twitter) 公式アカウントへスレッドを自動投稿しますか？')) return;
        setIsPublishingX(true);
        try {
            const res = await fetch('/api/ai/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'x', mainPost, threadPosts })
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

    // 🌟 4. 新テーブルから過去サイクル一覧を取得して最新回を自動ロード
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

    return (
        <div className="flex h-full min-h-[820px] bg-slate-950 text-slate-50 overflow-hidden font-sans rounded-xl border border-slate-800 shadow-2xl animate-fadeIn">
            <Sidebar
                activeCategory={activeCategory} setActiveCategory={setActiveCategory}
                aiActiveDesk={aiActiveDesk} setAiActiveDesk={setAiActiveDesk}
                activeTrendRegion={activeTrendRegion} setActiveTrendRegion={setActiveTrendRegion}
                activeArbitrageRegion={activeArbitrageRegion} setActiveArbitrageRegion={setActiveArbitrageRegion}
                history={history} selectedRecordId={selectedRecordId} onSelectHistory={handleSelectHistory}
                aiLoading={aiLoading} runningAction={runningAction}
            />

            <div className="flex-1 flex flex-col relative bg-slate-950/50">
                <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-end px-6 shrink-0">
                    <button onClick={runIntelligenceAnalysis} disabled={aiLoading || Boolean(runningAction)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-2 disabled:opacity-50 transition active:scale-95">
                        {aiLoading ? '🔄 全AIパイプライン稼働中...' : '🚀 全11AIに一斉調査・発信制作を指示'}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 pb-28">
                    {/* 非同期パイプライン実行進捗バー */}
                    {pipelineProgress.status && (
                        <div className="mb-6 p-4 bg-gray-900 border border-gray-700 rounded-xl shadow-lg animate-fadeIn">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-200">
                                    {PHASE_LABELS[pipelineProgress.status]?.label || '処理中...'}
                                </span>
                                <span className="text-xs font-mono text-gray-400">
                                    {PHASE_LABELS[pipelineProgress.status]?.percent}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${
                                        PHASE_LABELS[pipelineProgress.status]?.color || 'bg-blue-600'
                                    }`}
                                    style={{ width: `${PHASE_LABELS[pipelineProgress.status]?.percent}%` }}
                                />
                            </div>

                            {/* 監査役クイックステータス */}
                            {(pipelineProgress.gate1Audits.length > 0 || pipelineProgress.gate2Audits.length > 0) && (
                                <div className="mt-3 pt-3 border-t border-gray-800 flex gap-4 text-xs">
                                    <div>
                                        <span className="text-gray-400 mr-1">Gate 1 (商材・数値):</span>
                                        <span className={`font-semibold ${
                                            pipelineProgress.gate1Audits.every(a => a.status === 'passed') ? 'text-green-400' : 'text-amber-400'
                                        }`}>
                                            {pipelineProgress.gate1Audits.filter(a => a.status === 'passed').length} / {pipelineProgress.gate1Audits.length} 合格
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 mr-1">Gate 2 (表現・規約):</span>
                                        <span className={`font-semibold ${
                                            pipelineProgress.gate2Audits.every(a => a.status === 'passed') ? 'text-green-400' : 'text-amber-400'
                                        }`}>
                                            {pipelineProgress.gate2Audits.filter(a => a.status === 'passed').length} / {pipelineProgress.gate2Audits.length} 承認
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* メインデスクビュー */}
                    <DeskViews 
                        aiActiveDesk={aiActiveDesk} activeTrendRegion={activeTrendRegion} activeArbitrageRegion={activeArbitrageRegion}
                        aiData={aiData}
                        gate1Audits={pipelineProgress.gate1Audits}
                        gate2Audits={pipelineProgress.gate2Audits}
                        runningAction={runningAction} runSingleAi={runSingleAi}
                        handleCopy={handleCopy} copiedKey={copiedKey}
                        handlePublishToInstagram={handlePublishToInstagram} isPublishingInstagram={isPublishingInstagram}
                        handlePublishToDiscord={handlePublishToDiscord} isPublishingDiscord={isPublishingDiscord}
                        handlePublishToX={handlePublishToX} isPublishingX={isPublishingX}
                    />
                    <ChatPanel 
                        aiActiveDesk={aiActiveDesk} activeTrendRegion={activeTrendRegion} activeArbitrageRegion={activeArbitrageRegion}
                        aiData={aiData} runSingleAi={runSingleAi} runningAction={runningAction} activeCategory={activeCategory}
                    />
                </div>
            </div>
        </div>
    );
}