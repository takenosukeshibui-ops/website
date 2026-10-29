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
}

export default function DeskViews({
    aiActiveDesk, activeTrendRegion, activeArbitrageRegion, aiData,
    runningAction, runSingleAi, handleCopy, copiedKey,
    handlePublishToInstagram, isPublishingInstagram,
    handlePublishToDiscord, isPublishingDiscord
}: DeskViewsProps) {
    return (
        <>
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
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold block mb-1">Winning Lead Magnet Package</span>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span>🏆</span><span>{aiData.chiefPackage.chosenCardOrItem}</span>
                                    </h3>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-bold">
                                        {aiData.chiefPackage.selectedLeadMagnetType === 'TypeA_Arbitrage' ? 'タイプA: 確定利ざや' : 'タイプB: 市場トレンド'}
                                    </span>
                                    <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-bold uppercase">
                                        対象地域: {aiData.chiefPackage.winningRegion}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-300 mb-1.5">⚖️ チーフの選定理由（戦略的根拠）</h4>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">{aiData.chiefPackage.selectionReason}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-amber-400 mb-1.5">🎯 無料SNS用『撒き餌』フック（Fact & Result）</h4>
                                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-200 leading-relaxed">{aiData.chiefPackage.coreHookFact}</div>
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
                        {/* 地域切り替えタブは削除、個別指示ボタンのみ */}
                        <button onClick={() => runSingleAi('trend', activeTrendRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === `trend_${activeTrendRegion}` ? '調査中...' : `🔄 ${activeTrendRegion.toUpperCase()}担当に調査指示`}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.trendInsights?.[activeTrendRegion] || null} accentColor="amber" icon="📈" />
                </div>
            )}

            {aiActiveDesk.startsWith('desk_arbitrage') && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💎</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">アービトラージアナリスト ({activeArbitrageRegion === 'us' ? '北米' : activeArbitrageRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                                <p className="text-xs text-slate-400">実質純利益（Net ROI）査定レポート（地域専任）</p>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('arbitrage', activeArbitrageRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md">
                            {runningAction === `arbitrage_${activeArbitrageRegion}` ? '査定中...' : `🔄 ${activeArbitrageRegion.toUpperCase()}担当に査定指示`}
                        </button>
                    </div>
                    <DocumentReportView report={aiData?.profitableCards?.[activeArbitrageRegion] || null} accentColor="emerald" icon="⚖️" />
                </div>
            )}

            {aiActiveDesk === 'desk_account' && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3"><span className="text-3xl">📊</span><div><h2 className="text-lg font-bold text-white">IGアナリスト専用デスク</h2><p className="text-xs text-slate-400">自社Instagram反応分析・ファネル改善レポート</p></div></div>
                        <button onClick={() => runSingleAi('account')} disabled={runningAction === 'account'} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md">{runningAction === 'account' ? '分析中...' : '🔄 アカウント再分析'}</button>
                    </div>
                    <DocumentReportView report={aiData?.accountInsights || null} accentColor="pink" icon="📱" />
                </div>
            )}

            {aiActiveDesk === 'desk_x_account' && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3"><span className="text-3xl">📈</span><div><h2 className="text-lg font-bold text-white">Xアナリスト専用デスク</h2><p className="text-xs text-slate-400">Xアルゴリズム・拡散ルール・インプレッション最大化診断</p></div></div>
                        <button onClick={() => runSingleAi('x_account')} disabled={runningAction === 'x_account'} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md">{runningAction === 'x_account' ? '診断中...' : '🔄 Xアカウント・戦術診断'}</button>
                    </div>
                    <DocumentReportView report={aiData?.xAccountInsights || null} accentColor="sky" icon="🐦" />
                </div>
            )}

            {aiActiveDesk === 'desk_sns' && (
                <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3"><span className="text-3xl">📸</span><div><h2 className="text-lg font-bold text-white">Instagram 担当専用デスク</h2><p className="text-xs text-slate-400">Instagramカルーセル構成 ＆ 誘導キャプション</p></div></div>
                        <button onClick={() => runSingleAi('sns')} disabled={runningAction === 'sns'} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold">{runningAction === 'sns' ? '作成中...' : '🔄 全パターン再生成'}</button>
                    </div>
                    <div className="bg-slate-900 border border-sky-500/30 rounded-xl p-4 text-xs space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2"><span className="font-bold text-sky-300">🎨 推奨カルーセルスライド構成</span><span className="font-mono text-slate-400">⏰ {aiData?.snsPosts?.recommendedTiming || '未設定'}</span></div>
                        <p className="text-slate-300 font-medium">1枚目(カバー): {aiData?.snsPosts?.visualGuideline?.coverSlide || '未生成'}</p>
                        <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-2">{aiData?.snsPosts?.visualGuideline?.carouselSlides?.map((slide, i) => <li key={i}>{slide}</li>) || <li className="italic text-slate-600">スライド指示なし</li>}</ul>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between">
                            <div><span className="text-xs font-bold text-amber-400 block mb-2">★ 推奨: トレンド×サヤ</span><pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">{aiData?.snsPosts?.posts?.hybridPost || 'データがありません。'}</pre></div>
                            <div className="flex gap-2">
                                <button onClick={() => handleCopy(aiData?.snsPosts?.posts?.hybridPost || '', 'hybrid')} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">コピー</button>
                                <button onClick={() => handlePublishToInstagram(aiData?.snsPosts?.posts?.hybridPost || '', 'hybrid')} className="text-xs bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                            <div><span className="text-xs font-bold text-emerald-400 block mb-2">利益・価格差重視</span><pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">{aiData?.snsPosts?.posts?.arbitragePost || 'データがありません。'}</pre></div>
                            <div className="flex gap-2">
                                <button onClick={() => handleCopy(aiData?.snsPosts?.posts?.arbitragePost || '', 'arbitrage')} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">コピー</button>
                                <button onClick={() => handlePublishToInstagram(aiData?.snsPosts?.posts?.arbitragePost || '', 'arbitrage')} className="text-xs bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                            <div><span className="text-xs font-bold text-sky-400 block mb-2">考察・トレンド重視</span><pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto mb-3 bg-slate-950 p-2.5 rounded border border-slate-800">{aiData?.snsPosts?.posts?.trendPost || 'データがありません。'}</pre></div>
                            <div className="flex gap-2">
                                <button onClick={() => handleCopy(aiData?.snsPosts?.posts?.trendPost || '', 'trend')} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">コピー</button>
                                <button onClick={() => handlePublishToInstagram(aiData?.snsPosts?.posts?.trendPost || '', 'trend')} className="text-xs bg-pink-600 hover:bg-pink-500 text-white font-bold px-2 py-1 rounded flex-1">IG投稿</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {aiActiveDesk === 'desk_x' && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3"><span className="text-3xl">🐦</span><div><h2 className="text-lg font-bold text-white">X クリエイター専用デスク</h2><p className="text-xs text-slate-400">140字フック ＆ スレッド考察ツリー展開</p></div></div>
                        <button onClick={() => runSingleAi('x')} disabled={runningAction === 'x'} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold shadow-md">{runningAction === 'x' ? '作成中...' : '🔄 X投稿文を生成'}</button>
                    </div>
                    <div className="bg-slate-900 border border-sky-500/40 rounded-xl p-5 space-y-3 shadow-lg">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-sky-300 flex items-center gap-1.5"><span>📌</span> 1ポスト目（140文字フック）</span><span className="text-[10px] text-slate-400 font-mono">{aiData?.xPosts?.mainPost?.length || 0} 文字</span></div>
                        <pre className="p-3.5 bg-slate-950 rounded-lg text-xs text-slate-200 whitespace-pre-wrap font-sans border border-slate-800 leading-relaxed">{aiData?.xPosts?.mainPost || 'データがありません。'}</pre>
                        <div className="flex justify-end"><button onClick={() => handleCopy(aiData?.xPosts?.mainPost || '', 'x_main')} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300">{copiedKey === 'x_main' ? '✓ コピー完了' : '本文をコピー'}</button></div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs font-bold text-slate-300">🖼️ 添付画像 4枚グリッド指示</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {aiData?.xPosts?.imageGuideline?.map((desc, i) => (
                                <div key={i} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-400"><span className="text-sky-400 font-mono font-bold mr-1.5">#{i + 1}</span> {desc}</div>
                            )) || <div className="text-slate-600 text-xs italic">画像指示データがありません</div>}
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                        <h4 className="text-xs font-bold text-slate-300">🧵 考察スレッド（ツリー投稿）</h4>
                        <div className="space-y-2.5">
                            {aiData?.xPosts?.threadPosts?.map((post, i) => (
                                <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 relative group">
                                    <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500 font-mono"><span>ツリー #{i + 2}</span><button onClick={() => handleCopy(post, `x_thread_${i}`)} className="text-slate-400 hover:text-white">{copiedKey === `x_thread_${i}` ? '✓ コピー済' : 'コピー'}</button></div>
                                    <p className="whitespace-pre-wrap leading-relaxed">{post}</p>
                                </div>
                            )) || <div className="text-slate-600 text-xs italic">スレッドデータがありません</div>}
                        </div>
                    </div>
                </div>
            )}

            {aiActiveDesk === 'desk_sales' && (
                <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3"><span className="text-3xl">✉️</span><div><h2 className="text-lg font-bold text-white">有料コミュニティ担当専用デスク</h2><p className="text-xs text-slate-400">大口バイヤー向け実務商談オファー（MOQ・商条件付き）</p></div></div>
                        <button onClick={() => runSingleAi('dm')} disabled={runningAction === 'dm'} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold">{runningAction === 'dm' ? '作成中...' : '🔄 営業文再生成'}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 space-y-1"><span className="font-bold text-indigo-300 block mb-1">📦 取引条件 (Commercial Terms)</span><p className="text-slate-300">最低ロット: <span className="text-white font-mono">{aiData?.salesDM?.commercialTerms?.minimumOrderQty || '-'}</span></p><p className="text-slate-300">配送便: <span className="text-white">{aiData?.salesDM?.commercialTerms?.shippingMethod || '-'}</span></p><p className="text-slate-300">決済方法: <span className="text-white">{aiData?.salesDM?.commercialTerms?.paymentMethod || '-'}</span></p></div>
                        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 space-y-1"><span className="font-bold text-amber-300 block mb-1">🤝 価格交渉対策 (Negotiation Tip)</span><p className="text-slate-300 leading-relaxed text-[11px]">{aiData?.salesDM?.negotiationTip || '未設定'}</p></div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center text-xs"><span className="font-bold text-white">{aiData?.salesDM?.offerSummary || 'オファー未生成'}</span><span className="text-slate-400 font-mono text-[10px]">Target: {aiData?.salesDM?.targetSegment || '-'}</span></div>
                        <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{aiData?.salesDM?.discordMessage || 'データがありません。'}</pre>
                        <div className="flex justify-end gap-2"><button onClick={() => handleCopy(aiData?.salesDM?.discordMessage || '', 'dm')} className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">{copiedKey === 'dm' ? '✓ コピー完了' : 'コピー'}</button><button onClick={() => handlePublishToDiscord(aiData?.salesDM?.discordMessage || '')} disabled={isPublishingDiscord} className="text-xs font-bold px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg flex items-center gap-1.5 shadow-sm">{isPublishingDiscord ? '送信中...' : '💬 Discord有料コミュニティへ送信'}</button></div>
                    </div>
                </div>
            )}
        </>
    );
}