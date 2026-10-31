// app/AiDashboard/components/DeskViews.tsx
import React, { useState, useEffect } from 'react';
import { IntelligenceData, RegionKey, Gate1AuditItem, Gate2AuditItem } from '../types';
import DocumentReportView from './DocumentReport';

interface DeskViewsProps {
    aiActiveDesk: string;
    activeTrendRegion: RegionKey | 'audit';
    activeArbitrageRegion: RegionKey | 'audit';
    aiData: IntelligenceData | null;
    gate1Audits?: (Gate1AuditItem & { agentKey?: string; priceTier?: string })[];
    gate2Audits?: Gate2AuditItem[];
    runningAction: string | null;
    runSingleAi: (action: string, region?: RegionKey) => void;
    handleCopy: (text: string, key: string) => void;
    copiedKey: string | null;
    handlePublishToInstagram: (content: string, typeKey: string, imageUrl?: string) => void;
    isPublishingInstagram: string | null;
    handlePublishToDiscord: (content: string) => void;
    isPublishingDiscord: boolean;
    handlePublishToX: (mainPost: string, threadPosts: string[]) => void;
    isPublishingX: boolean;
}

const DAY_LABELS: Record<string, string> = {
    Monday: '月曜', Tuesday: '火曜', Wednesday: '水曜', Thursday: '木曜',
    Friday: '金曜', Saturday: '土曜', Sunday: '日曜'
};

export default function DeskViews({
    aiActiveDesk, activeTrendRegion, activeArbitrageRegion, aiData,
    gate1Audits = [], gate2Audits = [],
    runningAction, runSingleAi, handleCopy, copiedKey,
    handlePublishToInstagram, isPublishingInstagram,
    handlePublishToDiscord, isPublishingDiscord,
    handlePublishToX, isPublishingX
}: DeskViewsProps) {
    const [selectedIgDay, setSelectedIgDay] = useState<string>('Monday');
    const [selectedXDay, setSelectedXDay] = useState<string>('Monday');
    const [currentIgSlideIdx, setCurrentIgSlideIdx] = useState<number>(0);

    // 曜日変更時にカルーセルスライドを1枚目にリセット
    useEffect(() => {
        setCurrentIgSlideIdx(0);
    }, [selectedIgDay]);

    // Instagramの選択された曜日の投稿データ取得
    const currentIgDaily = aiData?.snsPosts?.dailyPosts?.find(p => p.day?.includes(selectedIgDay) || p.day === selectedIgDay);
    const igPostText = currentIgDaily?.caption || aiData?.snsPosts?.posts?.hybridPost || '';

    // スライド配列の正規化
    const igSlides: string[] = (currentIgDaily?.slides && currentIgDaily.slides.length > 0)
        ? currentIgDaily.slides
        : [
            aiData?.snsPosts?.visualGuideline?.coverSlide ? `1枚目(表紙): ${aiData.snsPosts.visualGuideline.coverSlide}` : '1枚目(表紙): 3秒で指が止まる価格差フック',
            ...(aiData?.snsPosts?.visualGuideline?.carouselSlides || ['2枚目: 世界相場データ', '3枚目: 2股CTAスライド'])
        ];

    // Xの選択された曜日のスレッドデータ取得
    const currentXDaily = aiData?.xPosts?.dailyThreads?.find(t => t.day?.includes(selectedXDay) || t.day === selectedXDay);
    const xMainPost = currentXDaily?.mainPost || aiData?.xPosts?.mainPost || '';
    const xThreadPosts = currentXDaily?.threadPosts || aiData?.xPosts?.threadPosts || [];

    // 動的曜日ボタン
    const dynamicIgDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
        const post = aiData?.snsPosts?.dailyPosts?.find(p => p.day?.includes(day) || p.day === day);
        return { key: day, label: DAY_LABELS[day], desc: post?.theme || 'スロット未定' };
    });

    const dynamicXDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
        const thread = aiData?.xPosts?.dailyThreads?.find(t => t.day?.includes(day) || t.day === day);
        const match = thread?.mainPost?.match(/\((.*?)\)/);
        return { key: day, label: DAY_LABELS[day], desc: match ? match[1] : 'スレッド未定' };
    });

    const allTrendAudits = gate1Audits.filter(a => {
        return a.agentKey === 'trend' || a.slot?.includes('🔥') || a.slot?.includes('シグナル') || a.slot?.includes('Rank') || (!a.priceTier && (a.slot?.length || 0) > 20);
    });

    const allArbAudits = gate1Audits.filter(a => {
        const isTrend = a.agentKey === 'trend' || a.slot?.includes('🔥') || a.slot?.includes('シグナル') || a.slot?.includes('Rank') || (!a.priceTier && (a.slot?.length || 0) > 20);
        return !isTrend;
    });

    const isTrendAudit = aiActiveDesk === 'desk_trend_audit' || activeTrendRegion === 'audit';
    const isArbAudit = aiActiveDesk === 'desk_arbitrage_audit' || activeArbitrageRegion === 'audit';
    const safeTrendRegion: RegionKey | undefined = activeTrendRegion !== 'audit' ? activeTrendRegion : undefined;
    const safeArbRegion: RegionKey | undefined = activeArbitrageRegion !== 'audit' ? activeArbitrageRegion : undefined;

    const activeTrendReport = safeTrendRegion ? aiData?.trendInsights?.[safeTrendRegion] || null : null;
    const activeArbReport = safeArbRegion ? aiData?.profitableCards?.[safeArbRegion] || null : null;

    return (
        <>
            {/* ========================================================= */}
            {/* 👑 キュレーターデスク */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_chief' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">👑</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">キュレーター</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('chief')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'chief' ? '選定中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>

                    {/* RSI自己適応レポート（strategyBlueprint）の表示枠 */}
                    {aiData?.chiefPackage?.strategyBlueprint && (
                        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-lg mb-2">
                            <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                                <span className="text-sm">🤖</span>
                                <h3 className="text-sm font-bold text-emerald-300">今週の自己適応編成方針 (RSI)</h3>
                            </div>
                            <p className="text-xs text-white font-bold mb-1.5">
                                {aiData.chiefPackage.strategyBlueprint.headline}
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                                <span className="font-bold text-emerald-400 mr-1">📝 分析根拠:</span>
                                {aiData.chiefPackage.strategyBlueprint.adaptationRationale}
                            </p>
                        </div>
                    )}

                    {aiData?.chiefPackage ? (
                        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold block mb-1">
                                        Weekly Selected MVP Highlight
                                    </span>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span>🏆</span>
                                        <span>{aiData.chiefPackage.mvpHighlight?.cardName || aiData.chiefPackage.chosenCardOrItem}</span>
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-bold">
                                        看板MVP銘柄
                                    </span>
                                </div>
                            </div>

                            {/* 7日分週間コンテンツカレンダー */}
                            {aiData.chiefPackage.contentCalendar && aiData.chiefPackage.contentCalendar.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-1.5">
                                        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                            <span>📅</span> 週間コンテンツカレンダー（月曜〜日曜 7日分スロット）
                                        </h4>
                                        <span className="text-[10px] text-slate-400">Gate 1 検算・論理監査 合格品</span>
                                    </div>
                                    <div className="space-y-3">
                                        {aiData.chiefPackage.contentCalendar.map((dailyItem: any, cIdx: number) => (
                                            <div key={cIdx} className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 space-y-3 hover:border-amber-500/40 transition shadow-sm">
                                                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                                                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                                                        <span className="text-amber-400">📌</span> {DAY_LABELS[dailyItem.dayOfWeek] || dailyItem.dayOfWeek}
                                                    </span>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 shadow-sm">
                                                        {dailyItem.postType}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs">
                                                    {(dailyItem.items || []).map((sub: any, subIdx: number) => (
                                                        <div key={subIdx} className="bg-slate-900/60 p-2.5 rounded border border-slate-800/40 flex flex-col justify-between space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <span className="font-bold text-slate-200 line-clamp-1 truncate w-[130px]" title={sub.selectedCardOrTopic}>
                                                                    {sub.selectedCardOrTopic}
                                                                </span>
                                                                <span className="text-[9px] font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded uppercase text-slate-400 border border-slate-700">
                                                                    {sub.region}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className="bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                                                                    <span className="text-[9px] text-emerald-400 font-bold block mb-0.5">📢 無料フック（Fact）</span>
                                                                    <p className="text-[10px] text-emerald-100 leading-snug">{sub.hookFact}</p>
                                                                </div>
                                                                <div className="bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                                                                    <span className="text-[9px] text-rose-400 font-bold block mb-0.5">🔒 秘匿指示（Action）</span>
                                                                    <p className="text-[10px] text-rose-200 leading-snug truncate">{sub.hiddenActionReason || '仕入れ理由は非公開'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-bold text-slate-300 mb-1.5">⚖️ キュレーター全体選定理由</h4>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    {aiData.chiefPackage.mvpHighlight?.selectionReason || aiData.chiefPackage.selectionReason || '流動性と粗利マージンを総合勘案して選定'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだ選定が行われていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🛡️ 品質・規約監査役デスク（Gate 2 配信コンテンツ規約専任） */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_audit' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🛡️</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">品質・規約監査役デスク</h2>
                                <p className="text-xs text-slate-400">Gate 2（配信コンテンツ表現・撒き餌原則・機密漏洩・2股導線）最終監査結果</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-bold font-mono">
                                全承認: {gate2Audits.filter(a => a.status === 'passed').length} / {gate2Audits.length}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                            <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
                                <span>🔍</span> SNS・Discord 配信原稿 監査レポート一覧
                            </h3>
                            <span className="text-xs text-slate-400">「答えを教えない撒き餌原則」および仕入れ先ワード漏洩の厳格審査</span>
                        </div>

                        {gate2Audits.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-8 text-center">監査レコードはまだありません</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                                {gate2Audits.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white uppercase flex items-center gap-1.5">
                                                <span>{item.platform === 'instagram' ? '📸' : item.platform === 'x' ? '🐦' : '💬'}</span>
                                                <span>{item.platform} 配信原稿</span>
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                item.status === 'passed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {item.status === 'passed' ? '✔ 配信承認' : '✖ 修正要請'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex justify-between">
                                            <span>対象曜日: <span className="text-slate-300 font-bold">{DAY_LABELS[item.day] || item.day}</span></span>
                                        </div>
                                        {item.feedback && (
                                            <div className="bg-rose-500/10 p-2.5 rounded border border-rose-500/20 mt-1">
                                                <span className="text-[10px] text-rose-400 font-bold block mb-1">💬 規約指摘 ＆ 修正指示</span>
                                                <p className="text-[11px] text-rose-200 leading-relaxed whitespace-pre-wrap">{item.feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 🛡️ 市場トレンド監査 デスク (Gate 1-B) */}
            {/* ========================================================= */}
            {(aiActiveDesk === 'desk_trend_audit' || (aiActiveDesk.startsWith('desk_trend') && isTrendAudit)) && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🛡️</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white">市場トレンド監査</h2>
                                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold font-mono">
                                        Gate 1-B
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-bold font-mono">
                                全適合率: {allTrendAudits.filter(a => a.status === 'passed').length} / {allTrendAudits.length} 件
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(['us', 'eu', 'asia'] as const).map(reg => {
                            const regAudits = allTrendAudits.filter(a => a.region?.toLowerCase() === reg);
                            const passedCount = regAudits.filter(a => a.status === 'passed').length;
                            const regLabel = reg === 'us' ? '北米市場' : reg === 'eu' ? '欧州市場' : 'アジア市場';
                            return (
                                <div key={reg} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-md">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-300">{regLabel}</span>
                                        <span className="font-mono text-amber-400 font-bold">{passedCount} / {regAudits.length} 適合</span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-amber-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${regAudits.length > 0 ? (passedCount / regAudits.length) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                                <span>📋</span> トレンド仮説・選定銘柄 監査詳細一覧
                            </h3>
                            <span className="text-xs text-slate-400">Play! Pokémon 大会使用不可カードの煽り排除チェック</span>
                        </div>

                        {allTrendAudits.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-8 text-center">監査レコードはまだありません（全リサーチ実行後に表示されます）</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                                {allTrendAudits.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white truncate max-w-[200px]">{item.card}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                item.status === 'passed' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {item.status === 'passed' ? '✔ 規約適合' : '✖ 差し戻し'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex justify-between">
                                            <span className="truncate max-w-[200px]">{item.slot}</span>
                                            <span className="font-mono text-slate-300 uppercase">地域: {item.region}</span>
                                        </div>
                                        {item.feedback && (
                                            <div className="bg-amber-500/10 p-2.5 rounded border border-amber-500/20 mt-1">
                                                <span className="text-[10px] text-amber-400 font-bold block mb-1">💬 監査指摘・差し戻し理由</span>
                                                <p className="text-[11px] text-amber-200 leading-relaxed whitespace-pre-wrap">{item.feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 🔮 市場トレンドアナリスト (北米 / 欧州 / アジア 各担当デスク) */}
            {/* ========================================================= */}
            {aiActiveDesk.startsWith('desk_trend') && !isTrendAudit && safeTrendRegion && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🔮</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">市場トレンドアナリスト ({safeTrendRegion === 'us' ? '北米' : safeTrendRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('trend', safeTrendRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === `trend_${safeTrendRegion}` ? '調査中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
                    <DocumentReportView report={activeTrendReport} accentColor="amber" icon="📈" />
                </div>
            )}

            {/* ========================================================= */}
            {/* ⚖️💎 アービトラージ監査担当 デスク (Gate 1-A) */}
            {/* ========================================================= */}
            {(aiActiveDesk === 'desk_arbitrage_audit' || (aiActiveDesk.startsWith('desk_arbitrage') && isArbAudit)) && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">⚖️</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white">アービトラージ監査担当</h2>
                                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold font-mono">
                                        Gate 1-A
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-bold font-mono">
                                全検算合致: {allArbAudits.filter(a => a.status === 'passed').length} / {allArbAudits.length} 件
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(['us', 'eu', 'asia'] as const).map(reg => {
                            const regAudits = allArbAudits.filter(a => a.region?.toLowerCase() === reg);
                            const passedCount = regAudits.filter(a => a.status === 'passed').length;
                            const regLabel = reg === 'us' ? '北米市場 (75商品)' : reg === 'eu' ? '欧州市場 (75商品)' : 'アジア市場 (75商品)';
                            return (
                                <div key={reg} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-md">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-300">{regLabel}</span>
                                        <span className="font-mono text-emerald-400 font-bold">{passedCount} / {regAudits.length} 合格</span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${regAudits.length > 0 ? (passedCount / regAudits.length) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                                <span>📋</span> 全225商品 四則検算 監査詳細一覧
                            </h3>
                            <span className="text-xs text-slate-400">見込売価 - 日本仕入値 ＝ 粗利差額 / ROIの完全整合チェック</span>
                        </div>

                        {allArbAudits.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-8 text-center">監査レコードはまだありません（全リサーチ実行後に表示されます）</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                                {allArbAudits.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white truncate max-w-[200px]">{item.card}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                item.status === 'passed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {item.status === 'passed' ? '✔ 検算OK' : '✖ 差額異常'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex justify-between">
                                            <span className="truncate max-w-[180px]">{item.slot}</span>
                                            <div className="flex gap-2">
                                                {item.priceTier && <span className="text-slate-400">帯: {item.priceTier}</span>}
                                                <span className="font-mono text-slate-300 uppercase">地域: {item.region}</span>
                                            </div>
                                        </div>
                                        {item.feedback && (
                                            <div className="bg-red-500/10 p-2.5 rounded border border-red-500/20 mt-1">
                                                <span className="text-[10px] text-red-400 font-bold block mb-1">💬 検算不一致指摘</span>
                                                <p className="text-[11px] text-red-200 leading-relaxed whitespace-pre-wrap">{item.feedback}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 💎 アービトラージアナリスト (北米 / 欧州 / アジア 各担当デスク) */}
            {/* ========================================================= */}
            {aiActiveDesk.startsWith('desk_arbitrage') && !isArbAudit && safeArbRegion && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💎</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">アービトラージアナリスト ({safeArbRegion === 'us' ? '北米' : safeArbRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('arbitrage', safeArbRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === `arbitrage_${safeArbRegion}` ? '査定中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
                    <DocumentReportView report={activeArbReport} accentColor="emerald" icon="⚖️" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 📊 IG アナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_account' && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📊</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">IG アナリスト</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('account')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'account' ? '分析中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.accountInsights || null} accentColor="pink" icon="📱" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 📈 X アナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x_account' && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📈</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">X アナリスト</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('x_account')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'x_account' ? '分析中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.xAccountInsights || null} accentColor="sky" icon="📈" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 🎨 IG クリエイター（投稿プレビュー統合） */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_sns' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🎨</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">IG クリエイター</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('sns')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'sns' ? '制作中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>

                    {/* 曜日スロット切り替えタブ */}
                    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                        {dynamicIgDays.map(d => (
                            <button
                                key={d.key}
                                type="button"
                                onClick={() => setSelectedIgDay(d.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    selectedIgDay === d.key
                                        ? 'bg-pink-600 text-white shadow-md ring-1 ring-pink-400/40'
                                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                                }`}
                            >
                                <span>{d.label}</span>
                                <span className="text-[10px] opacity-70 font-mono">({d.desc})</span>
                            </button>
                        ))}
                    </div>

                    {aiData?.snsPosts ? (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                            {/* 左カラム: 原稿テキスト・スライド指示・ハッシュタグ */}
                            <div className="xl:col-span-7 space-y-5">
                                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-xl">
                                    <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] uppercase font-mono tracking-widest text-pink-400 font-bold block mb-1">
                                                {DAY_LABELS[selectedIgDay]} Posting Slot
                                            </span>
                                            <h3 className="text-base font-bold text-white">{currentIgDaily?.theme || aiData.snsPosts.theme}</h3>
                                        </div>
                                        <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                                            推奨: {aiData.snsPosts.recommendedTiming || '日本時間 21:00'}
                                        </span>
                                    </div>

                                    {/* カルーセルスライド制作指示リスト */}
                                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                        <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                                            <span>🖼️</span> カルーセル画像スライド構成指示（全{igSlides.length}枚）
                                        </h4>
                                        <div className="space-y-1.5 text-xs text-slate-300">
                                            {igSlides.map((s: string, i: number) => {
                                                const parts = s.includes(':') ? s.split(':') : [s.slice(0, 6), s.slice(6)];
                                                const label = parts[0];
                                                const desc = parts.slice(1).join(':');
                                                const isSelected = currentIgSlideIdx === i;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => setCurrentIgSlideIdx(i)}
                                                        className={`p-2 rounded cursor-pointer transition flex items-start gap-2 border ${
                                                            isSelected ? 'bg-pink-950/40 border-pink-500/50 text-white' : 'hover:bg-slate-900/80 border-transparent text-slate-400'
                                                        }`}
                                                    >
                                                        <span className={`font-bold shrink-0 font-mono text-[11px] ${i === 0 ? 'text-pink-400' : 'text-slate-300'}`}>
                                                            {label}:
                                                        </span>
                                                        <span className="text-[11px] leading-relaxed">{desc}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 推奨ハッシュタグ */}
                                    {aiData?.snsPosts?.hashtags && aiData.snsPosts.hashtags.length > 0 && (
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                                                    <span>🏷️</span> 推奨ハッシュタグ
                                                </h4>
                                                <button 
                                                    onClick={() => handleCopy(aiData?.snsPosts?.hashtags?.join(' ') || '', 'ig_tags')}
                                                    className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded text-slate-300 transition"
                                                >
                                                    {copiedKey === 'ig_tags' ? '✓ コピー完了' : 'タグ一括コピー'}
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                                {aiData.snsPosts.hashtags.join(' ')}
                                            </p>
                                        </div>
                                    )}

                                    {/* 投稿キャプション本文 */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-white">📝 【{DAY_LABELS[selectedIgDay]}】投稿キャプション全文</h4>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(igPostText, `ig_${selectedIgDay}`)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">
                                                    {copiedKey === `ig_${selectedIgDay}` ? '✓ コピー完了' : 'コピー'}
                                                </button>
                                                <button onClick={() => handlePublishToInstagram(igPostText, selectedIgDay)} className="text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold px-3 py-1 rounded-lg shadow-md transition active:scale-95">
                                                    {isPublishingInstagram === selectedIgDay ? '投稿中...' : '📸 IGへ自動投稿'}
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-56 overflow-y-auto leading-relaxed">
                                            {igPostText}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* 🌟 右カラム: Instagram アプリ実機風プレビュー */}
                            <div className="xl:col-span-5 flex flex-col items-center">
                                <div className="w-full max-w-[360px] bg-black rounded-[32px] border-[5px] border-slate-700 shadow-2xl overflow-hidden text-white font-sans text-xs">
                                    {/* スマホ風ノッチ・上部ステータスバー */}
                                    <div className="h-5 bg-black flex justify-between items-center px-6 pt-1 text-[10px] text-slate-400 font-mono">
                                        <span>21:00</span>
                                        <div className="w-16 h-3 bg-slate-900 rounded-full mx-auto" />
                                        <span>5G 100%</span>
                                    </div>

                                    {/* IG アカウントヘッダー */}
                                    <div className="p-3 flex items-center justify-between border-b border-slate-900 bg-slate-950/80">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-[2px]">
                                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs">
                                                    ⚡
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs flex items-center gap-1">
                                                    <span>worldwide_tcg</span>
                                                    <span className="text-[10px] text-sky-400">●</span>
                                                </div>
                                                <div className="text-[9px] text-slate-400">Tokyo, Japan</div>
                                            </div>
                                        </div>
                                        <span className="text-slate-400 text-sm">•••</span>
                                    </div>

                                    {/* カルーセル画像スライド表示エリア（正方形 1:1） */}
                                    <div className="relative aspect-square w-full bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 flex flex-col justify-between p-4 border-y border-slate-900 select-none overflow-hidden">
                                        {/* 右上スライドカウンターバッジ */}
                                        <div className="self-end">
                                            <span className="bg-black/70 backdrop-blur text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700 text-slate-200">
                                                {currentIgSlideIdx + 1} / {igSlides.length}
                                            </span>
                                        </div>

                                        {/* スライド中央コンテンツ */}
                                        <div className="space-y-2 text-center my-auto px-2">
                                            {currentIgSlideIdx === 0 ? (
                                                <div className="space-y-3">
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono text-[9px] uppercase font-bold tracking-wider">
                                                        COVER HOOK SLIDE
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-white leading-snug drop-shadow-md">
                                                        {currentIgDaily?.theme || aiData.snsPosts.theme}
                                                    </h4>
                                                    <div className="text-[10px] text-amber-300 font-bold bg-slate-950/80 p-2 rounded-lg border border-amber-500/30 mx-auto max-w-[240px]">
                                                        {igSlides[0]?.replace(/^.*?:\s*/, '')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] font-bold">
                                                        SLIDE {currentIgSlideIdx + 1}
                                                    </span>
                                                    <p className="text-xs text-slate-200 leading-relaxed font-bold bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                                                        {igSlides[currentIgSlideIdx]?.replace(/^.*?:\s*/, '')}
                                                    </p>
                                                    {currentIgSlideIdx === igSlides.length - 1 && (
                                                        <div className="pt-2 flex justify-center gap-1.5">
                                                            <span className="text-[9px] bg-purple-600/80 text-white px-2 py-0.5 rounded font-bold">
                                                                VIP Discord ➔
                                                            </span>
                                                            <span className="text-[9px] bg-blue-600/80 text-white px-2 py-0.5 rounded font-bold">
                                                                自社代理購入 ➔
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* 左右スライドめくり矢印ボタン */}
                                        <div className="absolute inset-y-0 left-1 flex items-center">
                                            {currentIgSlideIdx > 0 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setCurrentIgSlideIdx(prev => Math.max(0, prev - 1))}
                                                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xs shadow-md backdrop-blur"
                                                >
                                                    ◀
                                                </button>
                                            )}
                                        </div>
                                        <div className="absolute inset-y-0 right-1 flex items-center">
                                            {currentIgSlideIdx < igSlides.length - 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setCurrentIgSlideIdx(prev => Math.min(igSlides.length - 1, prev + 1))}
                                                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xs shadow-md backdrop-blur"
                                                >
                                                    ▶
                                                </button>
                                            )}
                                        </div>

                                        {/* 下部ドットインジケーター */}
                                        <div className="flex justify-center gap-1 self-center">
                                            {igSlides.map((_, dotIdx) => (
                                                <div 
                                                    key={dotIdx} 
                                                    className={`h-1.5 rounded-full transition-all ${
                                                        currentIgSlideIdx === dotIdx ? 'w-4 bg-pink-500' : 'w-1.5 bg-slate-600'
                                                    }`} 
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* アクションボタンバー */}
                                    <div className="p-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3 text-base">
                                            <span>🤍</span>
                                            <span>💬</span>
                                            <span>↗️</span>
                                        </div>
                                        <span className="text-base text-amber-400">🔖</span>
                                    </div>

                                    {/* キャプションプレビュー */}
                                    <div className="px-3 pb-4 space-y-1 text-[11px] leading-snug">
                                        <div className="text-[10px] font-bold text-slate-300">
                                            いいね！ 342件
                                        </div>
                                        <div>
                                            <span className="font-bold mr-1.5 text-white">worldwide_tcg</span>
                                            <span className="text-slate-300 whitespace-pre-wrap line-clamp-4">
                                                {igPostText}
                                            </span>
                                        </div>
                                        {aiData?.snsPosts?.hashtags && (
                                            <p className="text-[10px] text-sky-400/90 line-clamp-1 font-mono">
                                                {aiData.snsPosts.hashtags.join(' ')}
                                            </p>
                                        )}
                                        <div className="text-[9px] text-slate-500 uppercase pt-1">
                                            1時間前 • 翻訳を見る
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだInstagram投稿が生成されていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* ✍️ X クリエイター（スレッドプレビュー統合） */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">✍️</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">X クリエイター</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('x_posts')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'x_posts' || runningAction === 'x' ? '制作中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>

                    {/* 曜日スロット切り替えタブ */}
                    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                        {dynamicXDays.map(d => (
                            <button
                                key={d.key}
                                type="button"
                                onClick={() => setSelectedXDay(d.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    selectedXDay === d.key
                                        ? 'bg-sky-500 text-white shadow-md ring-1 ring-sky-400/40'
                                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                                }`}
                            >
                                <span>{d.label}</span>
                                <span className="text-[10px] opacity-70 font-mono truncate max-w-[100px]">({d.desc})</span>
                            </button>
                        ))}
                    </div>

                    {aiData?.xPosts ? (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                            {/* 左カラム: 原稿テキスト・スレッドリスト */}
                            <div className="xl:col-span-7 space-y-5">
                                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-xl">
                                    <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-bold block mb-1">
                                                {DAY_LABELS[selectedXDay]} Viral Thread
                                            </span>
                                            <h3 className="text-base font-bold text-white">{aiData.xPosts.theme}</h3>
                                        </div>
                                    </div>

                                    {/* 1ポスト目 */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-sky-300">📌 1ポスト目（140字フック）</h4>
                                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                                    xMainPost.length <= 140 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                }`}>
                                                    {xMainPost.length} / 140文字
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(xMainPost, `x_main_${selectedXDay}`)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">
                                                    {copiedKey === `x_main_${selectedXDay}` ? '✓ コピー完了' : 'コピー'}
                                                </button>
                                                <button 
                                                    onClick={() => handlePublishToX(xMainPost, xThreadPosts)} 
                                                    disabled={isPublishingX}
                                                    className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1 rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1 transition active:scale-95"
                                                >
                                                    {isPublishingX ? '投稿中...' : `🐦 【${DAY_LABELS[selectedXDay]}】スレッド自動投稿`}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-950 rounded-lg text-xs text-white font-mono border border-sky-500/30 leading-relaxed">
                                            {xMainPost}
                                        </div>
                                    </div>

                                    {/* 2〜4ポスト目 */}
                                    <div className="space-y-2 pt-2 border-t border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-300">🧵 スレッド展開 (2〜4ポスト目)</h4>
                                        {xThreadPosts.map((tp, idx) => (
                                            <div key={idx} className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800 space-y-1">
                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                    <span>Post {idx + 2} ({tp.length}文字)</span>
                                                    <button onClick={() => handleCopy(tp, `x_thread_${selectedXDay}_${idx}`)} className="hover:text-white">
                                                        {copiedKey === `x_thread_${selectedXDay}_${idx}` ? '✓ コピー' : 'コピー'}
                                                    </button>
                                                </div>
                                                <p className="leading-relaxed whitespace-pre-wrap">{tp}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 🌟 右カラム: X (Twitter) 公式風スレッドプレビュー */}
                            <div className="xl:col-span-5 flex flex-col items-center">
                                <div className="w-full max-w-[400px] bg-black border border-slate-800 rounded-2xl p-4 shadow-2xl text-white font-sans text-xs space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                                        <span className="font-bold flex items-center gap-1.5">
                                            <span className="text-base text-white">𝕏</span> タイムライン・スレッド表示
                                        </span>
                                        <span className="text-[10px] text-slate-500">最新アルゴリズム適合</span>
                                    </div>

                                    {/* 1ポスト目（メインフック） */}
                                    <div className="space-y-3 relative">
                                        {/* ツリー結合線 */}
                                        {xThreadPosts.length > 0 && (
                                            <div className="absolute left-4 top-10 bottom-[-16px] w-[2px] bg-slate-800" />
                                        )}

                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sm">
                                                ⚡
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-white text-xs truncate">Worldwide TCG</span>
                                                    <span className="text-sky-400 text-[10px]">☑</span>
                                                    <span className="text-slate-500 text-[11px]">@worldwide_tcg</span>
                                                    <span className="text-slate-500 text-[11px]">· 1m</span>
                                                </div>
                                                <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">
                                                    {xMainPost}
                                                </p>

                                                {/* 添付画像4枚プレビュー枠 */}
                                                <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-slate-800/80 aspect-[16/9] bg-slate-950">
                                                    <div className="bg-slate-900 flex items-center justify-center p-2 text-center text-[9px] text-slate-400 border-r border-b border-slate-800">
                                                        📊 北米実成約データ
                                                    </div>
                                                    <div className="bg-slate-900 flex items-center justify-center p-2 text-center text-[9px] text-slate-400 border-b border-slate-800">
                                                        🇪🇺 欧州相場推移
                                                    </div>
                                                    <div className="bg-slate-900 flex items-center justify-center p-2 text-center text-[9px] text-slate-400 border-r border-slate-800">
                                                        🌏 アジア需要・プレミアム
                                                    </div>
                                                    <div className="bg-purple-950/40 flex items-center justify-center p-2 text-center text-[9px] text-purple-300 font-bold">
                                                        📈 3市場確定利ざや比較
                                                    </div>
                                                </div>

                                                {/* X アクションボタン */}
                                                <div className="flex justify-between items-center text-slate-500 text-xs mt-2.5 pt-1 px-1">
                                                    <span className="hover:text-sky-400 cursor-pointer">💬 12</span>
                                                    <span className="hover:text-green-400 cursor-pointer">🔁 45</span>
                                                    <span className="hover:text-pink-400 cursor-pointer">❤️ 189</span>
                                                    <span className="hover:text-sky-400 cursor-pointer">🔖 82</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2ポスト目以降（スレッドツリー表示） */}
                                    {xThreadPosts.map((threadText, tIdx) => {
                                        const isLast = tIdx === xThreadPosts.length - 1;
                                        return (
                                            <div key={tIdx} className="space-y-2 relative pt-1">
                                                {!isLast && (
                                                    <div className="absolute left-4 top-10 bottom-[-16px] w-[2px] bg-slate-800" />
                                                )}
                                                <div className="flex items-start gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-xs text-slate-400">
                                                        {tIdx + 2}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-white text-xs">Worldwide TCG</span>
                                                            <span className="text-slate-500 text-[11px]">@worldwide_tcg</span>
                                                        </div>
                                                        <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                                                            {threadText}
                                                        </p>
                                                        <div className="flex justify-between items-center text-slate-500 text-[11px] mt-2 pt-1 px-1">
                                                            <span>💬 4</span>
                                                            <span>🔁 18</span>
                                                            <span>❤️ 67</span>
                                                            <span>🔖 34</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだX投稿が生成されていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 💬 有料コミュニティ */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_sales' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💬</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">有料コミュニティ</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('sales')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'sales' ? '作成中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
                    {aiData?.salesDM ? (
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400 font-bold block mb-1">VIP Community Wholesale Offer</span>
                                    <h3 className="text-base font-bold text-white">{aiData.salesDM.offerSummary}</h3>
                                </div>
                                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-lg font-bold">対象: {aiData.salesDM.targetSegment}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <span className="text-[10px] text-slate-400 block mb-1">最低ロット条件</span>
                                    <span className="text-xs text-white font-bold">{aiData.salesDM.commercialTerms?.minimumOrderQty}</span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <span className="text-[10px] text-slate-400 block mb-1">推奨配送便</span>
                                    <span className="text-xs text-white font-bold">{aiData.salesDM.commercialTerms?.shippingMethod}</span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <span className="text-[10px] text-slate-400 block mb-1">推奨決済方法</span>
                                    <span className="text-xs text-white font-bold">{aiData.salesDM.commercialTerms?.paymentMethod}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-white">✉️ Discord投稿メッセージ全文</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCopy(aiData?.salesDM?.discordMessage || '', 'dm')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">{copiedKey === 'dm' ? '✓ コピー完了' : 'コピー'}</button>
                                        <button onClick={() => handlePublishToDiscord(aiData?.salesDM?.discordMessage || '')} disabled={isPublishingDiscord} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg shadow-md transition active:scale-95">{isPublishingDiscord ? '送信中...' : '🚀 Discordへ送信'}</button>
                                    </div>
                                </div>
                                <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-60 overflow-y-auto leading-relaxed">{aiData?.salesDM?.discordMessage}</pre>
                            </div>
                            <div className="bg-purple-950/20 p-3 rounded-lg border border-purple-900/30">
                                <h4 className="text-xs font-bold text-purple-300 mb-1">💡 商談・交渉ガイダンス</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">{aiData?.salesDM?.negotiationTip}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだDiscordオファーが生成されていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}
        </>
    );
}