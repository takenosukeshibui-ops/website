import React from 'react';
import { StrategicReport } from '../types';

export default function DocumentReportView({
    report,
    accentColor = 'amber',
    icon = '📄'
}: {
    report: any | null; // MultiSlotTrendReport | MultiSlotArbitrageReport | StrategicReport
    accentColor?: 'amber' | 'emerald' | 'pink' | 'sky';
    icon?: string;
}) {
    if (!report || !report.title) return <div className="text-slate-500 text-xs italic">レポートデータがありません</div>;

    const accentClasses = {
        amber: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
        emerald: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
        pink: 'border-pink-500/30 text-pink-300 bg-pink-500/10',
        sky: 'border-sky-500/30 text-sky-300 bg-sky-500/10'
    };
    const colorClass = accentClasses[accentColor];

    return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl overflow-hidden font-sans space-y-4">
            <div className={`p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-950/50`}>
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{icon}</span>
                    <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-0.5">Strategic Intelligence Report</span>
                        <h3 className="text-base font-bold text-white leading-tight">{report.title}</h3>
                    </div>
                </div>
                {report.slots && report.slots.length > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        5スロット網羅 ({report.slots.length}枠)
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

                {/* 🌟 5スロット詳細表示（存在する場合） */}
                {report.slots && report.slots.length > 0 && (
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <span>🗂️</span> 5大スロット網羅調査内訳（ヴィンテージ〜現行〜POP希少）
                            </h4>
                            <span className="text-[10px] text-slate-400">基本1件 / 好条件時最大2件</span>
                        </div>
                        <div className="space-y-3">
                            {report.slots.map((slot: any, idx: number) => (
                                <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-amber-300 font-mono">[{slot.slotKey}]</span>
                                            <span className="text-xs font-bold text-white">{slot.slotLabel}</span>
                                        </div>
                                        {(slot.isSurgeTriggered || slot.isHighRoiTriggered) && (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                                                🔥 熱狂/高利益 2件抽出
                                            </span>
                                        )}
                                    </div>
                                    {slot.macroTrend && (
                                        <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/40 leading-relaxed">
                                            <span className="text-blue-400 font-bold mr-1">マクロ動向:</span>{slot.macroTrend}
                                        </p>
                                    )}
                                    {slot.triggerReason && (
                                        <p className="text-[10px] text-emerald-300/90 italic">
                                            ※解禁理由: {slot.triggerReason}
                                        </p>
                                    )}
                                    {/* 商品アイテムリスト */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                        {slot.items?.map((item: any, itemIdx: number) => (
                                            <div key={itemIdx} className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
                                                <div className="flex justify-between items-start gap-1">
                                                    <span className="text-xs font-bold text-white leading-snug">{item.cardName}</span>
                                                    {(item.condition || item.conditionGrade) && (
                                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded whitespace-nowrap">
                                                            {item.condition || item.conditionGrade}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between text-[11px] font-mono border-t border-slate-800/60 pt-1">
                                                    <span className="text-slate-400">仕入: {item.currentJpPriceJPY || item.jpBuyPriceJPY}</span>
                                                    <span className="text-emerald-400 font-bold">海外: {item.targetMarketPrice || item.targetSoldPrice}</span>
                                                </div>
                                                {/* サヤの場合の価格差とROI */}
                                                {(item.priceSpreadJPY || item.spreadROI) && (
                                                    <div className="flex justify-between text-[11px] font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300">
                                                        <span>差額: {item.priceSpreadJPY}</span>
                                                        <span className="font-bold">ROI: {item.spreadROI}</span>
                                                    </div>
                                                )}
                                                {/* トレンドの場合の上昇率 */}
                                                {item.growthRate && (
                                                    <div className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded flex justify-between">
                                                        <span>相場推移:</span>
                                                        <span className="font-bold">{item.growthRate}</span>
                                                    </div>
                                                )}
                                                {item.threePointCheck && (
                                                    <p className="text-[10px] text-slate-400 line-clamp-2">
                                                        <span className="text-slate-500 font-bold">3点観測:</span> {item.threePointCheck}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
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