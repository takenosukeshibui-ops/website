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
    const [openSubIndex, setOpenSubIndex] = useState<string | null>(null);

    if (!report || !report.title) return <div className="text-slate-500 text-xs italic">レポートデータがありません</div>;

    const isTrendReport = Boolean(report.hypotheses && Array.isArray(report.hypotheses));
    const isArbitrageReport = Boolean(report.slots && Array.isArray(report.slots));
    const isStrategicReport = Boolean(report.facts && report.soWhat);

    const priceTiers = [
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

    // 🌟 ポケカジラ個別URL優先・「純粋なカード名 ＋ 正式型番」検索URLフォールバック
    const resolvePokecazillaUrl = (rawUrl?: string, cardName?: string, cardNumber?: string) => {
        if (rawUrl && rawUrl.startsWith('https://pokecazilla.com/')) {
            return rawUrl;
        }
        const cleanName = (cardName || '')
            .replace(/\[.*?\]/g, '')
            .replace(/\s*[\(（].*?[\)）]/g, '')
            .replace(/\b(SAR|MUR|BWR|CSR|CHR|SSR|SR|UR|HR|AR|ACE|RR|RRR)\b/gi, '')
            .replace(/\b(\d{3}\/\d{3}|\d{3}\/[A-Z0-9]+-P|[A-Z]{2,4}\d{2}-\d{3}|No\.?\s*\d+)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        const code = (cardNumber || '').trim();
        const isOfficialCode = /^(\d{3}\/\d{3}|\d{3}\/[A-Z0-9]+-P|[A-Z]{2,4}\d{2}-\d{3})$/i.test(code);
        const query = [cleanName, isOfficialCode ? code : ''].filter(Boolean).join(' ');
        if (!query) return 'https://pokecazilla.com/pokemon';
        return `https://pokecazilla.com/pokemon/products/list?category_id=17&name=${encodeURIComponent(query)}`;
    };

    const getEbaySoldFallbackUrl = (cardName?: string, cardNumber?: string, conditionGrade?: string) => {
        if (!cardName) return 'https://www.ebay.com/sch/i.html?_nkw=pokemon+card&LH_Sold=1&LH_Complete=1';
        const cleanName = cardName
            .replace(/\[.*?\]/g, '')
            .replace(/\s*[\(（].*?[\)）]/g, '')
            .trim();
        const parts = [cleanName];
        if (cardNumber) parts.push(cardNumber.trim());
        parts.push('Japanese');
        if (conditionGrade && (conditionGrade.includes('PSA 10') || conditionGrade.includes('PSA10'))) {
            parts.push('PSA 10');
        }
        const query = parts.join(' ').trim();
        return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;
    };

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

    // 🌟 1. 対象価格帯（Price Tier）の抽出
    let overallPriceTierLabel = '';
    if (isArbitrageReport && sortedSlots && sortedSlots.length > 0) {
        for (const slot of sortedSlots) {
            const tiers = slot.tiers || slot.items || [];
            if (tiers.length > 0 && tiers[0].priceTierLabel) {
                overallPriceTierLabel = tiers[0].priceTierLabel;
                break;
            }
        }
    }

    // 🌟 2. CSVダウンロード処理（Excel文字化け防止のBOM付き）
    const handleDownloadCSV = () => {
        if (!report || !report.slots) return;
        
        const headers = [
            'スロット', '区分', '価格帯', 'カード名', '型番', '状態', 
            '日本仕入値', '日本ショップ名', '海外売値', '利ざや', 'ROI', 
            '7日成約', '30日成約', 'ポケカジラURL', 'eBay URL'
        ];
        
        const rows = [headers.join(',')];
        
        for (const slot of sortedSlots) {
            const slotName = getSlotMeta(slot.slotKey, slot.slotLabel).badge;
            const tiers = slot.tiers || slot.items || [];
            
            for (const tierCell of tiers) {
                const priceTier = tierCell.priceTierLabel || '指定価格帯';
                const main = tierCell.mainItem || tierCell;
                const subs = tierCell.subItems || [];
                
                const processItem = (item: any, role: string) => {
                    const cardNum = item.cardNumber || '';
                    const rawJpUrl = item.jpEvidenceUrl || tierCell.currentItem?.jpEvidenceUrl;
                    const jpShopUrl = resolvePokecazillaUrl(rawJpUrl, item.cardName, cardNum);
                    const ebayUrl = item.sourceEvidenceUrl || tierCell.sourceEvidenceUrl || getEbaySoldFallbackUrl(item.cardName, cardNum, item.conditionGrade);
                    
                    const escapeCsv = (str: string) => `"${(str || '').toString().replace(/"/g, '""')}"`;

                    const row = [
                        escapeCsv(slotName),
                        escapeCsv(role),
                        escapeCsv(priceTier),
                        escapeCsv(item.cardName),
                        escapeCsv(cardNum),
                        escapeCsv(item.conditionGrade || 'Raw NM'),
                        escapeCsv(item.jpBuyPriceJPY),
                        escapeCsv(item.jpShopName || 'ポケカジラ最安'),
                        escapeCsv(item.targetSoldPrice),
                        escapeCsv(item.priceSpreadJPY),
                        escapeCsv(item.spreadROI),
                        escapeCsv(item.salesVolume7d || '-'),
                        escapeCsv(item.salesVolume30d || '-'),
                        escapeCsv(jpShopUrl),
                        escapeCsv(ebayUrl)
                    ];
                    rows.push(row.join(','));
                };
                
                processItem(main, '本命');
                subs.forEach((sub: any) => processItem(sub, '代替候補'));
            }
        }
        
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // Excelでの文字化けを防ぐBOM
        const blob = new Blob([bom, rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileDate = formattedDate.replace(/年|月/g, '-').replace(/日/g, '');
        link.download = `Arbitrage_Report_${regionName}_${fileDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 🌟 3. JSONダウンロード処理（AI検証用）
    const handleDownloadJSON = () => {
        if (!report) return;
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileDate = formattedDate.replace(/年|月/g, '-').replace(/日/g, '');
        link.download = `Arbitrage_Report_${regionName}_${fileDate}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* 🌟 価格帯ラベルの表示 */}
                    {overallPriceTierLabel && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shadow-sm">
                            対象価格帯: {overallPriceTierLabel}
                        </span>
                    )}
                    {report.exchangeRate && (
                        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full bg-${accentColor}-500/20 text-${accentColor}-300 border border-${accentColor}-500/40 shadow-sm`}>
                            💱 為替基準: {report.exchangeRate.label}
                        </span>
                    )}
                    
                    {/* 🌟 ダウンロードボタンの追加 */}
                    {isArbitrageReport && sortedSlots && sortedSlots.length > 0 && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <button
                                onClick={handleDownloadCSV}
                                className="text-xs font-bold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition shadow-sm flex items-center gap-1"
                                title="Excelやスプレッドシートでの目視確認用"
                            >
                                📊 CSV
                            </button>
                            <button
                                onClick={handleDownloadJSON}
                                className="text-xs font-bold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition shadow-sm flex items-center gap-1"
                                title="AI検証用・構造化データ"
                            >
                                ｛ ｝ JSON
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* アービトラージレポート描画ブロック */}
                {isArbitrageReport && sortedSlots && sortedSlots.length > 0 && (
                    <div className="space-y-4">
                        <div className="space-y-4">
                            {sortedSlots.map((slot: any, sIdx: number) => {
                                const slotMeta = getSlotMeta(slot.slotKey, slot.slotLabel);
                                const tiers = slot.tiers || slot.items || [];
                                const isPausedSlot = Boolean(slot.isPaused) || slot.slotKey === 'classic_vintage';

                                return (
                                    <div key={sIdx} className={`bg-slate-950/80 border ${isPausedSlot ? 'border-slate-800/60 opacity-80' : 'border-slate-800'} rounded-xl p-4 space-y-3.5 shadow-sm`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold font-mono ${isPausedSlot ? 'text-slate-400' : 'text-amber-300'}`}>
                                                    [{slotMeta.badge}]
                                                </span>
                                                {slotMeta.desc && (
                                                    <span className="text-xs text-slate-300 font-medium">
                                                        {slotMeta.desc}
                                                    </span>
                                                )}
                                            </div>
                                            {isPausedSlot ? (
                                                <span className="text-xs text-amber-300 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                                                    ⏸ スロット {sIdx + 1} / 5（保留中）
                                                </span>
                                            ) : (
                                                <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                                    スロット {sIdx + 1} / 5
                                                </span>
                                            )}
                                        </div>

                                        {isPausedSlot ? (
                                            <div className="bg-slate-900/40 border border-dashed border-amber-500/30 rounded-lg p-4 text-center text-xs text-amber-200/80">
                                                ⏸ 現在保留中（{slot.pauseReason || '旧裏・初期カードの国内相場取得停止中のため一時休止'}）
                                            </div>
                                        ) : tiers.length === 0 ? (
                                            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-lg p-4 text-center text-xs text-slate-500">
                                                本日の指定価格帯・状態◎在庫条件に合致するスクレイピング実売候補はありませんでした
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
                                                {tiers.map((tierCell: any, cIdx: number) => {
                                                    const cellId = `${slot.slotKey}_${tierCell.priceTier || cIdx}`;
                                                    const isOpen = openSubIndex === cellId;
                                                    const main = tierCell.mainItem || tierCell;
                                                    const subs: any[] = tierCell.subItems || [];
                                                    const cardNum = main.cardNumber || tierCell.cardNumber || '';

                                                    const rawMainJpUrl = main.jpEvidenceUrl || tierCell.currentItem?.jpEvidenceUrl;
                                                    const mainJpShopUrl = resolvePokecazillaUrl(rawMainJpUrl, main.cardName, cardNum);
                                                    const mainEbayUrl = main.sourceEvidenceUrl || tierCell.sourceEvidenceUrl || getEbaySoldFallbackUrl(main.cardName, cardNum, main.conditionGrade);
                                                    const displayMainShopName =
                                                        main.jpShopName && !main.jpShopName.includes('カードラッシュ')
                                                            ? main.jpShopName
                                                            : 'ポケカジラ最安';

                                                    return (
                                                        <div key={cIdx} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between space-y-2.5">
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-start gap-1">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTierBadgeClass(tierCell.priceTier)} whitespace-nowrap`}>
                                                                        {tierCell.priceTierLabel || '本日の指定価格帯'}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-mono shadow-sm">
                                                                            本命
                                                                        </span>
                                                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded whitespace-nowrap shrink-0 border border-slate-700/60">
                                                                            {main.conditionGrade || 'Raw NM'}
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

                                                                {/* 成約ボリューム実績 (7日 & 30日) */}
                                                                <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800/60 text-[10px] font-mono flex items-center justify-between text-slate-400">
                                                                    <span className="text-amber-400 font-bold">📈 eBay成約:</span>
                                                                    <span className="text-slate-200">
                                                                        7日: <strong className="text-white">{main.salesVolume7d || '確認中'}</strong> / 30日: <strong className="text-white">{main.salesVolume30d || '1件以上'}</strong>
                                                                    </span>
                                                                </div>

                                                                {/* 日本仕入れ（ポケカジラ最安値比較） */}
                                                                <div className="flex justify-between items-center text-xs font-mono border-t border-slate-800/60 pt-1.5">
                                                                    <span className="text-slate-400 truncate max-w-[120px]" title={displayMainShopName}>
                                                                        仕入({displayMainShopName}):
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-slate-200 font-bold">{main.jpBuyPriceJPY}</span>
                                                                        <a
                                                                            href={mainJpShopUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5 transition"
                                                                            title="ポケカジラ最安値ページを開く"
                                                                        >
                                                                            <span>[根拠]</span>
                                                                            <span>↗</span>
                                                                        </a>
                                                                    </div>
                                                                </div>

                                                                {/* 海外実成約 ＆ 実売URL */}
                                                                <div className="flex justify-between items-center text-xs font-mono">
                                                                    <span className="text-slate-400">海外実売:</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-emerald-400 font-bold">{main.targetSoldPrice}</span>
                                                                        <a
                                                                            href={mainEbayUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5 transition"
                                                                            title="eBay成約実績を開く"
                                                                        >
                                                                            <span>[実売]</span>
                                                                            <span>↗</span>
                                                                        </a>
                                                                    </div>
                                                                </div>

                                                                {/* 単純利ざや */}
                                                                <div className="flex justify-between text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-emerald-300">
                                                                    <span>利ざや: <strong>{main.priceSpreadJPY}</strong></span>
                                                                    <span className="font-bold">ROI: {main.spreadROI}</span>
                                                                </div>
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
                                                                                const subCardNum = subItem.cardNumber || '';
                                                                                const subJpShopUrl = resolvePokecazillaUrl(subItem.jpEvidenceUrl, subItem.cardName, subCardNum);
                                                                                const subEbayUrl = subItem.sourceEvidenceUrl || getEbaySoldFallbackUrl(subItem.cardName, subCardNum, subItem.conditionGrade);

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

                                                                                        <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                                                                                            <span>成約: 7日 {subItem.salesVolume7d || '-'} / 30日 {subItem.salesVolume30d || '-'}</span>
                                                                                            <span className="text-emerald-400 font-bold">利ざや: {subItem.priceSpreadJPY}</span>
                                                                                        </div>

                                                                                        <div className="flex justify-between items-center font-mono text-slate-400 text-[10px]">
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span>仕入: {subItem.jpBuyPriceJPY}</span>
                                                                                                <a
                                                                                                    href={subJpShopUrl}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="text-[9px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.2 rounded font-sans"
                                                                                                    title="ポケカジラ最安値ページを開く"
                                                                                                >
                                                                                                    [根拠]↗
                                                                                                </a>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span className="text-emerald-400">{subItem.targetSoldPrice}</span>
                                                                                                <a
                                                                                                    href={subEbayUrl}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-sans"
                                                                                                    title="eBay実成約を開く"
                                                                                                >
                                                                                                    [実売]↗
                                                                                                </a>
                                                                                            </div>
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
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}