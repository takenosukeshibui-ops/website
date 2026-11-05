// app/AiDashboard/components/DocumentReport.tsx
import React, { useState } from 'react';

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
    const [openSubIndex, setOpenSubIndex] = useState<string | null>(null);

    if (!report || !report.title) return <div className="text-slate-500 text-xs italic">レポートデータがありません</div>;

    const isTrendReport = Boolean(report.hypotheses && Array.isArray(report.hypotheses));
    const isArbitrageReport = Boolean(report.slots && Array.isArray(report.slots));
    const isStrategicReport = Boolean(report.facts && report.soWhat);

    const priceTiers = [
        { key: 'all', label: 'すべて表示' },
        { key: 'under_3k', label: '〜3千円', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
        { key: 'under_10k', label: '3千〜1万円', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
        { key: 'middle', label: '1万〜3万円', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        { key: 'upper', label: '3万〜8万円', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
        { key: 'top_end', label: '8万円〜', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
    ];

    const TIER_ORDER: Record<string, number> = {
        under_3k: 1, under_10k: 2, middle: 3, upper: 4, top_end: 5
    };

    const getTierBadgeClass = (tierKey?: string) => {
        const found = priceTiers.find(t => t.key === tierKey);
        return found?.badge || 'bg-slate-800 text-slate-300 border-slate-700';
    };

    const getConvictionBadgeClass = (conviction?: string) => {
        switch (conviction) {
            case 'High': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
            case 'Mid': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            case 'Speculative': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
            default: return 'bg-slate-800 text-slate-300 border-slate-700';
        }
    };

    const toggleSub = (cellId: string) => {
        setOpenSubIndex(prev => prev === cellId ? null : cellId);
    };

    // 🌟 カードラッシュ検索用フォールバックURL生成関数（型番もキーワードに結合）
    const getCardrushFallbackUrl = (cardName?: string, cardNumber?: string) => {
        if (!cardName) return 'https://www.cardrush-pokemon.jp/';
        const cleanName = cardName.replace(/\s*[\(（].*?[\)）]/g, '').trim();
        const keyword = cardNumber ? `${cleanName} ${cardNumber}` : cleanName;
        return `https://www.cardrush-pokemon.jp/product-list?keyword=${encodeURIComponent(keyword.trim())}`;
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

    let displayTitle = '';
    if (isStrategicReport) {
        displayTitle = `${formattedDate} ${report.title}`;
    } else if (isTrendReport) {
        displayTitle = `${formattedDate} ${regionName} 市場トレンドレポート`;
    } else {
        displayTitle = `${formattedDate} ${regionName} アービトラージレポート`;
    }

    const getTierOrderScore = (cell: any): number => {
        const key = cell.priceTier || cell.mainItem?.priceTier;
        if (key && TIER_ORDER[key]) return TIER_ORDER[key];
        const buy = parseInt(String(cell.mainItem?.jpBuyPriceJPY || cell.jpBuyPriceJPY || 0).replace(/[^0-9]/g, '')) || 0;
        if (buy <= 3000) return 1; if (buy <= 10000) return 2; if (buy <= 30000) return 3; if (buy <= 80000) return 4; return 5;
    };

    const getSlotMeta = (slotKey: string, slotLabel?: string) => {
        const meta = SLOT_METADATA[slotKey] || SLOT_METADATA[slotKey.toLowerCase()];
        if (meta) return meta;
        return { badge: slotKey, desc: slotLabel || '', order: 99 };
    };

    const sortedSlots = (report.slots || []).slice().sort((a: any, b: any) => {
        const orderA = getSlotMeta(a.slotKey, a.slotLabel).order;
        const orderB = getSlotMeta(b.slotKey, b.slotLabel).order;
        return orderA - orderB;
    });

    return (
        <div className="w-full bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans space-y-4">
            {/* 共通ヘッダー */}
            <div className="p-4 sm:p-5 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/60 gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl shrink-0">{icon}</span>
                    <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                            {displayTitle}
                        </h3>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                 {report.exchangeRate && (
                     <div className="shrink-0">
                         <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full bg-${accentColor}-500/20 text-${accentColor}-300 border border-${accentColor}-500/40 shadow-sm`}>
                             💱 為替基準: {report.exchangeRate.label}
                         </span>
                     </div>
                 )}
                {isStrategicReport && (
                    <div className="shrink-0">
                        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full bg-${accentColor}-500/20 text-${accentColor}-300 border border-${accentColor}-500/40 shadow-sm`}>
                            AIアカウント分析完了
                        </span>
                    </div>
                )}
                {isTrendReport && (
                    <div className="shrink-0">
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                            厳選トレンド {report.hypotheses?.length || 0}本 (各5銘柄)
                        </span>
                    </div>
                )}
                {isArbitrageReport && sortedSlots && sortedSlots.length > 0 && (
                    <div className="shrink-0">
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                            {hasArbitrageTiers ? '5スロット × 本日の指定価格帯 (各3商品)' : `5スロット網羅 (${sortedSlots.length}枠)`}
                        </span>
                    </div>
                )}
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* ========================================================= */}
                {/* 1. SNSアナリスト（戦略レポート）描画ブロック */}
                {/* ========================================================= */}
                {isStrategicReport && (
                    <div className="space-y-5 animate-fadeIn">
                        {report.claim && (
                            <div className={`bg-${accentColor}-500/10 border border-${accentColor}-500/30 rounded-xl p-4 shadow-sm`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm">🎯</span>
                                    <h4 className={`text-sm font-bold text-${accentColor}-300`}>今週のSNS最重要ミッション</h4>
                                </div>
                                <p className="text-xs text-white font-bold leading-relaxed ml-6">{report.claim}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {report.facts && report.facts.length > 0 && (
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                                    <h4 className={`text-xs font-bold text-${accentColor}-400 flex items-center gap-1.5 border-b border-slate-800 pb-2`}>
                                        <span>📊</span> アカウント実績データ ＆ 推奨設定
                                    </h4>
                                    <div className="space-y-2">
                                        {report.facts.map((fact: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800/60">
                                                <span className="text-slate-400 font-bold">{fact.label}</span>
                                                <span className="text-white font-mono">{fact.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {report.curatorDirectives && (
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                                    <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                        <span>👑</span> キュレーター向け編成ディレクション
                                    </h4>
                                    <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800/60">
                                        <span className="text-slate-400 font-bold">先行予測推奨曜日</span>
                                        <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{report.curatorDirectives.recommendedTrendDay}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] text-slate-400 block mb-1">スロット傾斜配分 (RSI判定)</span>
                                        {Object.entries(report.curatorDirectives.slotWeights || {}).map(([key, weight]) => (
                                            <div key={key} className="flex justify-between items-center text-[10px] pl-2">
                                                <span className="text-slate-300">{SLOT_METADATA[key]?.badge || key}</span>
                                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                                                    weight === 'high' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                                    weight === 'low' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                                    'bg-slate-800 text-slate-400 border border-slate-700'
                                                }`}>
                                                    {String(weight).toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {report.soWhat && (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                                <h4 className={`text-xs font-bold text-${accentColor}-400 flex items-center gap-1.5 border-b border-slate-800 pb-2`}>
                                    <span>🎨</span> クリエイター向け制作レギュレーション
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed p-2 bg-slate-900/60 rounded border border-slate-800/50">
                                    {report.soWhat}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/* 2. 市場トレンドレポート描画ブロック */}
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
                                        const platformName = item.sourcePlatform || item.raw_payload?.sourcePlatform;
                                        const evidenceNote = item.evidenceNote || item.raw_payload?.evidenceNote;
                                        const evidenceUrl = item.sourceEvidenceUrl || item.raw_payload?.sourceEvidenceUrl;
                                        
                                        const jpShopUrl = item.jpEvidenceUrl || item.raw_payload?.jpEvidenceUrl || getCardrushFallbackUrl(item.cardName);

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

                                                    {(platformName || evidenceNote || evidenceUrl) && (
                                                        <div className="flex flex-col gap-1 bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-[10px]">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="font-mono text-amber-400 font-bold truncate">
                                                                    🌐 {platformName || '海外成約相場'}
                                                                </span>
                                                                {evidenceUrl && (
                                                                    <a
                                                                        href={evidenceUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-sky-400 hover:text-sky-300 underline font-mono text-[9px] shrink-0"
                                                                    >
                                                                        成約URL ↗
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {evidenceNote && (
                                                                <span className="text-slate-400 truncate text-[9px]" title={evidenceNote}>
                                                                    📌 {evidenceNote}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="space-y-1 text-xs font-mono border-t border-slate-800 pt-2">
                                                        <div className="flex justify-between items-center text-slate-400">
                                                            <span>JP 調達:</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-slate-200 font-bold">{item.jpBuyPriceJPY}</span>
                                                                <a
                                                                    href={jpShopUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5 transition"
                                                                    title="仕入れ元・検索エビデンスを確認"
                                                                >
                                                                    <span>[根拠]</span>
                                                                    <span>↗</span>
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400">
                                                            <span>現地現在:</span>
                                                            <span className="text-emerald-400 font-bold">{item.currentLocalPrice}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ========================================================= */}
                {/* 3. アービトラージレポート描画ブロック */}
                {/* ========================================================= */}
                {isArbitrageReport && sortedSlots && sortedSlots.length > 0 && (
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
                                                {allItemsInTier.map((item: any, itemIdx: number) => {
                                                    const platformName = item.sourcePlatform || item.raw_payload?.sourcePlatform;
                                                    const evidenceNote = item.evidenceNote || item.raw_payload?.evidenceNote;
                                                    const evidenceUrl = item.sourceEvidenceUrl || item.raw_payload?.sourceEvidenceUrl;
                                                    const cardNum = item.cardNumber || item.raw_payload?.currentItem?.cardNumber || '';

                                                    const jpShopUrl = item.jpEvidenceUrl || item.raw_payload?.jpEvidenceUrl || matchedTier.jpEvidenceUrl || matchedTier.currentItem?.jpEvidenceUrl || getCardrushFallbackUrl(item.cardName, cardNum);

                                                    return (
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
                                                                        {cardNum && (
                                                                            <span className="ml-1.5 text-[10px] text-amber-300 font-mono bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                                                                                {cardNum}
                                                                            </span>
                                                                        )}
                                                                    </h5>
                                                                </div>

                                                                {(platformName || evidenceNote || evidenceUrl) && (
                                                                    <div className="flex flex-col gap-1 bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-[10px]">
                                                                        <div className="flex items-center justify-between gap-1">
                                                                            <span className="font-mono text-emerald-400 font-bold truncate">
                                                                                🌐 {platformName || '海外成約相場'}
                                                                            </span>
                                                                            {evidenceUrl && (
                                                                                <a
                                                                                    href={evidenceUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-sky-400 hover:text-sky-300 underline font-mono text-[9px] shrink-0"
                                                                                >
                                                                                    成約URL ↗
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        {evidenceNote && (
                                                                            <span className="text-slate-400 truncate text-[9px]" title={evidenceNote}>
                                                                                📌 {evidenceNote}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div className="space-y-1 text-xs font-mono border-t border-slate-800 pt-2">
                                                                    <div className="flex justify-between items-center text-slate-400">
                                                                        <span>日本調達:</span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-slate-200 font-bold">{item.jpBuyPriceJPY || item.currentJpPriceJPY}</span>
                                                                            <a
                                                                                href={jpShopUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5 transition"
                                                                                title="仕入れ元・検索エビデンスを確認"
                                                                            >
                                                                                <span>[根拠]</span>
                                                                                <span>↗</span>
                                                                            </a>
                                                                        </div>
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
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* 「すべて表示」選択時 */
                            <div className="space-y-4">
                                {sortedSlots.map((slot: any, sIdx: number) => {
                                    const rawTiers: any[] = slot.tiers || slot.items || [];
                                    const slotMeta = getSlotMeta(slot.slotKey, slot.slotLabel);

                                    const uniqueMap = new Map<string, any>();
                                    for (const t of rawTiers) {
                                        const main = t.mainItem || t;
                                        const uniqueKey = `${t.priceTier || main.priceTier}_${main.cardName}`;
                                        if (!uniqueMap.has(uniqueKey)) {
                                            uniqueMap.set(uniqueKey, t);
                                        }
                                    }
                                    const deduplicatedTiers = Array.from(uniqueMap.values());

                                    const sortedTiers = deduplicatedTiers.sort((a, b) => {
                                        const orderA = getTierOrderScore(a);
                                        const orderB = getTierOrderScore(b);
                                        if (orderA !== orderB) return orderA - orderB;
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
                                                    {sortedTiers.length}枠
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
                                                {sortedTiers.map((tierCell: any, cIdx: number) => {
                                                    const cellId = `${slot.slotKey}_${tierCell.priceTier || cIdx}`;
                                                    const isOpen = openSubIndex === cellId;
                                                    const main = tierCell.mainItem || tierCell;
                                                    const subs: any[] = tierCell.subItems || [];
                                                    const platformName = main.sourcePlatform || tierCell.sourcePlatform;
                                                    const evidenceNote = main.evidenceNote || tierCell.evidenceNote;
                                                    const evidenceUrl = main.sourceEvidenceUrl || tierCell.sourceEvidenceUrl;
                                                    const cardNum = main.cardNumber || tierCell.cardNumber || tierCell.currentItem?.cardNumber || '';

                                                    const mainJpShopUrl = main.jpEvidenceUrl || main.raw_payload?.jpEvidenceUrl || tierCell.jpEvidenceUrl || tierCell.currentItem?.jpEvidenceUrl || getCardrushFallbackUrl(main.cardName, cardNum);

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
                                                                    {cardNum && (
                                                                        <span className="ml-1.5 text-[10px] text-amber-300 font-mono bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                                                                            {cardNum}
                                                                        </span>
                                                                    )}
                                                                </h5>

                                                                {(platformName || evidenceNote || evidenceUrl) && (
                                                                    <div className="flex flex-col gap-1 bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-[10px]">
                                                                        <div className="flex items-center justify-between gap-1">
                                                                            <span className="font-mono text-emerald-400 font-bold truncate">
                                                                                🌐 {platformName || '海外成約相場'}
                                                                            </span>
                                                                            {evidenceUrl && (
                                                                                <a
                                                                                    href={evidenceUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-sky-400 hover:text-sky-300 underline font-mono text-[9px] shrink-0"
                                                                                >
                                                                                    成約URL ↗
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        {evidenceNote && (
                                                                            <span className="text-slate-400 truncate text-[9px]" title={evidenceNote}>
                                                                                📌 {evidenceNote}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div className="flex justify-between text-xs font-mono border-t border-slate-800/60 pt-1.5">
                                                                    <span className="text-slate-400">日本調達:</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-slate-200 font-bold">{main.jpBuyPriceJPY || main.currentJpPriceJPY}</span>
                                                                        <a
                                                                            href={mainJpShopUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5 transition"
                                                                            title="仕入れ元・検索エビデンスを確認"
                                                                        >
                                                                            <span>[根拠]</span>
                                                                            <span>↗</span>
                                                                        </a>
                                                                    </div>
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
                                                                            {subs.map((subItem: any, subIdx: number) => {
                                                                                const subPlatform = subItem.sourcePlatform || subItem.raw_payload?.sourcePlatform;
                                                                                const subEvidence = subItem.evidenceNote || subItem.raw_payload?.evidenceNote;
                                                                                const subUrl = subItem.sourceEvidenceUrl || subItem.raw_payload?.sourceEvidenceUrl;
                                                                                const subCardNum = subItem.cardNumber || subItem.raw_payload?.currentItem?.cardNumber || '';

                                                                                const subJpShopUrl = subItem.jpEvidenceUrl || subItem.raw_payload?.jpEvidenceUrl || getCardrushFallbackUrl(subItem.cardName, subCardNum);

                                                                                return (
                                                                                    <div key={subIdx} className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800/60 text-[11px] space-y-1.5">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <span className="font-bold text-white truncate max-w-[130px]" title={subItem.cardName}>
                                                                                                {subItem.cardName}
                                                                                                {subCardNum && (
                                                                                                    <span className="ml-1 text-[9px] text-amber-300 font-mono bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                                                                                                        {subCardNum}
                                                                                                    </span>
                                                                                                )}
                                                                                            </span>
                                                                                            <span className="text-slate-400 font-mono text-[10px]">{subItem.conditionGrade || 'Raw NM'}</span>
                                                                                        </div>

                                                                                        {(subPlatform || subEvidence || subUrl) && (
                                                                                            <div className="text-[9px] flex items-center justify-between bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                                                                                <div className="flex items-center gap-1 truncate">
                                                                                                    <span className="font-mono text-slate-300 font-bold">🌐 {subPlatform || '海外成約'}</span>
                                                                                                    {subEvidence && <span className="text-slate-500 truncate">({subEvidence})</span>}
                                                                                                </div>
                                                                                                {subUrl && (
                                                                                                    <a
                                                                                                        href={subUrl}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        className="text-sky-400 hover:text-sky-300 underline font-mono text-[8px] shrink-0 ml-1"
                                                                                                    >
                                                                                                        成約URL ↗
                                                                                                    </a>
                                                                                                )}
                                                                                            </div>
                                                                                        )}

                                                                                        <div className="flex justify-between items-center font-mono text-slate-400 text-[10px]">
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span>調達: {subItem.jpBuyPriceJPY}</span>
                                                                                                <a
                                                                                                    href={subJpShopUrl}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="text-[9px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5 transition"
                                                                                                    title="仕入れ元エビデンスを確認"
                                                                                                >
                                                                                                    <span>[根拠]</span>
                                                                                                    <span>↗</span>
                                                                                                </a>
                                                                                            </div>
                                                                                            <span className="text-emerald-400 font-bold">利ざや: {subItem.priceSpreadJPY}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
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
            </div>
        </div>
    );
}