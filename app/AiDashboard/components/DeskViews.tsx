// app/AiDashboard/components/DeskViews.tsx
import React from 'react';
import { IntelligenceData, RegionKey } from '../types';
import DocumentReportView from './DocumentReport';

interface DeskViewsProps {
    aiActiveDesk: string;
    activeTrendRegion: RegionKey;
    activeArbitrageRegion: RegionKey;
    aiData: IntelligenceData | null;
    runningAction: string | null;
    runSingleAi: (action: string, region?: RegionKey) => void;
    handleCopy: (text: string, key: string) => void;
    copiedKey: string | null;
    handlePublishToInstagram: (content: string, typeKey: string, imageUrl?: string) => void;
    isPublishingInstagram: string | null;
    handlePublishToDiscord: (content: string) => void;
    isPublishingDiscord: boolean;
    handlePublishToX: (mainPost: string, threadPosts: string[]) => void; // 🌟 X投稿ハンドラー
    isPublishingX: boolean; // 🌟 X投稿ローディングState
}

export default function DeskViews({
    aiActiveDesk, activeTrendRegion, activeArbitrageRegion, aiData,
    runningAction, runSingleAi, handleCopy, copiedKey,
    handlePublishToInstagram, isPublishingInstagram,
    handlePublishToDiscord, isPublishingDiscord,
    handlePublishToX, isPublishingX
}: DeskViewsProps) {
    return (
        <>
            {/* ========================================================= */}
            {/* 👑 チーフマネージャー戦略デスク */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_chief' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">👑</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">チーフマネージャー戦略デスク</h2>
                                <p className="text-xs text-slate-400">6地域レポートから最優秀撒き餌案件を審査・ディレクション指示発行</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('chief')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === 'chief' ? '審査中...' : '🔄 案件を再審査・選定'}
                        </button>
                    </div>
                    {aiData?.chiefPackage ? (
                        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold block mb-1">
                                        {aiData.chiefPackage.leadMagnetTitle || "Winning Lead Magnet Package"}
                                    </span>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span>🏆</span><span>{aiData.chiefPackage.mvpHighlight?.cardName || aiData.chiefPackage.chosenCardOrItem}</span>
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-bold">
                                        {aiData.chiefPackage.selectedLeadMagnetType === 'GlobalCatalog' ? '世界3大市場カタログ' : aiData.chiefPackage.selectedLeadMagnetType === 'TypeA_Arbitrage' ? 'タイプA: 確定利ざや' : 'タイプB: 市場トレンド'}
                                    </span>
                                    <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-bold uppercase">
                                        対象地域: {aiData.chiefPackage.winningRegion}
                                    </span>
                                </div>
                            </div>

                            {/* 🌟 3地域横断マトリクス */}
                            {aiData.chiefPackage.regionalMatrix && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                                        <span>🌐</span> 世界3大市場（米・欧・亜）インテリジェンス・マトリクス
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                            <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                                                <span className="text-xs font-bold text-blue-400">🇺🇸 北米 (US)</span>
                                            </div>
                                            <p className="text-[11px] text-slate-300"><span className="text-emerald-400 font-bold">サヤ:</span> {aiData.chiefPackage.regionalMatrix.us?.topArbitrage}</p>
                                            <p className="text-[11px] text-slate-300"><span className="text-amber-400 font-bold">トレンド:</span> {aiData.chiefPackage.regionalMatrix.us?.topTrend}</p>
                                            <p className="text-[10px] text-slate-400 italic pt-1">{aiData.chiefPackage.regionalMatrix.us?.summary}</p>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                            <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                                                <span className="text-xs font-bold text-emerald-400">🇪🇺 欧州 (EU)</span>
                                            </div>
                                            <p className="text-[11px] text-slate-300"><span className="text-emerald-400 font-bold">サヤ:</span> {aiData.chiefPackage.regionalMatrix.eu?.topArbitrage}</p>
                                            <p className="text-[11px] text-slate-300"><span className="text-amber-400 font-bold">トレンド:</span> {aiData.chiefPackage.regionalMatrix.eu?.topTrend}</p>
                                            <p className="text-[10px] text-slate-400 italic pt-1">{aiData.chiefPackage.regionalMatrix.eu?.summary}</p>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                            <div className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                                                <span className="text-xs font-bold text-purple-400">🌏 アジア (Asia)</span>
                                            </div>
                                            <p className="text-[11px] text-slate-300"><span className="text-emerald-400 font-bold">サヤ:</span> {aiData.chiefPackage.regionalMatrix.asia?.topArbitrage}</p>
                                            <p className="text-[11px] text-slate-300"><span className="text-amber-400 font-bold">トレンド:</span> {aiData.chiefPackage.regionalMatrix.asia?.topTrend}</p>
                                            <p className="text-[10px] text-slate-400 italic pt-1">{aiData.chiefPackage.regionalMatrix.asia?.summary}</p>
                                        </div>
                                    </div>
                                    {aiData.chiefPackage.globalInsight && (
                                        <p className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 mt-2 leading-relaxed">
                                            <span className="text-amber-300 font-bold mr-1">🔍 グローバル示唆:</span>
                                            {aiData.chiefPackage.globalInsight}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 🌟 7日分週間コンテンツカレンダー */}
                            {aiData.chiefPackage.contentCalendar && aiData.chiefPackage.contentCalendar.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-1.5">
                                        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                            <span>📅</span> 週間コンテンツカレンダー（月曜〜日曜 7日分の日替わり投稿プラン）
                                        </h4>
                                        <span className="text-[10px] text-slate-400">SNS投稿ネタ切れ完全防止</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {aiData.chiefPackage.contentCalendar.map((item: any, cIdx: number) => (
                                            <div key={cIdx} className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 space-y-2 hover:border-amber-500/40 transition">
                                                <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                        <span className="text-amber-400">📌</span> {item.dayLabelJa}
                                                    </span>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                                                        {item.postType}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">📢 無料SNS用フック (Fact & Result)</span>
                                                        <p className="text-[11px] text-slate-300 leading-snug">{item.hookFact}</p>
                                                    </div>
                                                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800/40">
                                                        <span className="text-[10px] text-rose-400 font-bold block mb-0.5">🔒 秘匿指示 (Action & Reason)</span>
                                                        <p className="text-[11px] text-slate-400 leading-snug">{item.hiddenActionReason}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/40">
                                                    <span className="text-pink-400 font-bold">IG:</span>
                                                    <span className="truncate flex-1">{item.directiveForCreator?.instagramAngle}</span>
                                                    <span className="text-sky-400 font-bold">X:</span>
                                                    <span className="truncate flex-1">{item.directiveForCreator?.xTwitterAngle}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-bold text-slate-300 mb-1.5">⚖️ チーフの選定理由（戦略的根拠）</h4>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    {aiData.chiefPackage.mvpHighlight?.selectionReason || aiData.chiefPackage.selectionReason}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-amber-400 mb-1.5">🎯 看板投稿用『撒き餌』フック（Fact & Result）</h4>
                                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-200 leading-relaxed">
                                    {aiData.chiefPackage.mvpHighlight?.hookFact || aiData.chiefPackage.coreHookFact}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 block">※国内仕入れルートや具体的手配方法（Reason/Action）は秘匿され、Discord・サイトへ誘導します。</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                <div className="bg-slate-950 p-3 rounded-lg border border-pink-500/30">
                                    <h5 className="text-xs font-bold text-pink-400 mb-1">📸 Instagram指示</h5>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{aiData.chiefPackage.creativeDirective?.instagramAngle}</p>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-lg border border-sky-500/30">
                                    <h5 className="text-xs font-bold text-sky-400 mb-1">🐦 X (Twitter) 指示</h5>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{aiData.chiefPackage.creativeDirective?.xTwitterAngle || '短文フック＋スレッド展開'}</p>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-lg border border-purple-500/30">
                                    <h5 className="text-xs font-bold text-purple-400 mb-1">✉️ Discord担当指示</h5>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{aiData.chiefPackage.creativeDirective?.discordOfferAngle}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだチーフの選定が行われていません。「全11AIに一斉調査・発信制作を指示」または「案件を再審査・選定」を実行してください。</div>
                    )}

                    {/* 的中実績証明パッケージ */}
                    <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold block mb-1">Type C: Social Proof Lead Magnet</span>
                                <h3 className="text-base font-bold text-white flex items-center gap-2"><span>🎯</span><span>的中実績証明パッケージ（社会的証明・権威性構築）</span></h3>
                            </div>
                            <button onClick={() => runSingleAi('proof')} disabled={runningAction === 'proof'} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                                {runningAction === 'proof' ? '過去ログ照合中...' : '🔄 的中実績を自動発掘・生成'}
                            </button>
                        </div>
                        {aiData?.proofPackage ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800"><span className="text-[10px] text-slate-400 block">的中銘柄</span><span className="text-white font-bold text-xs truncate block">{aiData.proofPackage.cardName}</span></div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800"><span className="text-[10px] text-slate-400 block">予測時期相場 ({aiData.proofPackage.predictedDate})</span><span className="text-slate-300 font-mono text-xs">{aiData.proofPackage.predictedPrice}</span></div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800"><span className="text-[10px] text-slate-400 block">現在の海外実成約</span><span className="text-emerald-400 font-mono font-bold text-xs">{aiData.proofPackage.currentPrice}</span></div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/30"><span className="text-[10px] text-emerald-400 block">急騰上昇率</span><span className="text-emerald-300 font-mono font-bold text-sm">{aiData.proofPackage.growthRate}</span></div>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <span className="text-[11px] font-bold text-amber-300 block mb-1">🖼️ ビフォーアフター比較画像指示</span>
                                    <p className="text-xs text-slate-300 mb-0.5">左(当時): {aiData.proofPackage.visualGuideline?.beforeImageDesc}</p>
                                    <p className="text-xs text-slate-300">右(現在): {aiData.proofPackage.visualGuideline?.afterImageDesc}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-300 block mb-1">📝 タイプC 投稿キャプション（VIP Discord誘導主軸）</span>
                                    <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-56 overflow-y-auto leading-relaxed">{aiData.proofPackage.proofPost}</pre>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                    <button onClick={() => handleCopy(aiData.proofPackage?.proofPost || '', 'proof')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300">{copiedKey === 'proof' ? '✓ コピー完了' : 'コピー'}</button>
                                    <button onClick={() => handlePublishToInstagram(aiData.proofPackage?.proofPost || '', 'proof')} className="text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold px-3 py-1.5 rounded-lg">📸 Instagramへ投稿</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/60 border border-slate-800 rounded-lg">過去ログを照合して的中銘柄を抽出するには「🔄 的中実績を自動発掘・生成」をクリックしてください。</div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 🔮 市場トレンドアナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk.startsWith('desk_trend') && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🔮</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">市場トレンドアナリスト ({activeTrendRegion === 'us' ? '北米' : activeTrendRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                                <p className="text-xs text-slate-400">海外市場トレンド先行兆候調査（地域専任）</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('trend', activeTrendRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === `trend_${activeTrendRegion}` ? '調査中...' : `🔄 ${activeTrendRegion.toUpperCase()}担当に調査指示`}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.trendInsights?.[activeTrendRegion] || null} accentColor="amber" icon="📈" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 💎 アービトラージアナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk.startsWith('desk_arbitrage') && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💎</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">アービトラージアナリスト ({activeArbitrageRegion === 'us' ? '北米' : activeArbitrageRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('arbitrage', activeArbitrageRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === `arbitrage_${activeArbitrageRegion}` ? '査定中...' : `🔄 ${activeArbitrageRegion.toUpperCase()}担当に査定指示`}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.profitableCards?.[activeArbitrageRegion] || null} accentColor="emerald" icon="⚖️" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 📊 自社Instagramアナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_account' && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📊</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">自社Instagramアナリスト</h2>
                                <p className="text-xs text-slate-400">アカウントエンゲージメント・ファネル診断</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('account')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === 'account' ? '分析中...' : '🔄 アカウント診断を実行'}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.accountInsights || null} accentColor="pink" icon="📱" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 🐦 自社X (Twitter) アナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x_account' && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🐦</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">自社X (Twitter) アナリスト</h2>
                                <p className="text-xs text-slate-400">Xアルゴリズム・エンゲージメント診断（140字・画像4枚・スレッド最適化）</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('x_account')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === 'x_account' ? '分析中...' : '🔄 Xアカウント診断を実行'}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.xAccountInsights || null} accentColor="sky" icon="🐦" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 🎨 Instagram専任 投稿クリエイター */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_sns' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🎨</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">Instagram専任 投稿クリエイター</h2>
                                <p className="text-xs text-slate-400">答えを教えない撒き餌設計（Fact/Result提示、Action/Reason秘匿）に基づくカルーセル・キャプション作成</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('sns')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === 'sns' ? '制作中...' : '🔄 投稿原稿を再生成'}
                        </button>
                    </div>
                    {aiData?.snsPosts ? (
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="border-b border-slate-800 pb-3">
                                <span className="text-[10px] uppercase font-mono tracking-widest text-pink-400 font-bold block mb-1">Weekly Lead Magnet Theme</span>
                                <h3 className="text-lg font-bold text-white">{aiData.snsPosts.theme}</h3>
                                <p className="text-xs text-slate-400 mt-1">推奨投稿時間: {aiData.snsPosts.recommendedTiming}</p>
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

                            {/* 🌟 推奨ハッシュタグ表示＆一括コピー枠 */}
                            {aiData.snsPosts.hashtags && aiData.snsPosts.hashtags.length > 0 && (
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                                            <span>🏷️</span> 推奨ハッシュタグ (英語圏コレクター・投資家向け)
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
                                    <h4 className="text-xs font-bold text-white">📝 投稿キャプション (ハイブリッド推奨版)</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCopy(aiData.snsPosts?.posts?.hybridPost || '', 'hybrid')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">{copiedKey === 'hybrid' ? '✓ コピー完了' : 'コピー'}</button>
                                        <button onClick={() => handlePublishToInstagram(aiData.snsPosts?.posts?.hybridPost || '', 'hybrid')} className="text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold px-3 py-1 rounded-lg">📸 IGへ投稿</button>
                                    </div>
                                </div>
                                <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-60 overflow-y-auto leading-relaxed">{aiData.snsPosts.posts?.hybridPost}</pre>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだInstagram投稿が生成されていません。「🔄 投稿原稿を再生成」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🐦 X (Twitter) 専任 投稿クリエイター */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🐦</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">X (Twitter) 専任 投稿クリエイター</h2>
                                <p className="text-xs text-slate-400">140字フック＋画像4枚＋スレッド展開によるインプレッション最大化と2股導線誘導</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('x_posts')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === 'x_posts' || runningAction === 'x' ? '制作中...' : '🔄 X投稿原稿を再生成'}
                        </button>
                    </div>
                    {aiData?.xPosts ? (
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="border-b border-slate-800 pb-3">
                                <span className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-bold block mb-1">X Viral Thread Package</span>
                                <h3 className="text-lg font-bold text-white">{aiData.xPosts.theme}</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-sky-300">📌 1ポスト目（140字以内フック ＋ 画像添付案内）</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCopy(aiData.xPosts?.mainPost || '', 'x_main')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">{copiedKey === 'x_main' ? '✓ コピー完了' : 'コピー'}</button>
                                        <button 
                                            onClick={() => handlePublishToX(aiData.xPosts?.mainPost || '', aiData.xPosts?.threadPosts || [])} 
                                            disabled={isPublishingX}
                                            className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1 rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1 transition active:scale-95"
                                        >
                                            {isPublishingX ? '投稿中...' : '🐦 Xへスレッド投稿'}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-950 rounded-lg text-xs text-white font-mono border border-sky-500/30 leading-relaxed">{aiData.xPosts.mainPost}</div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-300">🧵 スレッド展開 (2〜4ポスト目)</h4>
                                {aiData.xPosts.threadPosts?.map((tp, idx) => (
                                    <div key={idx} className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800 space-y-1">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                                            <span>Post {idx + 2}</span>
                                            <button onClick={() => handleCopy(tp, `x_thread_${idx}`)} className="hover:text-white">{copiedKey === `x_thread_${idx}` ? '✓ コピー' : 'コピー'}</button>
                                        </div>
                                        <p className="leading-relaxed">{tp}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <h4 className="text-xs font-bold text-amber-300 mb-2">🖼️ 添付画像4枚の指示</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                                    {aiData.xPosts.imageGuideline?.map((ig, i) => (
                                        <div key={i} className="bg-slate-900 px-3 py-2 rounded border border-slate-800/80">
                                            <span className="text-amber-400 font-bold block mb-0.5">画像 {i + 1}</span>
                                            <span className="text-[11px] text-slate-400">{ig}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだX投稿が生成されていません。「🔄 X投稿原稿を再生成」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 💬 コミュニティ営業AIデスク (Discord) */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_dm' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💬</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">コミュニティ営業AIデスク (Discord)</h2>
                                <p className="text-xs text-slate-400">VIPコミュニティ（大口バイヤー向けチャンネル）直送ロットオファー</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('dm')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === 'dm' ? '作成中...' : '🔄 Discordオファーを再作成'}
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
                                        <button onClick={() => handlePublishToDiscord(aiData.salesDM?.discordMessage || '')} disabled={isPublishingDiscord} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg shadow-md">{isPublishingDiscord ? '送信中...' : '🚀 Discordへ送信'}</button>
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
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだDiscordオファーが生成されていません。「🔄 Discordオファーを再作成」を実行してください。</div>
                    )}
                </div>
            )}
        </>
    );
}