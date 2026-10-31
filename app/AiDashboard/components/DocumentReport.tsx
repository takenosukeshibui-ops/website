// app/AiDashboard/components/DocumentReport.tsx
import React, { useState } from 'react';

// 🌟 指定順序に合わせた5スロットの［ラベル］［説明］［ソート順］マッピング
const SLOT_METADATA: Record<string, { badge: string; desc: string; order: number }> = {
    classic_vintage: {
        badge: 'クラシック・ヴィンテージ',
        desc: '旧裏〜PCG期・歴史的希少品',
        order: 1
    },
    neo_vintage: {
        badge: 'ネオ・ヴィンテージ',
        desc: 'DP〜XY期・コレクション回帰',
        order: 2
    },
    modern_meta: {
        badge: 'モダン・メタ',
        desc: 'SM〜SV期・直近弾・対戦需要',
        order: 3
    },
    exclusive_promo: {
        badge: '限定プロモ',
        desc: 'ポケセン・ジム・タイアップ等',
        order: 4
    },
    promos_exclusive: {
        badge: '限定プロモ',
        desc: 'ポケセン・ジム・タイアップ等',
        order: 4
    },
    graded_sealed: {
        badge: '鑑定・絶版BOX',
        desc: 'PSA10・POP希少・絶版未開封BOX',
        order: 5
    },
    high_end_sealed: {
        badge: '鑑定・絶版BOX',
        desc: 'PSA10・POP希少・絶版未開封BOX',
        order: 5
    }
};

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

    if (!report || !report.title) return <div className="text-slate-500 text-xs italic">レポートデータがありません</div>;

    const isTrendReport = Boolean(report.hypotheses && Array.isArray(report.hypotheses));

    const priceTiers = [
        { key: 'all', label: 'すべて表示' },
        { key: 'under_3k', label: '〜3千円', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
        { key: 'under_10k', label: '3千〜1万円', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
        { key: 'middle', label: '1万〜3万円', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        { key: 'upper', label: '3万〜8万円', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
        { key: 'top_end', label: '8万円〜', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
    ];

    const TIER_ORDER: Record<string, number> = {
        under_3k: 1,
        under_10k: 2,
        middle: 3,
        upper: 4,
        top_end: 5
    };

    const getTierBadgeClass = (tierKey?: string) => {
        const found = priceTiers.find(t => t.key === tierKey);
        return found?.badge || 'bg-slate-800 text-slate-300 border-slate-700';
    };

    const getConvictionBadgeClass = (conviction?: string) => {
        switch (conviction) {
            case 'High':
                return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
            case 'Mid':
                return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            case 'Speculative':
                return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
            default:
                return 'bg-slate-800 text-slate-300 border-slate-700';
        }
    };

    const hasArbitrageTiers = report.slots?.some((s: any) => (s.tiers && s.tiers.length > 0) || (s.items && s.items.length > 0 && s.items[0]?.priceTier));
    const summary = report.summary;

    const dateObj = report.createdAt ? new Date(report.createdAt) : new Date();
    const formattedDate = !isNaN(dateObj.getTime())
        ? `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`
        : new Date().toLocaleDateString('ja-JP');

    let regionName = '北米';
    const titleUpper = (report.title || '').toUpperCase();
    if (titleUpper.includes('EU') || titleUpper.includes('欧州')) regionName = '欧州';
    else if (titleUpper.includes('ASIA') || titleUpper.includes('アジア')) regionName = 'アジア';
    else if (titleUpper.includes('US') || titleUpper.includes('北米')) regionName = '北米';

    const reportTypeName = isTrendReport ? '市場トレンドレポート' : 'アービトラージレポート';
    const displayTitle = `${formattedDate} ${regionName} ${reportTypeName}`;

    const getTierOrderScore = (cell: any): number => {
        const key = cell.priceTier || cell.mainItem?.priceTier;
        if (key && TIER_ORDER[key]) return TIER_ORDER[key];

        const label = cell.priceTierLabel || cell.mainItem?.priceTierLabel || '';
        if (label.includes('3千円') || label.includes('3k')) return 1;
        if (label.includes('1万円') || label.includes('10k')) return 2;
        if (label.includes('3万円') || label.includes('middle')) return 3;
        if (label.includes('8万円') || label.includes('upper')) return 4;
        if (label.includes('8万') || label.includes('top_end')) return 5;

        const buy = parseInt(String(cell.mainItem?.jpBuyPriceJPY || cell.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 0;
        if (buy <= 3000) return 1;
        if (buy <= 10000) return 2;
        if (buy <= 30000) return 3;
        if (buy <= 80000) return 4;
        return 5;
    };

    const getSlotMeta = (slotKey: string, slotLabel?: string) => {
        const meta = SLOT_METADATA[slotKey] || SLOT_METADATA[slotKey.toLowerCase()];
        if (meta) return meta;
        return {
            badge: slotKey,
            desc: slotLabel || '',
            order: 99
        };
    };

    // 🌟 指定された並び順（クラシック ➔ ネオ ➔ モダン ➔ 限定プロモ ➔ 鑑定絶版BOX）で昇順ソート
    const sortedSlots = (report.slots || []).slice().sort((a: any, b: any) => {
        const orderA = getSlotMeta(a.slotKey, a.slotLabel).order;
        const orderB = getSlotMeta(b.slotKey, b.slotLabel).order;
        return orderA - orderB;
    });

    return (
        <div className="w-full bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans space-y-4">
            {/* ヘッダー */}
            <div className="p-4 sm:p-5 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/60 gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl shrink-0">{icon}</span>
                    <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                            {displayTitle}
                        </h3>
                    </div>
                </div>
                {isTrendReport ? (
                    <div className="shrink-0">
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                            厳選トレンド {report.hypotheses?.length || 0}本 (各5銘柄)
                        </span>
                    </div>
                ) : (
                    sortedSlots && sortedSlots.length > 0 && (
                        <div className="shrink-0">
                            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                                {hasArbitrageTiers ? '5スロット × 5価格帯 (25枠)' : `5スロット網羅 (${sortedSlots.length}枠)`}
                            </span>
                        </div>
                    )
                )}
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* ========================================================= */}
                {/* 市場トレンドレポート描画ブロック */}
                {/* ========================================================= */}
                {isTrendReport && (
                    <div className="space-y-6">
                        {report.hypotheses.map((hypo: any, hIdx: number) => (
                            <div key={hIdx} className="space-y-3">
                                {report.hypotheses.length > 1 && (
                                    <div className="flex items-center gap-2 px-1">
                                        <span className="text-xs font-bold text-amber-400 font-mono">
                                            [トレンド {hIdx + 1}]
                                        </span>
                                        <span className="text-xs font-bold text-slate-300 truncate">
                                            {hypo.headline}
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
                                    {hypo.items?.map((item: any, iIdx: number) => {
                                        const isRank1 = item.rankLabel?.includes('Rank 1') || iIdx === 0;
                                        return (
                                            <div
                                                key={iIdx}
                                                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                                                    isRank1
                                                        ? 'bg-slate-900 border-amber-500/50 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20'
                                                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="space-y-2.5">
                                                    <div className="flex justify-between items-start gap-1">
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                                                isRank1
                                                                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                                                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                                            }`}
                                                        >
                                                            {item.rankLabel || `Rank ${iIdx + 1}`}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {item.conviction && (
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getConvictionBadgeClass(item.conviction)}`}>
                                                                    {item.conviction}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded whitespace-nowrap shrink-0 border border-slate-700/60">
                                                                {item.condition || 'Raw NM'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="min-h-[2.6rem]">
                                                        <h5 className="text-xs font-bold text-white leading-snug line-clamp-2" title={item.cardName}>
                                                            {item.cardName}
                                                        </h5>
                                                    </div>

                                                    <div className="space-y-1 text-xs font-mono border-t border-slate-800 pt-2">
                                                        <div className="flex justify-between text-slate-400">
                                                            <span>JP 調達:</span>
                                                            <span className="text-slate-200 font-bold">{item.jpBuyPriceJPY}</span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400">
                                                            <span>現地現在:</span>
                                                            <span className="text-emerald-400 font-bold">{item.currentLocalPrice}</span>
                                                        </div>
                                                    </div>

                                                    {(item.timeframe || item.exitStrategy) && (
                                                        <div className="text-[11px] bg-slate-950/70 p-2 rounded border border-slate-800/80 space-y-1">
                                                            {item.timeframe && (
                                                                <div className="text-slate-300 text-[10px] truncate">
                                                                    <span className="text-amber-400 font-bold mr-1">⏳</span>{item.timeframe}
                                                                </div>
                                                            )}
                                                            {item.exitStrategy && (
                                                                <div className="text-slate-400 text-[10px] leading-tight">
                                                                    <span className="text-sky-400 font-bold mr-1">🎯</span>{item.exitStrategy}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {item.impactLogic && (
                                                    <div className="mt-2.5 text-[11px] text-slate-400 bg-slate-950/90 p-2 rounded border border-slate-800/60 leading-relaxed">
                                                        <span className="text-amber-400 font-bold mr-1">💡</span>{item.impactLogic}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 pt-5 mt-6 shadow-lg">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                                    <span>📈</span> トレンド分析 ＆ 先行シグナルサマリー
                                </h4>
                            </div>

                            <div className="space-y-3">
                                {report.hypotheses?.map((hypo: any, hIdx: number) => (
                                    <div key={hIdx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                            <span className="text-sm font-bold text-white leading-snug">
                                                {hypo.headline}
                                            </span>
                                            {hypo.timeframe && (
                                                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 shrink-0 self-start sm:self-auto">
                                                    ⏳ {hypo.timeframe}
                                                </span>
                                            )}
                                        </div>
                                        {hypo.signal && (
                                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                                                <span className="text-sky-400 font-bold mr-1.5">🔍 検知シグナル:</span>
                                                {hypo.signal}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {summary && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                                        <h5 className="text-xs font-bold text-sky-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                            <span>🌐</span> 1. 潮流・資金動向分析
                                        </h5>
                                        <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
                                            <p><strong className="text-slate-400">急騰トリガー: </strong>{summary.trendDynamics?.catalystOverview}</p>
                                            <p><strong className="text-slate-400">国内相場ラグ: </strong>{summary.trendDynamics?.japanPriceLag}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                                        <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                            <span>🔍</span> 2. 突出セクター ＆ 時間軸
                                        </h5>
                                        <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
                                            <p><strong className="text-slate-400">最注目カタリスト: </strong>{summary.strategicHighlights?.mvpCatalystCard}</p>
                                            <p><strong className="text-slate-400">売り時ウィンドウ: </strong>{summary.strategicHighlights?.optimalExitWindow}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/80 border border-rose-900/30 rounded-xl p-3.5 space-y-2">
                                        <h5 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                            <span>🚨</span> 3. トレンド警戒アラート
                                        </h5>
                                        <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
                                            <p><strong className="text-rose-400">バブル・再販警戒: </strong>{summary.riskAlert?.hypeTrapWarning}</p>
                                            <p><strong className="text-rose-400">状態・鑑定指針: </strong>{summary.riskAlert?.gradingVsRawStrategy}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/80 border border-emerald-900/30 rounded-xl p-3.5 space-y-2">
                                        <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                            <span>🎯</span> 4. 今週の先回り仕込みアクション指針
                                        </h5>
                                        <ul className="space-y-1.5 text-xs text-slate-300">
                                            {summary.actionDirectives?.map((action: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="text-emerald-400 font-bold">✔</span>
                                                    <span className="leading-relaxed">{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* 💎 アービトラージレポート描画ブロック */}
                {/* ========================================================= */}
                {!isTrendReport && sortedSlots && sortedSlots.length > 0 && (
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

                        {/* 個別価格帯フィルター選択時 */}
                        {selectedTier !== 'all' ? (
                            <div className="space-y-4">
                                {sortedSlots.map((slot: any, sIdx: number) => {
                                    const matchedTier = slot.tiers?.find((t: any) => t.priceTier === selectedTier)
                                        || slot.items?.find((i: any) => i.priceTier === selectedTier);

                                    if (!matchedTier) return null;

                                    const slotMeta = getSlotMeta(slot.slotKey, slot.slotLabel);
                                    const mainItem = matchedTier.mainItem || matchedTier;
                                    const subItems: any[] = matchedTier.subItems || [];
                                    const allItemsInTier = [
                                        { ...mainItem, isMain: true, rankLabel: '本命' },
                                        ...subItems.map((sub, idx) => ({ ...sub, isMain: false, rankLabel: `候補${idx + 2}` }))
                                    ];

                                    return (
                                        <div key={sIdx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-300 font-mono">
                                                        [{slotMeta.badge}]
                                                    </span>
                                                    {slotMeta.desc && (
                                                        <span className="text-xs text-slate-300 font-medium">
                                                            {slotMeta.desc}
                                                        </span>
                                                    )}
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
                            /* 🌟 「すべて表示」選択時: ボタンを廃止し代替候補も常時展開表示 */
                            <div className="space-y-4">
                                {sortedSlots.map((slot: any, sIdx: number) => {
                                    const rawTiers: any[] = slot.tiers || slot.items || [];
                                    const slotMeta = getSlotMeta(slot.slotKey, slot.slotLabel);

                                    // ① 重複除去
                                    const uniqueMap = new Map<string, any>();
                                    for (const t of rawTiers) {
                                        const main = t.mainItem || t;
                                        const uniqueKey = `${t.priceTier || main.priceTier}_${main.cardName}`;
                                        if (!uniqueMap.has(uniqueKey)) {
                                            uniqueMap.set(uniqueKey, t);
                                        }
                                    }
                                    const deduplicatedTiers = Array.from(uniqueMap.values());

                                    // ② 価格帯昇順ソート（〜3千円 ➔ 8万円〜）
                                    const sortedTiers = deduplicatedTiers.sort((a, b) => {
                                        const orderA = getTierOrderScore(a);
                                        const orderB = getTierOrderScore(b);
                                        if (orderA !== orderB) {
                                            return orderA - orderB;
                                        }
                                        const buyA = parseInt(String(a.mainItem?.jpBuyPriceJPY || a.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 0;
                                        const buyB = parseInt(String(b.mainItem?.jpBuyPriceJPY || b.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 0;
                                        return buyA - buyB;
                                    });

                                    return (
                                        <div key={sIdx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-300 font-mono">
                                                        [{slotMeta.badge}]
                                                    </span>
                                                    {slotMeta.desc && (
                                                        <span className="text-xs text-slate-300 font-medium">
                                                            {slotMeta.desc}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {sortedTiers.length}価格帯（安値順）
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
                                                {sortedTiers.map((tierCell: any, cIdx: number) => {
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

                                                            {/* 🌟 ボタンを撤廃し、代替候補が存在する場合は常時すべて表示 */}
                                                            {subs.length > 0 && (
                                                                <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                                                                    <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between px-0.5">
                                                                        <span>🥈 代替候補 ({subs.length}件)</span>
                                                                    </div>
                                                                    {subs.map((subItem: any, subIdx: number) => (
                                                                        <div key={subIdx} className="bg-slate-950/90 p-2 rounded-lg border border-slate-800/60 text-[11px] space-y-1">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="font-bold text-white truncate max-w-[130px]" title={subItem.cardName}>
                                                                                    {subItem.cardName}
                                                                                </span>
                                                                                <span className="text-slate-400 font-mono text-[10px]">{subItem.conditionGrade || 'Raw NM'}</span>
                                                                            </div>
                                                                            <div className="flex justify-between font-mono text-slate-400 text-[10px]">
                                                                                <span>調達: {subItem.jpBuyPriceJPY}</span>
                                                                                <span className="text-emerald-400 font-bold">利ざや: {subItem.priceSpreadJPY}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
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

                {/* サマリー描画 */}
                {!isTrendReport && (summary || hasArbitrageTiers) && (
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

                            <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-3.5 space-y-2">
                                <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                    <span>🎯</span> 4. 今週の輸入調達・現地販売アクション指針
                                </h5>
                                <ul className="space-y-1.5 text-xs text-slate-300">
                                    {summary?.actionDirectives?.map((action: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-emerald-400 font-bold">✔</span>
                                            <span className="leading-relaxed">{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}