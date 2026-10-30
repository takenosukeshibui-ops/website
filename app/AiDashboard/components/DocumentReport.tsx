import React, { useState } from 'react';

// 🌟 1セル分（本命1件＋候補4件）を描画するサブコンポーネント
const TierCell = ({ tier }: { tier: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // データが存在しない、または不完全な場合は非表示
    if (!tier || !tier.mainItem || !tier.mainItem.cardName) return null;

    const main = tier.mainItem;
    
    // 価格帯バッジのスタイル定義
    const getBadgeClass = (key: string) => {
        const map: Record<string, string> = {
            under_3k: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            under_10k: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
            middle: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            upper: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            top_end: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        };
        return map[key] || 'bg-slate-800 text-slate-300';
    };

    return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-lg overflow-hidden flex flex-col h-full shadow-md">
            {/* 👑 本命表示エリア */}
            <div className="p-3 space-y-2.5 relative flex-1">
                <div className="absolute top-0 right-0 bg-amber-500 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm">
                    本命
                </div>
                <div className="flex justify-between items-start gap-1 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {tier.priceTierLabel && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getBadgeClass(tier.priceTier)} whitespace-nowrap`}>
                                {tier.priceTierLabel}
                            </span>
                        )}
                        <span className="text-xs font-bold text-white leading-snug" title={main.cardName}>
                            {main.cardName}
                        </span>
                    </div>
                </div>
                
                {main.conditionGrade && (
                    <div className="flex justify-start">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700/50">
                            {main.conditionGrade}
                        </span>
                    </div>
                )}
                
                <div className="flex justify-between items-center text-[11px] font-mono border-t border-slate-800/60 pt-2">
                    <span className="text-slate-400">仕入: {main.jpBuyPriceJPY}</span>
                    <span className="text-emerald-400 font-bold">海外: {main.targetSoldPrice}</span>
                </div>
                
                {(main.priceSpreadJPY || main.spreadROI) && (
                    <div className="flex justify-between items-center text-[11px] font-mono bg-emerald-500/10 px-2 py-1 rounded text-emerald-300 border border-emerald-500/20">
                        <span>差額: {main.priceSpreadJPY}</span>
                        <span className="font-bold">ROI: {main.spreadROI}</span>
                    </div>
                )}
                
                {main.insight && (
                    <p className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/50 leading-relaxed mt-1">
                        <span className="text-amber-400 font-bold mr-1">💡</span>{main.insight}
                    </p>
                )}
            </div>

            {/* 🔄 代替候補アコーディオン */}
            {tier.subItems && tier.subItems.length > 0 && (
                <div className="border-t border-slate-800 bg-slate-950/50 mt-auto">
                    <button 
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full text-[10px] text-slate-400 font-bold py-1.5 hover:bg-slate-800 transition-colors flex justify-center items-center gap-1"
                    >
                        {isOpen ? '▲ 代替候補を閉じる' : `▼ 代替候補 (${tier.subItems.length}件) を見る`}
                    </button>
                    
                    {isOpen && (
                        <div className="p-2 space-y-2 border-t border-slate-800 bg-slate-950/80">
                            {tier.subItems.map((sub: any, i: number) => (
                                <div key={i} className="bg-slate-900/90 p-2 rounded border border-slate-800/80 space-y-1.5">
                                    <div className="flex justify-between items-start gap-1">
                                        <span className="text-[10px] font-bold text-slate-200 leading-snug">{sub.cardName}</span>
                                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700/50 whitespace-nowrap shrink-0">
                                            {sub.conditionGrade}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono border-t border-slate-800/60 pt-1">
                                        <span className="text-slate-400">仕入: {sub.jpBuyPriceJPY}</span>
                                        <span className="text-emerald-400 font-bold">差額: {sub.priceSpreadJPY}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function DocumentReportView({
    report,
    accentColor = 'amber',
    icon = '📄'
}: {
    report: any | null;
    accentColor?: 'amber' | 'emerald' | 'pink' | 'sky';
    icon?: string;
}) {
    const [selectedTier, setSelectedTier] = useState<string>('all');

    if (!report || !report.title) return <div className="text-slate-500 text-xs italic">レポートデータがありません</div>;

    const accentClasses = {
        amber: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
        emerald: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
        pink: 'border-pink-500/30 text-pink-300 bg-pink-500/10',
        sky: 'border-sky-500/30 text-sky-300 bg-sky-500/10'
    };
    const colorClass = accentClasses[accentColor];

    const priceTiers = [
        { key: 'all', label: 'すべて表示' },
        { key: 'under_3k', label: '〜3千円' },
        { key: 'under_10k', label: '3千〜1万円' },
        { key: 'middle', label: '1万〜3万円' },
        { key: 'upper', label: '3万〜8万円' },
        { key: 'top_end', label: '8万円〜' }
    ];

    // アービトラージマトリクスのデータかどうかを判定（tiers階層があるか）
    const isArbitrageMatrix = report.slots?.some((s: any) => s.tiers && s.tiers.length > 0);

    return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl overflow-hidden font-sans space-y-4">
            {/* ヘッダー */}
            <div className={`p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-950/50`}>
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{icon}</span>
                    <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-0.5">Strategic Intelligence Report</span>
                        <h3 className="text-base font-bold text-white leading-tight">{report.title}</h3>
                    </div>
                </div>
                {isArbitrageMatrix && (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        125銘柄網羅
                    </span>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* Claim */}
                <div className={`p-3 rounded-lg border ${colorClass}`}>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-80 flex items-center gap-1">
                        <span>🎯</span> 1. 結論・推奨アクション (Claim)
                    </h4>
                    <p className="text-sm font-bold leading-relaxed">{report.claim}</p>
                </div>

                {/* 🌟 5スロットマトリクス表示エリア */}
                {report.slots && report.slots.length > 0 && (
                    <div className="space-y-3 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <span>🗂️</span> マトリクス網羅リスト（本命＋候補）
                            </h4>
                            
                            {/* 価格帯切り替えフィルタータブ */}
                            {isArbitrageMatrix && (
                                <div className="flex flex-wrap gap-1">
                                    {priceTiers.map(t => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setSelectedTier(t.key)}
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                                selectedTier === t.key
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-600'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {report.slots.map((slot: any, idx: number) => {
                                // 🌟 新設計（tiers階層がある場合）
                                if (slot.tiers) {
                                    const displayedTiers = slot.tiers.filter((tier: any) => 
                                        selectedTier === 'all' || tier.priceTier === selectedTier
                                    );

                                    if (displayedTiers.length === 0) return null;

                                    return (
                                        <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-3">
                                            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                                                <span className="text-xs font-bold text-amber-300 font-mono">[{slot.slotKey}]</span>
                                                <span className="text-xs font-bold text-white">{slot.slotLabel}</span>
                                                <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                                    {displayedTiers.length}枠表示
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                                                {displayedTiers.map((tier: any, tIdx: number) => (
                                                    <TierCell key={tIdx} tier={tier} />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                
                                // 既存設計（items直下・トレンドなどで使用）のフォールバック
                                return (
                                    <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded">
                                        <span className="text-xs text-slate-400">レガシー形式のスロットデータ（{slot.slotLabel}）</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 以下、戦略レポート全体の表示 */}
                <div>
                    <h4 className="text-[11px] font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">💡 2. 戦略的根拠 (Reason)</h4>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pl-1">
                        {report.reasons?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 className="text-[11px] font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">📊 3. 客観的データ・市場数値 (Data / Fact)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {report.facts?.map((f: any, i: number) => (
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
                        {report.verificationChecklist?.map((c: string, i: number) => (
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
