// app/AiDashboard/index.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { IntelligenceData, RegionKey, CategoryKey } from './types';
import Sidebar from './components/Sidebar';
import DeskViews from './components/DeskViews';
import ChatPanel from './components/ChatPanel';

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
    const [isPublishingX, setIsPublishingX] = useState<boolean>(false); // 🌟 X投稿ローディングState

    const handleSelectHistory = (target: any) => {
        setSelectedRecordId(target.id);
        setAiData({
            trendInsights: target.trend_insights || { us: null, eu: null, asia: null },
            profitableCards: target.profitable_cards || { us: null, eu: null, asia: null },
            chiefPackage: target.chief_package || null,
            proofPackage: target.proof_package || null,
            snsPosts: target.sns_posts,
            xPosts: target.x_posts,
            salesDM: target.sales_dm,
            accountInsights: target.account_insights || null,
            xAccountInsights: target.x_account_insights || null,
            rsiReport: target.rsi_report || null,
        });
    };

    const runSingleAi = async (action: string, region?: RegionKey) => {
        const actionKey = region ? `${action}_${region}` : action;
        setRunningAction(actionKey);
        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, currentData: aiData || {}, recordId: selectedRecordId, region: region || 'us', category: activeCategory }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || '生成失敗');
            
            setAiData(prev => ({
                trendInsights: prev?.trendInsights || { us: null, eu: null, asia: null },
                profitableCards: prev?.profitableCards || { us: null, eu: null, asia: null },
                chiefPackage: prev?.chiefPackage || null,
                proofPackage: prev?.proofPackage || null,
                snsPosts: prev?.snsPosts || null,
                xPosts: prev?.xPosts || null,
                salesDM: prev?.salesDM || null,
                accountInsights: prev?.accountInsights || null,
                xAccountInsights: prev?.xAccountInsights || null,
                rsiReport: prev?.rsiReport || null,
                ...json.data
            }));
            
            if (action === 'rsi') alert('RSI（再帰的自己改善）が完了しました。');
        } catch (err: any) {
            alert(`実行エラー: ${err.message}`);
        } finally {
            setRunningAction(null);
        }
    };

    const runIntelligenceAnalysis = async () => {
        setAiLoading(true);
        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'all', category: activeCategory })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || '分析失敗');
            setAiData(json.data);

            const historyRes = await fetch(`/api/ai/intelligence?category=${activeCategory}`);
            const historyJson = await historyRes.json();
            if (historyJson.success && historyJson.history.length > 0) {
                setHistory(historyJson.history);
                setSelectedRecordId(json.savedRecordId || historyJson.history[0]?.id);
            }
        } catch (err: any) { alert(`分析エラー: ${err.message || '予期せぬエラー'}`); } finally { setAiLoading(false); }
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
        if (!window.confirm('Instagram に自動投稿しますか？')) return;
        setIsPublishingInstagram(typeKey);
        try {
            const res = await fetch('/api/ai/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: 'instagram', content, imageUrl }) });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            alert(`完了: ${json.message}`);
        } catch (err: any) { alert(`投稿エラー: ${err.message}`); } finally { setIsPublishingInstagram(null); }
    };

    // 🌟 X (Twitter) 直接スレッド自動投稿ハンドラー
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

    useEffect(() => {
        const fetchLatestHistory = async () => {
            try {
                const res = await fetch(`/api/ai/intelligence?category=${activeCategory}`);
                const json = await res.json();
                if (json.success && json.history && json.history.length > 0) {
                    setHistory(json.history);
                    handleSelectHistory(json.history[0]);
                } else {
                    setHistory([]);
                    setAiData(null);
                }
            } catch (e) { console.error('履歴取得エラー:', e); }
        };
        fetchLatestHistory();
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
                        {aiLoading ? '🔄 全11AI一斉稼働中...' : '🚀 全11AIに一斉調査・発信制作を指示'}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 pb-28">
                    <DeskViews 
                        aiActiveDesk={aiActiveDesk} activeTrendRegion={activeTrendRegion} activeArbitrageRegion={activeArbitrageRegion}
                        aiData={aiData} runningAction={runningAction} runSingleAi={runSingleAi}
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