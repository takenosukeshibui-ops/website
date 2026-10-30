import React, { useState } from 'react';

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
    const [openSubIndex, setOpenSubIndex] = useState<string | null>(null);

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
        { key: 'under_3k', label: '〜3千円', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
        { key: 'under_10k', label: '3千〜1万円', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
        { key: 'middle', label: '1万〜3万円', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        { key: 'upper', label: '3万〜8万円', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
        { key: 'top_end', label: '8万円〜', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
    ];

    const getTierBadgeClass = (tierKey?: string) => {
        const found = priceTiers.find(t => t.key === tierKey);
        return found?.badge || 'bg-slate-800 text-slate-300 border-slate-700';
    };

    const toggleSub = (cellId: string) => {
        setOpenSubIndex(prev => prev === cellId ? null : cellId);
    };

    const hasArbitrageTiers = report.slots?.some((s: any) => s.tiers && s.tiers.length > 0);
    const hasLegacyItems = report.slots?.some((s: any) => s.items && s.items.length > 0);

    return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl overflow-hidden font-sans space-y-4">
            <div className="p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{icon}</span>
                    <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-0.5">Strategic Intelligence Report</span>
                        <h3 className="text-base font-bold text-white leading-tight">{report.title}</h3>
                    </div>
                </div>
                {report.slots && report.slots.length > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        {hasArbitrageTiers ? '5スロット × 5価格帯 × 5候補 (125枠)' : `5スロット網羅 (${report.slots.length}枠)`}
                    </span>
                )}
            </div>

            <div className="p-5 space-y-5">
                <div className={`p-3 rounded-lg border ${colorClass}`}>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-80 flex items-center gap-1">
                        <span>🎯</span> 1. 結論・推奨アクション (Claim)
                    </h4>
                    <p className="text-sm font-bold leading-relaxed">{report.claim}</p>
                </div>

                {report.slots && report.slots.length > 0 && (
                    <div className="space-y-3 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <span>🗂️</span> マトリクス網羅リスト（本命＋候補）
                            </h4>
                            {(hasArbitrageTiers || hasLegacyItems) && (
                                <div className="flex flex-wrap gap-1">
                                    {priceTiers.map(t => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setSelectedTier(t.key)}
                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                                selectedTier === t.key
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🌟 金額ごとの区分けが選択されている場合：本命1枚＋代替候補4枚を横並びグリッドで一覧表示 */}
                        {selectedTier !== 'all' ? (
                            <div className="space-y-4">
                                {report.slots.map((slot: any, sIdx: number) => {
                                    const matchedTier = slot.tiers?.find((t: any) => t.priceTier === selectedTier)
                                        || slot.items?.find((i: any) => i.priceTier === selectedTier);

                                    if (!matchedTier) return null;

                                    const mainItem = matchedTier.mainItem || matchedTier;
                                    const subItems: any[] = matchedTier.subItems || [];
                                    const allItemsInTier = [
                                        { ...mainItem, isMain: true, rankLabel: '本命' },
                                        ...subItems.map((sub, idx) => ({ ...sub, isMain: false, rankLabel: `候補${idx + 2}` }))
                                    ];

                                    return (
                                        <div key={sIdx} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-300 font-mono">[{slot.slotKey}]</span>
                                                    <span className="text-xs font-bold text-white">{slot.slotLabel}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTierBadgeClass(selectedTier)}`}>
                                                        {matchedTier.priceTierLabel || priceTiers.find(p => p.key === selectedTier)?.label}
                                                    </span>
                                                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                        全{allItemsInTier.length}件 一覧表示
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 横並びグリッドレイアウト（画面幅に応じて2〜5列で均等配置） */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                                {allItemsInTier.map((item: any, itemIdx: number) => (
                                                    <div
                                                        key={itemIdx}
                                                        className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                                                            item.isMain
                                                                ? 'bg-slate-900 border-amber-500/40 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20'
                                                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span
                                                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                                                        item.isMain
                                                                            ? 'bg-amber-400 text-slate-950'
                                                                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                                                                    }`}
                                                                >
                                                                    {item.rankLabel}
                                                                </span>
                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded whitespace-nowrap shrink-0 border border-slate-700/60">
                                                                    {item.conditionGrade || item.condition || 'Raw NM'}
                                                                </span>
                                                            </div>

                                                            <div className="min-h-[2.5rem]">
                                                                <h5 className="text-xs font-bold text-white leading-snug line-clamp-2" title={item.cardName}>
                                                                    {item.cardName}
                                                                </h5>
                                                            </div>

                                                            <div className="space-y-1 text-[11px] font-mono border-t border-slate-800 pt-2">
                                                                <div className="flex justify-between text-slate-400">
                                                                    <span>国内仕入:</span>
                                                                    <span className="text-slate-200 font-bold">{item.jpBuyPriceJPY || item.currentJpPriceJPY}</span>
                                                                </div>
                                                                <div className="flex justify-between text-slate-400">
                                                                    <span>海外成約:</span>
                                                                    <span className="text-emerald-400 font-bold">{item.targetSoldPrice || item.targetMarketPrice}</span>
                                                                </div>
                                                            </div>

                                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded flex justify-between items-center text-[11px] font-mono text-emerald-300">
                                                                <span>差額: <strong>{item.priceSpreadJPY}</strong></span>
                                                                <span className="font-bold">ROI: {item.spreadROI}</span>
                                                            </div>

                                                            {item.liquidity && (
                                                                <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                                                                    <span>流動性:</span>
                                                                    <span className="text-slate-300 font-bold">{item.liquidity}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {item.insight && (
                                                            <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800/60 leading-relaxed">
                                                                <span className="text-amber-400 font-bold mr-1">💡</span>{item.insight}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* 🌟 「すべて表示」の場合：各スロットに各価格帯の本命が並び、アコーディオンでサブを開閉 */
                            <div className="space-y-3">
                                {report.slots.map((slot: any, sIdx: number) => {
                                    const tiers = slot.tiers || slot.items || [];
                                    return (
                                        <div key={sIdx} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-300 font-mono">[{slot.slotKey}]</span>
                                                    <span className="text-xs font-bold text-white">{slot.slotLabel}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    {tiers.length}価格帯
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                                                {tiers.map((tierCell: any, cIdx: number) => {
                                                    const cellId = `${slot.slotKey}_${tierCell.priceTier || cIdx}`;
                                                    const isOpen = openSubIndex === cellId;
                                                    const main = tierCell.mainItem || tierCell;
                                                    const subs: any[] = tierCell.subItems || [];

                                                    return (
                                                        <div key={cIdx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col justify-between space-y-2">
                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between items-start gap-1">
                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTierBadgeClass(tierCell.priceTier)} whitespace-nowrap`}>
                                                                        {tierCell.priceTierLabel || priceTiers.find(p => p.key === tierCell.priceTier)?.label}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded font-mono">
                                                                            本命
                                                                        </span>
                                                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded whitespace-nowrap shrink-0">
                                                                            {main.conditionGrade || main.condition || 'Raw NM'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <h5 className="text-xs font-bold text-white leading-snug line-clamp-2 min-h-[2rem]" title={main.cardName}>
                                                                    {main.cardName}
                                                                </h5>

                                                                <div className="flex justify-between text-[11px] font-mono border-t border-slate-800/60 pt-1">
                                                                    <span className="text-slate-400">仕入: {main.jpBuyPriceJPY || main.currentJpPriceJPY}</span>
                                                                    <span className="text-emerald-400 font-bold">{main.targetSoldPrice || main.targetMarketPrice}</span>
                                                                </div>

                                                                {(main.priceSpreadJPY || main.spreadROI) && (
                                                                    <div className="flex justify-between text-[11px] font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300">
                                                                        <span>差額: {main.priceSpreadJPY}</span>
                                                                        <span className="font-bold">ROI: {main.spreadROI}</span>
                                                                    </div>
                                                                )}

                                                                {main.insight && (
                                                                    <p className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/50 leading-relaxed line-clamp-3">
                                                                        <span className="text-amber-400 font-bold mr-1">💡</span>{main.insight}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {subs.length > 0 && (
                                                                <div className="border-t border-slate-800 pt-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleSub(cellId)}
                                                                        className="w-full text-[10px] font-mono font-bold py-1 px-2 rounded bg-slate-950 hover:bg-slate-800/80 text-blue-400 border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-1 transition-all"
                                                                    >
                                                                        <span>{isOpen ? '▲' : '▼'}</span>
                                                                        <span>{isOpen ? '代替候補を閉じる' : `他${subs.length}つの代替候補を見る`}</span>
                                                                    </button>

                                                                    {isOpen && (
                                                                        <div className="mt-2 space-y-1.5 pt-1.5 border-t border-slate-800/80">
                                                                            {subs.map((subItem: any, sIdx: number) => (
                                                                                <div key={sIdx} className="bg-slate-950/90 p-1.5 rounded border border-slate-800/60 text-[10px] space-y-1">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="font-bold text-white truncate max-w-[120px]" title={subItem.cardName}>
                                                                                            {subItem.cardName}
                                                                                        </span>
                                                                                        <span className="text-slate-400 font-mono text-[9px]">{subItem.conditionGrade || 'Raw NM'}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between font-mono text-slate-400 text-[10px]">
                                                                                        <span>仕入: {subItem.jpBuyPriceJPY}</span>
                                                                                        <span className="text-emerald-400 font-bold">差額: {subItem.priceSpreadJPY}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

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