// app/AiDashboard/components/DeskViews.tsx
import React, { useState } from 'react';
import { IntelligenceData, RegionKey, Gate1AuditItem, Gate2AuditItem } from '../types';
import DocumentReportView from './DocumentReport';

const DAYS_OF_WEEK = [
    { key: 'Monday', label: '月曜', postType: 'Flagship_GlobalCatalog', desc: '全体カタログ' },
    { key: 'Tuesday', label: '火曜', postType: 'Vintage_Focus', desc: 'クラシック枠' },
    { key: 'Wednesday', label: '水曜', postType: 'Promo_Focus', desc: '限定プロモ枠' },
    { key: 'Thursday', label: '木曜', postType: 'Modern_Meta_Focus', desc: '現行モダン枠' },
    { key: 'Friday', label: '金曜', postType: 'Graded_Sealed_Focus', desc: '高額鑑定BOX枠' },
    { key: 'Saturday', label: '土曜', postType: 'Hit_Proof_SocialProof', desc: '的中実績証明' },
    { key: 'Sunday', label: '日曜', postType: 'Weekly_Summary_CTA', desc: '週間総括CTA' }
];

interface DeskViewsProps {
    aiActiveDesk: string;
    activeTrendRegion: RegionKey;
    activeArbitrageRegion: RegionKey;
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

    const currentIgDaily = aiData?.snsPosts?.dailyPosts?.find(p => p.day?.includes(selectedIgDay) || p.day === selectedIgDay);
    const igPostText = currentIgDaily?.caption || aiData?.snsPosts?.posts?.hybridPost || '';

    const currentXDaily = aiData?.xPosts?.dailyThreads?.find(t => t.day?.includes(selectedXDay) || t.day === selectedXDay);
    const xMainPost = currentXDaily?.mainPost || aiData?.xPosts?.mainPost || '';
    const xThreadPosts = currentXDaily?.threadPosts || aiData?.xPosts?.threadPosts || [];

    // 地域・担当ごとに Gate 1 監査をフィルタリング
    const currentTrendAudits = gate1Audits.filter(a => a.agentKey === 'trend' && a.region === activeTrendRegion);
    const currentArbAudits = gate1Audits.filter(a => a.agentKey === 'arbitrage' && a.region === activeArbitrageRegion);

    return (
        <>
            {/* ========================================================= */}
            {/* 👑 チーフマネージャー戦略デスク */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_chief' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">👑</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">チーフマネージャー戦略デスク</h2>
                                <p className="text-xs text-slate-400">7日分のスロット割当選定 & 看板MVP銘柄のディレクション指示</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('chief')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'chief' ? '選定中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
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
                                    <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-bold uppercase">
                                        対象地域: {aiData.chiefPackage.mvpHighlight?.region || 'Global'}
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
                                    <div className="space-y-2.5">
                                        {aiData.chiefPackage.contentCalendar.map((item: any, cIdx: number) => (
                                            <div key={cIdx} className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 space-y-2 hover:border-amber-500/40 transition">
                                                <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                        <span className="text-amber-400">📌</span> {item.dayLabelJa || item.dayOfWeek}
                                                    </span>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                                                        {item.selectedCardOrTopic || item.postType}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">📢 無料フック（Fact & Result）</span>
                                                        <p className="text-[11px] text-slate-300 leading-snug">{item.hookFact || item.coreHookFact}</p>
                                                    </div>
                                                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                                        <span className="text-[10px] text-rose-400 font-bold block mb-0.5">🔒 秘匿指示（Action & Reason）</span>
                                                        <p className="text-[11px] text-slate-400 leading-snug">{item.hiddenActionReason || '仕入れルート・仕込み理由は非公開'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-bold text-slate-300 mb-1.5">⚖️ キュレーター選定理由</h4>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    {aiData.chiefPackage.mvpHighlight?.selectionReason || aiData.chiefPackage.selectionReason || '7日間の流動性と粗利マージンを総合勘案して選定'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだ選定が行われていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🛡️ 品質・規約監査役デスク（Gate 2 専任） */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_audit' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🛡️</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">品質・規約監査役デスク</h2>
                                <p className="text-xs text-slate-400">Gate 2（配信コンテンツ表現・機密漏洩・2股導線・文字数規約）最終監査結果</p>
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
                            <span className="text-xs text-slate-400">「撒き餌原則」および仕入れ先ワード漏洩の厳格審査</span>
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
                                        <div className="text-[11px] text-slate-400">
                                            対象曜日・スロット: <span className="text-slate-300 font-bold">{item.day}</span>
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
            {/* 🔮 市場トレンドアナリスト（自チームのGate 1監査結果を統合） */}
            {/* ========================================================= */}
            {aiActiveDesk.startsWith('desk_trend') && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🔮</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">市場トレンドアナリスト ({activeTrendRegion === 'us' ? '北米' : activeTrendRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                                <p className="text-xs text-slate-400">先行シグナル・急騰仮説レポート & 自チーム Gate 1 論理・大会規約監査</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('trend', activeTrendRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === `trend_${activeTrendRegion}` ? '調査中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>

                    {/* 🌟 自チームの Gate 1-B トレンド論理・規約監査ステータス */}
                    {currentTrendAudits.length > 0 && (
                        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-md">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <span>🛡️</span> 【{activeTrendRegion.toUpperCase()}市場】Gate 1 トレンド論理・大会規約 監査ステータス
                                </h3>
                                <span className="text-[11px] font-mono font-bold text-slate-300">
                                    適合: {currentTrendAudits.filter(a => a.status === 'passed').length} / {currentTrendAudits.length} 件
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                                {currentTrendAudits.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white truncate max-w-[130px]">{item.card}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                item.status === 'passed' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {item.status === 'passed' ? '✔ 適合' : '✖ 差し戻し'}
                                            </span>
                                        </div>
                                        {item.feedback && (
                                            <p className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 leading-relaxed whitespace-pre-wrap">
                                                💬 {item.feedback}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DocumentReportView report={aiData?.trendInsights?.[activeTrendRegion] || null} accentColor="amber" icon="📈" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 💎 アービトラージアナリスト（自チームのGate 1監査結果を統合） */}
            {/* ========================================================= */}
            {aiActiveDesk.startsWith('desk_arbitrage') && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💎</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">アービトラージアナリスト ({activeArbitrageRegion === 'us' ? '北米' : activeArbitrageRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                                <p className="text-xs text-slate-400">5スロット×5価格帯 調達ポートフォリオ & 自チーム Gate 1 数値マージン検算</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('arbitrage', activeArbitrageRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === `arbitrage_${activeArbitrageRegion}` ? '査定中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>

                    {/* 🌟 自チームの Gate 1-A 数値検算監査ステータス */}
                    {currentArbAudits.length > 0 && (
                        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-3 shadow-md">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                    <span>⚖️</span> 【{activeArbitrageRegion.toUpperCase()}市場】Gate 1 四則検算・粗利マージン 監査ステータス
                                </h3>
                                <span className="text-[11px] font-mono font-bold text-slate-300">
                                    検算合格: {currentArbAudits.filter(a => a.status === 'passed').length} / {currentArbAudits.length} 件
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                                {currentArbAudits.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white truncate max-w-[130px]">{item.card}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                item.status === 'passed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {item.status === 'passed' ? '✔ 検算OK' : '✖ 差額異常'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex justify-between">
                                            <span>枠: {item.slot}</span>
                                            <span>帯: {item.priceTier}</span>
                                        </div>
                                        {item.feedback && (
                                            <p className="text-[10px] text-red-300 bg-red-500/10 p-1.5 rounded border border-red-500/20 leading-relaxed whitespace-pre-wrap">
                                                💬 {item.feedback}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DocumentReportView report={aiData?.profitableCards?.[activeArbitrageRegion] || null} accentColor="emerald" icon="⚖️" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 📊 自社Instagramアナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_account' && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📊</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">自社Instagramアナリスト</h2>
                                <p className="text-xs text-slate-400">アカウントエンゲージメント・ファネル診断</p>
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
            {/* 🐦 自社X (Twitter) アナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x_account' && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🐦</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">自社X (Twitter) アナリスト</h2>
                                <p className="text-xs text-slate-400">Xアルゴリズム・エンゲージメント診断（140字・画像4枚・スレッド最適化）</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('x_account')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'x_account' ? '分析中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.xAccountInsights || null} accentColor="sky" icon="🐦" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 🎨 Instagram専任 投稿クリエイター */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_sns' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🎨</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">Instagram専任 投稿クリエイター</h2>
                                <p className="text-xs text-slate-400">7日分の日替わりカルーセル構成 & キャプション原稿（Gate 2 監査済み）</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('sns')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'sns' ? '制作中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                        {DAYS_OF_WEEK.map(d => (
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
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-pink-400 font-bold block mb-1">
                                        {selectedIgDay} Posting Slot
                                    </span>
                                    <h3 className="text-lg font-bold text-white">{aiData.snsPosts.theme}</h3>
                                </div>
                                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                                    推奨: {aiData.snsPosts.recommendedTiming || '日本時間 21:00'}
                                </span>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                <h4 className="text-xs font-bold text-amber-300 mb-2">🖼️ カルーセル画像スライド構成指示</h4>
                                <div className="space-y-1.5 text-xs text-slate-300">
                                    <p><span className="text-pink-400 font-bold">1枚目(表紙):</span> {aiData.snsPosts.visualGuideline?.coverSlide}</p>
                                    {aiData.snsPosts.visualGuideline?.carouselSlides?.map((s, i) => (
                                        <p key={i}><span className="text-slate-400 font-bold">{i + 2}枚目:</span> {s}</p>
                                    ))}
                                </div>
                            </div>

                            {aiData.snsPosts.hashtags && aiData.snsPosts.hashtags.length > 0 && (
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                                            <span>🏷️</span> 推奨ハッシュタグ
                                        </h4>
                                        <button 
                                            onClick={() => handleCopy(aiData.snsPosts?.hashtags?.join(' ') || '', 'ig_tags')}
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

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-white">📝 【{selectedIgDay}】投稿キャプション</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCopy(igPostText, `ig_${selectedIgDay}`)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">
                                            {copiedKey === `ig_${selectedIgDay}` ? '✓ コピー完了' : 'コピー'}
                                        </button>
                                        <button onClick={() => handlePublishToInstagram(igPostText, selectedIgDay)} className="text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold px-3 py-1 rounded-lg shadow-md transition active:scale-95">
                                            {isPublishingInstagram === selectedIgDay ? '投稿中...' : '📸 IGへ自動投稿'}
                                        </button>
                                    </div>
                                </div>
                                <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-60 overflow-y-auto leading-relaxed">
                                    {igPostText}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだInstagram投稿が生成されていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🐦 X (Twitter) 専任 投稿クリエイター */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🐦</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">X (Twitter) 専任 投稿クリエイター</h2>
                                <p className="text-xs text-slate-400">7日分の日替わり140字フック ＋ 4ポストスレッド展開（Gate 2 監査済み）</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('x_posts')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === 'x_posts' || runningAction === 'x' ? '制作中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                        {DAYS_OF_WEEK.map(d => (
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
                                <span className="text-[10px] opacity-70 font-mono">({d.desc})</span>
                            </button>
                        ))}
                    </div>

                    {aiData?.xPosts ? (
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="border-b border-slate-800 pb-3">
                                <span className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-bold block mb-1">
                                    {selectedXDay} Viral Thread
                                </span>
                                <h3 className="text-lg font-bold text-white">{aiData.xPosts.theme}</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-sky-300">📌 1ポスト目（140字以内フック ＋ 画像添付案内）</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCopy(xMainPost, `x_main_${selectedXDay}`)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">
                                            {copiedKey === `x_main_${selectedXDay}` ? '✓ コピー完了' : 'コピー'}
                                        </button>
                                        <button 
                                            onClick={() => handlePublishToX(xMainPost, xThreadPosts)} 
                                            disabled={isPublishingX}
                                            className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1 rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1 transition active:scale-95"
                                        >
                                            {isPublishingX ? '投稿中...' : `🐦 【${selectedXDay}】スレッド自動投稿`}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-950 rounded-lg text-xs text-white font-mono border border-sky-500/30 leading-relaxed">
                                    {xMainPost}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-300">🧵 スレッド展開 (2〜4ポスト目)</h4>
                                {xThreadPosts.map((tp, idx) => (
                                    <div key={idx} className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800 space-y-1">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                                            <span>Post {idx + 2}</span>
                                            <button onClick={() => handleCopy(tp, `x_thread_${selectedXDay}_${idx}`)} className="hover:text-white">
                                                {copiedKey === `x_thread_${selectedXDay}_${idx}` ? '✓ コピー' : 'コピー'}
                                            </button>
                                        </div>
                                        <p className="leading-relaxed">{tp}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだX投稿が生成されていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 💬 コミュニティ営業AIデスク (Discord) */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_sales' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💬</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">コミュニティ営業AIデスク (Discord)</h2>
                                <p className="text-xs text-slate-400">大口バイヤー向けVIPチャンネル直送 ロットオファー（Gate 2 監査済み）</p>
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
                                        <button onClick={() => handleCopy(aiData.salesDM?.discordMessage || '', 'dm')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">{copiedKey === 'dm' ? '✓ コピー完了' : 'コピー'}</button>
                                        <button onClick={() => handlePublishToDiscord(aiData.salesDM?.discordMessage || '')} disabled={isPublishingDiscord} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg shadow-md transition active:scale-95">{isPublishingDiscord ? '送信中...' : '🚀 Discordへ送信'}</button>
                                    </div>
                                </div>
                                <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-60 overflow-y-auto leading-relaxed">{aiData.salesDM.discordMessage}</pre>
                            </div>
                            <div className="bg-purple-950/20 p-3 rounded-lg border border-purple-900/30">
                                <h4 className="text-xs font-bold text-purple-300 mb-1">💡 商談・交渉ガイダンス</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">{aiData.salesDM.negotiationTip}</p>
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