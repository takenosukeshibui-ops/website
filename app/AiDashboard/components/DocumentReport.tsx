import React, { useState } from 'react';

export default function DocumentReportView({
    report,
    accentColor = 'amber',
    icon = '⚖️'
}: {
    report: any | null;
    accentColor?: 'amber' | 'emerald' | 'pink' | 'sky';
    icon?: string;
}) {
    const [selectedTier, setSelectedTier] = useState<string>('all');
    const [openSubIndex, setOpenSubIndex] = useState<string | null>(null);

    if (!report || !report.title) return <div className="text-slate-500 text-xs italic">レポートデータがありません</div>;

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

    const hasArbitrageTiers = report.slots?.some((s: any) => (s.tiers && s.tiers.length > 0) || (s.items && s.items.length > 0 && s.items[0]?.priceTier));
    const summary = report.summary;

    // 作成日時の取得
    const formattedCreatedAt = report.createdAt || new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 地域タグの抽出（例: 【US】など）
    const regionMatch = report.title?.match(/【(.*?)】/);
    const regionTag = regionMatch ? `【${regionMatch[1]}】` : '【US】';

    // 🌟 タイトル: 作成日時 ＋ 地域 ＋ アービトラージレポート
    const displayTitle = `${formattedCreatedAt} ${regionTag} アービトラージレポート`;

    return (
        <div className="w-full bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans space-y-4">
            {/* 🌟 ヘッダー（サブ英語を撤廃し、指定タイトルに統一） */}
            <div className="p-4 sm:p-5 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/60 gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl shrink-0">{icon}</span>
                    <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                        {displayTitle}
                    </h3>
                </div>
                {report.slots && report.slots.length > 0 && (
                    <div className="shrink-0">
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                            {hasArbitrageTiers ? '5スロット × 5価格帯 × 5候補 (125枠)' : `5スロット網羅 (${report.slots.length}枠)`}
                        </span>
                    </div>
                )}
            </div>

            <div className="p-4 sm:p-6 space-y-5">
                {/* 🌟 価格帯切り替えタブ（タブ横の見出しを撤廃し、タブのみを配置） */}
                {report.slots && report.slots.length > 0 && (
                    <div className="space-y-4">
                        {hasArbitrageTiers && (
                            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
                                {priceTiers.map(t => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setSelectedTier(t.key)}
                                        className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all ${
                                            selectedTier === t.key
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-400/30'
                                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 🌟 金額ごとの区分けが選択されている場合：5枚を均等フル幅グリッドで一覧表示 */}
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
                                        <div key={sIdx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm">
                                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-300 font-mono">[{slot.slotKey}]</span>
                                                    <span className="text-sm font-bold text-white">{slot.slotLabel}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${getTierBadgeClass(selectedTier)}`}>
                                                        {matchedTier.priceTierLabel || priceTiers.find(p => p.key === selectedTier)?.label}
                                                    </span>
                                                    <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                                        全{allItemsInTier.length}件 一覧表示
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
                                                {allItemsInTier.map((item: any, itemIdx: number) => (
                                                    <div
                                                        key={itemIdx}
                                                        className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                                                            item.isMain
                                                                ? 'bg-slate-900 border-amber-500/40 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20'
                                                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <div className="space-y-2.5">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span
                                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                                                        item.isMain
                                                                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                                                                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                                                                    }`}
                                                                >
                                                                    {item.rankLabel}
                                                                </span>
                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded whitespace-nowrap shrink-0 border border-slate-700/60">
                                                                    {item.conditionGrade || item.condition || 'Raw NM'}
                                                                </span>
                                                            </div>

                                                            <div className="min-h-[2.8rem]">
                                                                <h5 className="text-xs font-bold text-white leading-snug line-clamp-2" title={item.cardName}>
                                                                    {item.cardName}
                                                                </h5>
                                                            </div>

                                                            <div className="space-y-1 text-xs font-mono border-t border-slate-800 pt-2">
                                                                <div className="flex justify-between text-slate-400">
                                                                    <span>日本調達:</span>
                                                                    <span className="text-slate-200 font-bold">{item.jpBuyPriceJPY || item.currentJpPriceJPY}</span>
                                                                </div>
                                                                <div className="flex justify-between text-slate-400">
                                                                    <span>現地実成約:</span>
                                                                    <span className="text-emerald-400 font-bold">{item.targetSoldPrice || item.targetMarketPrice}</span>
                                                                </div>
                                                            </div>

                                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex justify-between items-center text-xs font-mono text-emerald-300">
                                                                <span>利ざや: <strong>{item.priceSpreadJPY}</strong></span>
                                                                <span className="font-bold">ROI: {item.spreadROI}</span>
                                                            </div>

                                                            {item.liquidity && (
                                                                <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                                                                    <span>現地回転:</span>
                                                                    <span className="text-slate-300 font-bold">{item.liquidity}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {item.insight && (
                                                            <div className="mt-2.5 text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800/60 leading-relaxed">
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
                            /* 🌟 「すべて表示」の場合：各価格帯の本命がゆったり並ぶグリッド */
                            <div className="space-y-4">
                                {report.slots.map((slot: any, sIdx: number) => {
                                    const tiers = slot.tiers || slot.items || [];
                                    return (
                                        <div key={sIdx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm">
                                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-300 font-mono">[{slot.slotKey}]</span>
                                                    <span className="text-sm font-bold text-white">{slot.slotLabel}</span>
                                                </div>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {tiers.length}価格帯
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
                                                {tiers.map((tierCell: any, cIdx: number) => {
                                                    const cellId = `${slot.slotKey}_${tierCell.priceTier || cIdx}`;
                                                    const isOpen = openSubIndex === cellId;
                                                    const main = tierCell.mainItem || tierCell;
                                                    const subs: any[] = tierCell.subItems || [];

                                                    return (
                                                        <div key={cIdx} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between space-y-2.5">
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-start gap-1">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTierBadgeClass(tierCell.priceTier)} whitespace-nowrap`}>
                                                                        {tierCell.priceTierLabel || priceTiers.find(p => p.key === tierCell.priceTier)?.label}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-mono shadow-sm">
                                                                            本命
                                                                        </span>
                                                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded whitespace-nowrap shrink-0 border border-slate-700/60">
                                                                            {main.conditionGrade || main.condition || 'Raw NM'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <h5 className="text-xs font-bold text-white leading-snug line-clamp-2 min-h-[2.5rem]" title={main.cardName}>
                                                                    {main.cardName}
                                                                </h5>

                                                                <div className="flex justify-between text-xs font-mono border-t border-slate-800/60 pt-1.5">
                                                                    <span className="text-slate-400">日本調達:</span>
                                                                    <span className="text-slate-200 font-bold">{main.jpBuyPriceJPY || main.currentJpPriceJPY}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs font-mono">
                                                                    <span className="text-slate-400">現地実成約:</span>
                                                                    <span className="text-emerald-400 font-bold">{main.targetSoldPrice || main.targetMarketPrice}</span>
                                                                </div>

                                                                {(main.priceSpreadJPY || main.spreadROI) && (
                                                                    <div className="flex justify-between text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-emerald-300">
                                                                        <span>利ざや: <strong>{main.priceSpreadJPY}</strong></span>
                                                                        <span className="font-bold">ROI: {main.spreadROI}</span>
                                                                    </div>
                                                                )}

                                                                {main.insight && (
                                                                    <p className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/50 leading-relaxed line-clamp-3">
                                                                        <span className="text-amber-400 font-bold mr-1">💡</span>{main.insight}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {subs.length > 0 && (
                                                                <div className="border-t border-slate-800 pt-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleSub(cellId)}
                                                                        className="w-full text-xs font-mono font-bold py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-blue-400 border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                                                                    >
                                                                        <span>{isOpen ? '▲' : '▼'}</span>
                                                                        <span>{isOpen ? '代替候補を閉じる' : `他${subs.length}つの代替候補を見る`}</span>
                                                                    </button>

                                                                    {isOpen && (
                                                                        <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-800/80">
                                                                            {subs.map((subItem: any, sIdx: number) => (
                                                                                <div key={sIdx} className="bg-slate-950/90 p-2 rounded-lg border border-slate-800/60 text-[11px] space-y-1">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="font-bold text-white truncate max-w-[130px]" title={subItem.cardName}>
                                                                                            {subItem.cardName}
                                                                                        </span>
                                                                                        <span className="text-slate-400 font-mono text-[10px]">{subItem.conditionGrade || 'Raw NM'}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between font-mono text-slate-400">
                                                                                        <span>調達: {subItem.jpBuyPriceJPY}</span>
                                                                                        <span className="text-emerald-400 font-bold">利ざや: {subItem.priceSpreadJPY}</span>
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

                {/* 🌟 【最下部】海外現地事業者向けエグゼクティブ・サマリー */}
                {(summary || hasArbitrageTiers) && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 pt-5 mt-8 shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                                <span>📈</span> 今週の調達・販売エグゼクティブ・サマリー
                            </h4>
                        </div>

                        {summary?.headline && (
                            <div className="text-sm font-bold text-white bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg leading-relaxed">
                                📌 {summary.headline}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 1. 🌐 マクロ分析 */}
                            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                                <h5 className="text-xs font-bold text-sky-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                    <span>🌐</span> 1. マクロ環境分析（日本調達環境 ＆ 現地需要）
                                </h5>
                                <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                                    <p>
                                        <strong className="text-slate-400">日本調達環境: </strong>
                                        {summary?.macroAnalysis?.japanSourcingClimate || '為替水準により日本国内の調達コストが優位に推移。フリマや専門店に美品在庫が充実。'}
                                    </p>
                                    <p>
                                        <strong className="text-slate-400">現地市場需要: </strong>
                                        {summary?.macroAnalysis?.localMarketDemand || '現行モダンAR/CHRの現地人気が極めて高く、手頃な絶版シングルへのコレクション需要も安定。'}
                                    </p>
                                </div>
                            </div>

                            {/* 2. 🔍 ミクロ分析 */}
                            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                                <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                    <span>🔍</span> 2. ミクロ分析（突出銘柄 ＆ 状態特性）
                                </h5>
                                <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                                    <p>
                                        <strong className="text-slate-400">最高利ざや銘柄: </strong>
                                        {summary?.microAnalysis?.topImportMarginCard || '限定プロモ枠および準高額PSA10で30%〜50%超の現地販売マージンを確保可能。'}
                                    </p>
                                    <p>
                                        <strong className="text-slate-400">最高回転銘柄: </strong>
                                        {summary?.microAnalysis?.topLocalVelocityCard || '現行ARおよび世界大会メタの汎用カードが現地入荷から即売れペースを維持。'}
                                    </p>
                                    <p>
                                        <strong className="text-slate-400">状態特性: </strong>
                                        {summary?.microAnalysis?.conditionGradingInsight || '日本版は海外顧客から印刷品質が高く評価されており、素体NMでも高い成約率を維持。'}
                                    </p>
                                </div>
                            </div>

                            {/* 3. 🚨 警戒アラート */}
                            <div className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-3.5 space-y-2">
                                <h5 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                    <span>🚨</span> 3. 警戒アラート（調達品質リスク ＆ 現地在庫リスク）
                                </h5>
                                <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                                    <p>
                                        <strong className="text-rose-400">買い付け品質リスク: </strong>
                                        {summary?.riskAlert?.sourcingQualityTrap || '日本のフリマ個人間取引における白かけ・初期傷の見落としに警戒。検品体制の敷かれた専門店在庫を優先。'}
                                    </p>
                                    <p>
                                        <strong className="text-rose-400">現地在庫滞留リスク: </strong>
                                        {summary?.riskAlert?.localInventoryRisk || '新弾再販による国内相場の下落に備え、入荷から現地販売までのリードタイムを最短化すること。'}
                                    </p>
                                </div>
                            </div>

                            {/* 4. 🎯 今週のアクション指針 */}
                            <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-3.5 space-y-2">
                                <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                    <span>🎯</span> 4. 今週の輸入調達・現地販売アクション指針
                                </h5>
                                <ul className="space-y-1.5 text-xs text-slate-300">
                                    {summary?.actionDirectives && summary.actionDirectives.length > 0 ? (
                                        summary.actionDirectives.map((action: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-emerald-400 font-bold">✔</span>
                                                <span className="leading-relaxed">{action}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <>
                                            <li className="flex items-start gap-2">
                                                <span className="text-emerald-400 font-bold">✔</span>
                                                <span className="leading-relaxed"><strong>低単価帯（〜1万円）:</strong> 日本のフリマ・ショップからまとめ買い調達し、現地店頭/ECで即時回転させてキャッシュ化。</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-emerald-400 font-bold">✔</span>
                                                <span className="leading-relaxed"><strong>高額帯（3万円以上）:</strong> 状態確認の取れたPSA10または店舗美品を厳選調達し、現地コレクター向けにプレミアム価格で提供。</span>
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}