// app/AiDashboard/components/DeskViews.tsx
import React, { useState, useEffect } from 'react';
import { IntelligenceData, RegionKey, Gate1AuditItem, Gate2AuditItem } from '../types';
import DocumentReportView from './DocumentReport';

interface DeskViewsProps {
    aiActiveDesk: string;
    activeArbitrageRegion: RegionKey | 'audit';
    aiData: IntelligenceData | null;
    gate1Audits?: (Gate1AuditItem & { agentKey?: string; priceTier?: string })[];
    gate2Audits?: Gate2AuditItem[];
    runningAction: string | null;
    runSingleAi: (action: string, region?: RegionKey) => void;
    handleCopy: (text: string, key: string) => void;
    copiedKey: string | null;
    handlePublishToInstagram: (content: string, typeKey: string, images?: string[] | string) => void;
    isPublishingInstagram: string | null;
    handlePublishToX: (mainPost: string, threadPosts: string[], imageUrl?: string) => void;
    isPublishingX: boolean;
}

const DAY_LABELS: Record<string, string> = {
    Monday: '月曜', Tuesday: '火曜', Wednesday: '水曜', Thursday: '木曜',
    Friday: '金曜', Saturday: '土曜', Sunday: '日曜'
};

const DAY_DEFAULT_ROLE: Record<string, string> = {
    Monday: 'サービス解説',
    Tuesday: 'アービトラージ',
    Wednesday: 'アービトラージ',
    Thursday: 'アービトラージ',
    Friday: 'アービトラージ',
    Saturday: 'アービトラージ',
    Sunday: '5日まとめ',
};

const buildInfographicUrl = (info: any) => {
    if (!info) return undefined;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    return `${baseUrl}/api/og?type=${info.type || 'arbitrage'}&cardName=${encodeURIComponent(info.cardName || '')}&jpPrice=${encodeURIComponent(info.jpPrice || '')}&overseasPrice=${encodeURIComponent(info.overseasPrice || '')}&spread=${encodeURIComponent(info.spread || '')}&roi=${encodeURIComponent(info.roi || '')}&hookText=${encodeURIComponent(info.hookText || '')}`;
};

export default function DeskViews({
    aiActiveDesk, activeArbitrageRegion, aiData,
    gate1Audits = [], gate2Audits = [],
    runningAction, runSingleAi, handleCopy, copiedKey,
    handlePublishToInstagram, isPublishingInstagram,
    handlePublishToX, isPublishingX
}: DeskViewsProps) {
    const [selectedIgDay, setSelectedIgDay] = useState<string>('Tuesday');
    const [selectedXDay, setSelectedXDay] = useState<string>('Tuesday');
    const [currentIgSlideIdx, setCurrentIgSlideIdx] = useState<number>(0);

    useEffect(() => {
        const firstIgDay = aiData?.snsPosts?.dailyPosts?.[0]?.day;
        if (firstIgDay) setSelectedIgDay(firstIgDay);
    }, [aiData?.snsPosts?.dailyPosts]);

    useEffect(() => {
        const firstXDay = aiData?.xPosts?.dailyThreads?.[0]?.day;
        if (firstXDay) setSelectedXDay(firstXDay);
    }, [aiData?.xPosts?.dailyThreads]);

    useEffect(() => {
        setCurrentIgSlideIdx(0);
    }, [selectedIgDay]);

    const currentIgDaily = aiData?.snsPosts?.dailyPosts?.find(p => p.day?.includes(selectedIgDay) || p.day === selectedIgDay);
    const igPostText = currentIgDaily?.caption || '';
    const igImageUrl = buildInfographicUrl(currentIgDaily?.infographicData);

    const igSlides: string[] = [
        '1枚目(表紙): 価格差インフォグラフィック画像（自動合成）',
        '2枚目: 自社代理購入 への誘導CTA'
    ];

    const currentXDaily = aiData?.xPosts?.dailyThreads?.find(t => t.day?.includes(selectedXDay) || t.day === selectedXDay);
    const xMainPost: string = currentXDaily?.mainPost || '';
    const xThreadPosts: string[] = currentXDaily?.threadPosts || [];
    const xImageUrl = buildInfographicUrl(currentXDaily?.infographicData);

    const dynamicIgDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
        const post = aiData?.snsPosts?.dailyPosts?.find(p => p.day?.includes(day) || p.day === day);
        return { key: day, label: DAY_LABELS[day], desc: post?.theme || DAY_DEFAULT_ROLE[day] || '未作成' };
    });

    const dynamicXDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
        const thread = aiData?.xPosts?.dailyThreads?.find(t => t.day?.includes(day) || t.day === day);
        const match = thread?.mainPost?.match(/\((.*?)\)/);
        return { key: day, label: DAY_LABELS[day], desc: match ? match[1] : DAY_DEFAULT_ROLE[day] || '未作成' };
    });

    const allArbAudits = gate1Audits.filter(a => a.agentKey !== 'trend');

    const isArbAudit = aiActiveDesk === 'desk_arbitrage_audit' || activeArbitrageRegion === 'audit';
    const safeArbRegion: RegionKey | undefined = activeArbitrageRegion !== 'audit' ? activeArbitrageRegion : undefined;

    const activeArbReport = safeArbRegion ? aiData?.profitableCards?.[safeArbRegion] || null : null;

    const escapeCsvField = (val: unknown) => `"${(val ?? '').toString().replace(/"/g, '""')}"`;
    const getTodayFileDate = () => {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    };
    const formatRegionLabel = (reg?: string) => {
        const r = (reg || '').toLowerCase();
        if (r === 'us') return '北米';
        if (r === 'eu') return '欧州';
        if (r === 'asia') return 'アジア';
        return reg || '-';
    };

    const triggerCsvDownload = (headers: string[], rows: string[][], filenameBase: string) => {
        if (rows.length === 0) return;
        const csvLines = [
            headers.map(escapeCsvField).join(','),
            ...rows.map(r => r.map(escapeCsvField).join(',')),
        ];
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filenameBase}_${getTodayFileDate()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const triggerJsonDownload = (data: unknown, filenameBase: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filenameBase}_${getTodayFileDate()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderExportButtons = (onCsv: () => void, onJson: () => void, disabled: boolean = false) => (
        <div className="flex items-center gap-1.5 ml-1">
            <button
                type="button"
                onClick={onCsv}
                disabled={disabled}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-white border border-slate-600 transition shadow-sm flex items-center gap-1"
                title="Excelやスプレッドシートでの目視確認用"
            >
                📊 CSV
            </button>
            <button
                type="button"
                onClick={onJson}
                disabled={disabled}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-white border border-slate-600 transition shadow-sm flex items-center gap-1"
                title="AI検証用・構造化データ"
            >
                ｛ ｝ JSON
            </button>
        </div>
    );

    const handleDownloadChiefCSV = () => {
        const pkg = aiData?.chiefPackage;
        if (!pkg) return;
        const headers = ['曜日', '投稿種別', '地域', '対象カード・トピック', 'MVP', '無料フック(Fact)', '秘匿指示(Action)', '選定理由'];
        const rows: string[][] = [];
        const calendar = Array.isArray(pkg.contentCalendar) ? pkg.contentCalendar : [];
        const mvpName = pkg.mvpHighlight?.cardName || pkg.chosenCardOrItem || '';

        for (const dayItem of calendar as any[]) {
            const dayLabel = DAY_LABELS[dayItem.dayOfWeek] || dayItem.dayOfWeek || '';
            const items = Array.isArray(dayItem.items) && dayItem.items.length > 0 ? dayItem.items : [null];
            for (const sub of items) {
                const cardTitle = sub?.selectedCardOrTopic || dayItem.selectedCardOrTopic || '';
                rows.push([
                    dayLabel,
                    dayItem.postType || 'arbitrage',
                    formatRegionLabel(sub?.region),
                    cardTitle,
                    mvpName && cardTitle.includes(mvpName) ? 'MVP' : '',
                    sub?.hookFact || dayItem.hookFact || '',
                    sub?.hiddenActionReason || dayItem.hiddenActionReason || '',
                    pkg.mvpHighlight?.selectionReason || pkg.selectionReason || '',
                ]);
            }
        }
        if (rows.length === 0) {
            rows.push([
                '-',
                'arbitrage',
                '-',
                mvpName,
                'MVP',
                pkg.coreHookFact || '',
                '',
                pkg.mvpHighlight?.selectionReason || pkg.selectionReason || '',
            ]);
        }
        triggerCsvDownload(headers, rows, 'Curator_Lineup');
    };

    const handleDownloadChiefJSON = () => {
        if (!aiData?.chiefPackage) return;
        triggerJsonDownload(aiData.chiefPackage, 'Curator_Lineup');
    };

    const handleDownloadGate2CSV = () => {
        if (gate2Audits.length === 0) return;
        const headers = ['プラットフォーム', '対象曜日', '判定ステータス', '監査フィードバック'];
        const rows = gate2Audits.map((item) => [
            item.platform || '',
            DAY_LABELS[item.day] || item.day || '',
            item.status === 'passed' ? '配信承認' : item.status === 'pending' ? '監査待ち' : '修正要請',
            item.feedback || '',
        ]);
        triggerCsvDownload(headers, rows, 'Quality_Audit_Gate2');
    };

    const handleDownloadGate2JSON = () => {
        if (gate2Audits.length === 0) return;
        triggerJsonDownload(gate2Audits, 'Quality_Audit_Gate2');
    };

    const buildAccountRows = (report: any) => {
        if (!report) return [];
        const rows: string[][] = [];
        const facts = Array.isArray(report.facts) ? report.facts : [];
        for (const f of facts) {
            rows.push([report.title || '', report.claim || '', 'Fact', f?.label || '', f?.value || '', report.soWhat || '']);
        }
        const reasons = Array.isArray(report.reasons) ? report.reasons : [];
        reasons.forEach((r: string, i: number) => {
            rows.push([report.title || '', report.claim || '', `Reason #${i + 1}`, '', r || '', report.soWhat || '']);
        });
        if (rows.length === 0) {
            rows.push([report.title || '', report.claim || '', 'Summary', '', '', report.soWhat || '']);
        }
        return rows;
    };

    const handleDownloadIgAnalystCSV = () => {
        triggerCsvDownload(
            ['タイトル', '主張・結論', '区分', '項目名', '内容・数値', '示唆(So What)'],
            buildAccountRows(aiData?.accountInsights),
            'IG_Analyst_Report'
        );
    };

    const handleDownloadIgAnalystJSON = () => {
        if (!aiData?.accountInsights) return;
        triggerJsonDownload(aiData.accountInsights, 'IG_Analyst_Report');
    };

    const handleDownloadXAnalystCSV = () => {
        triggerCsvDownload(
            ['タイトル', '主張・結論', '区分', '項目名', '内容・数値', '示唆(So What)'],
            buildAccountRows(aiData?.xAccountInsights),
            'X_Analyst_Report'
        );
    };

    const handleDownloadXAnalystJSON = () => {
        if (!aiData?.xAccountInsights) return;
        triggerJsonDownload(aiData.xAccountInsights, 'X_Analyst_Report');
    };

    const handleDownloadIgCreatorCSV = () => {
        const posts = aiData?.snsPosts?.dailyPosts || [];
        if (posts.length === 0) return;
        const headers = ['曜日', 'テーマ', '推奨時間帯', 'カード名', '地域', '日本価格', '海外価格', '差額', 'ROI', 'ハッシュタグ', 'キャプション全文'];
        const tagsStr = (aiData?.snsPosts?.hashtags || []).join(' ');
        const rows = posts.map((p: any) => [
            DAY_LABELS[p.day] || p.day || '',
            p.theme || aiData?.snsPosts?.theme || '',
            aiData?.snsPosts?.recommendedTiming || '',
            p.infographicData?.cardName || '',
            p.infographicData?.region || '',
            p.infographicData?.jpPrice || '',
            p.infographicData?.overseasPrice || '',
            p.infographicData?.spread || '',
            p.infographicData?.roi || '',
            tagsStr,
            p.caption || '',
        ]);
        triggerCsvDownload(headers, rows, 'IG_Creator_Posts');
    };

    const handleDownloadIgCreatorJSON = () => {
        if (!aiData?.snsPosts) return;
        triggerJsonDownload(aiData.snsPosts, 'IG_Creator_Posts');
    };

    const handleDownloadXCreatorCSV = () => {
        const threads = aiData?.xPosts?.dailyThreads || [];
        if (threads.length === 0) return;
        const headers = ['曜日', 'テーマ', '1ポスト目文字数', '1ポスト目(フック)', '2ポスト目', '3ポスト目', '4ポスト目', 'カード名', '差額', 'ROI'];
        const rows = threads.map((t: any) => {
            const tp = Array.isArray(t.threadPosts) ? t.threadPosts : [];
            return [
                DAY_LABELS[t.day] || t.day || '',
                aiData?.xPosts?.theme || '',
                String((t.mainPost || '').length),
                t.mainPost || '',
                tp[0] || '',
                tp[1] || '',
                tp[2] || '',
                t.infographicData?.cardName || '',
                t.infographicData?.spread || '',
                t.infographicData?.roi || '',
            ];
        });
        triggerCsvDownload(headers, rows, 'X_Creator_Threads');
    };

    const handleDownloadXCreatorJSON = () => {
        if (!aiData?.xPosts) return;
        triggerJsonDownload(aiData.xPosts, 'X_Creator_Threads');
    };

    const handleDownloadArbAuditCSV = () => {
        if (allArbAudits.length === 0) return;
        const headers = ['地域', '判定ステータス', 'スロット', '価格帯', 'カード名', '四則検算チェック', '監査フィードバック'];
        const rows = [headers.join(',')];

        for (const item of allArbAudits) {
            const statusLabel =
                item.status === 'passed' ? '検算OK' :
                item.status === 'pending' ? '監査待ち' : '差額異常';
            const mathCheck =
                item.checks?.roi_calculation_valid === true ? 'OK' :
                item.checks?.roi_calculation_valid === false ? 'NG' : '-';

            rows.push([
                escapeCsvField(formatRegionLabel(item.region)),
                escapeCsvField(statusLabel),
                escapeCsvField(item.slot),
                escapeCsvField(item.priceTier || '-'),
                escapeCsvField(item.card),
                escapeCsvField(mathCheck),
                escapeCsvField(item.feedback || '')
            ].join(','));
        }

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Arbitrage_Audit_Gate1A_${getTodayFileDate()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadArbAuditJSON = () => {
        if (allArbAudits.length === 0) return;
        const blob = new Blob([JSON.stringify(allArbAudits, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Arbitrage_Audit_Gate1A_${getTodayFileDate()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            {/* ========================================================= */}
            {/* 👑 キュレーターデスク */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_chief' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">👑</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">キュレーター</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {renderExportButtons(handleDownloadChiefCSV, handleDownloadChiefJSON, !aiData?.chiefPackage)}
                            <button onClick={() => runSingleAi('chief')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                                {runningAction === 'chief' ? '選定中...' : '🔄 パイプラインを再実行'}
                            </button>
                        </div>
                    </div>

                    {aiData?.chiefPackage?.strategyBlueprint && (
                        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-lg mb-2">
                            <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                                <span className="text-sm">🤖</span>
                                <h3 className="text-sm font-bold text-emerald-300">今週の自己適応編成方針 (RSI)</h3>
                            </div>
                            <p className="text-xs text-white font-bold mb-1.5">
                                {aiData.chiefPackage.strategyBlueprint.headline}
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                                <span className="font-bold text-emerald-400 mr-1">📝 分析根拠:</span>
                                {aiData.chiefPackage.strategyBlueprint.adaptationRationale}
                            </p>
                        </div>
                    )}

                    {aiData?.chiefPackage ? (
                        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold block mb-1">
                                        Selected MVP Highlight
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
                                </div>
                            </div>

                            {aiData.chiefPackage.contentCalendar && aiData.chiefPackage.contentCalendar.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-800 pb-1.5">
                                        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                            <span>📅</span> 選定コンテンツ一覧
                                        </h4>
                                        <span className="text-[10px] text-slate-400">Gate 1 検算 合格品</span>
                                    </div>
                                    <div className="space-y-3">
                                        {aiData.chiefPackage.contentCalendar.map((dailyItem: any, cIdx: number) => (
                                            <div key={cIdx} className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 space-y-3 hover:border-amber-500/40 transition shadow-sm">
                                                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                                                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                                                        <span className="text-amber-400">📌</span> {DAY_LABELS[dailyItem.dayOfWeek] || dailyItem.dayOfWeek}
                                                    </span>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 shadow-sm">
                                                        {dailyItem.postType}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs">
                                                    {(dailyItem.items || []).map((sub: any, subIdx: number) => (
                                                        <div key={subIdx} className="bg-slate-900/60 p-2.5 rounded border border-slate-800/40 flex flex-col justify-between space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <span className="font-bold text-slate-200 line-clamp-1 truncate w-[130px]" title={sub.selectedCardOrTopic}>
                                                                    {sub.selectedCardOrTopic}
                                                                </span>
                                                                <span className="text-[9px] font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded uppercase text-slate-400 border border-slate-700">
                                                                    {sub.region}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className="bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                                                                    <span className="text-[9px] text-emerald-400 font-bold block mb-0.5">📢 無料フック（Fact）</span>
                                                                    <p className="text-[10px] text-emerald-100 leading-snug">{sub.hookFact}</p>
                                                                </div>
                                                                <div className="bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                                                                    <span className="text-[9px] text-rose-400 font-bold block mb-0.5">🔒 秘匿指示（Action）</span>
                                                                    <p className="text-[10px] text-rose-200 leading-snug truncate">{sub.hiddenActionReason || '仕入れ理由は非公開'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-bold text-slate-300 mb-1.5">⚖️ キュレーター全体選定理由</h4>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    {aiData.chiefPackage.mvpHighlight?.selectionReason || aiData.chiefPackage.selectionReason || '流動性と粗利マージンを総合勘案して選定'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだ選定が行われていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* 🛡️ 品質・規約監査役デスク（Gate 2 配信コンテンツ規約専任） */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_audit' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🛡️</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">品質・規約監査役デスク</h2>
                                <p className="text-xs text-slate-400">Gate 2（配信コンテンツ表現・撒き餌原則・機密漏洩・CTA導線）最終監査結果</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-bold font-mono">
                                全承認: {gate2Audits.filter(a => a.status === 'passed').length} / {gate2Audits.length}
                            </span>
                            {renderExportButtons(handleDownloadGate2CSV, handleDownloadGate2JSON, gate2Audits.length === 0)}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                            <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
                                <span>🔍</span> SNS 配信原稿 監査レポート一覧
                            </h3>
                            <span className="text-xs text-slate-400">「答えを教えない撒き餌原則」および仕入れ先ワード漏洩の厳格審査</span>
                        </div>

                        {gate2Audits.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-8 text-center">監査レコードはまだありません</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                                {gate2Audits.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white uppercase flex items-center gap-1.5">
                                                <span>{item.platform === 'instagram' ? '📸' : '🐦'}</span>
                                                <span>{item.platform} 配信原稿</span>
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                item.status === 'passed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {item.status === 'passed' ? '✔ 配信承認' : '✖ 修正要請'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex justify-between">
                                            <span>対象曜日: <span className="text-slate-300 font-bold">{DAY_LABELS[item.day] || item.day}</span></span>
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
            {/* ⚖️💎 アービトラージ監査担当 デスク (Gate 1-A) */}
            {/* ========================================================= */}
            {(aiActiveDesk === 'desk_arbitrage_audit' || (aiActiveDesk.startsWith('desk_arbitrage') && isArbAudit)) && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">⚖️</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white">アービトラージ監査担当</h2>
                                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold font-mono">
                                        Gate 1-A
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-bold font-mono">
                                全検算合致: {allArbAudits.filter(a => a.status === 'passed').length} / {allArbAudits.length} 件
                            </span>
                            {allArbAudits.length > 0 && renderExportButtons(handleDownloadArbAuditCSV, handleDownloadArbAuditJSON)}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(['us', 'eu', 'asia'] as const).map(reg => {
                            const regAudits = allArbAudits.filter(a => a.region?.toLowerCase() === reg);
                            const passedCount = regAudits.filter(a => a.status === 'passed').length;
                            const regLabel = reg === 'us' ? '北米市場 (75商品)' : reg === 'eu' ? '欧州市場 (75商品)' : 'アジア市場 (75商品)';
                            return (
                                <div key={reg} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-md">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-300">{regLabel}</span>
                                        <span className="font-mono text-emerald-400 font-bold">{passedCount} / {regAudits.length} 合格</span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                            style={{ width: `${regAudits.length > 0 ? (passedCount / regAudits.length) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                                <span>📋</span> 全225商品 四則検算 監査詳細一覧
                            </h3>
                            <span className="text-xs text-slate-400">見込売価 - 日本仕入値 ＝ 粗利差額 / ROIの完全整合チェック</span>
                        </div>

                        {allArbAudits.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-8 text-center">監査レコードはまだありません（全リサーチ実行後に表示されます）</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                                {allArbAudits.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-white truncate max-w-[200px]">{item.card}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                item.status === 'passed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {item.status === 'passed' ? '✔ 検算OK' : '✖ 差額異常'}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex justify-between">
                                            <span className="truncate max-w-[180px]">{item.slot}</span>
                                            <div className="flex gap-2">
                                                {item.priceTier && <span className="text-slate-400">帯: {item.priceTier}</span>}
                                                <span className="font-mono text-slate-300 uppercase">地域: {item.region}</span>
                                            </div>
                                        </div>
                                        {item.feedback && (
                                            <div className="bg-red-500/10 p-2.5 rounded border border-red-500/20 mt-1">
                                                <span className="text-[10px] text-red-400 font-bold block mb-1">💬 検算不一致指摘</span>
                                                <p className="text-[11px] text-red-200 leading-relaxed whitespace-pre-wrap">{item.feedback}</p>
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
            {/* 💎 アービトラージアナリスト (北米 / 欧州 / アジア 各担当デスク) */}
            {/* ========================================================= */}
            {aiActiveDesk.startsWith('desk_arbitrage') && !isArbAudit && safeArbRegion && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💎</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">アービトラージアナリスト ({safeArbRegion === 'us' ? '北米' : safeArbRegion === 'eu' ? '欧州' : 'アジア'})</h2>
                            </div>
                        </div>
                        <button onClick={() => runSingleAi('arbitrage', safeArbRegion)} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                            {runningAction === `arbitrage_${safeArbRegion}` ? '査定中...' : '🔄 パイプラインを再実行'}
                        </button>
                    </div>
                    <DocumentReportView report={activeArbReport} accentColor="emerald" icon="⚖️" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 📊 IG アナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_account' && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📊</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">IG アナリスト</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {renderExportButtons(handleDownloadIgAnalystCSV, handleDownloadIgAnalystJSON, !aiData?.accountInsights)}
                            <button onClick={() => runSingleAi('account')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                                {runningAction === 'account' ? '分析中...' : '🔄 パイプラインを再実行'}
                            </button>
                        </div>
                    </div>
                    <DocumentReportView report={aiData?.accountInsights || null} accentColor="pink" icon="📱" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 📈 X アナリスト */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x_account' && (
                <div className="w-full space-y-5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📈</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">X アナリスト</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {renderExportButtons(handleDownloadXAnalystCSV, handleDownloadXAnalystJSON, !aiData?.xAccountInsights)}
                            <button onClick={() => runSingleAi('x_account')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                                {runningAction === 'x_account' ? '分析中...' : '🔄 パイプラインを再実行'}
                            </button>
                        </div>
                    </div>
                    <DocumentReportView report={aiData?.xAccountInsights || null} accentColor="sky" icon="📈" />
                </div>
            )}

            {/* ========================================================= */}
            {/* 🎨 IG クリエイター（投稿プレビュー統合） */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_sns' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🎨</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">IG クリエイター</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {renderExportButtons(handleDownloadIgCreatorCSV, handleDownloadIgCreatorJSON, !aiData?.snsPosts)}
                            <button onClick={() => runSingleAi('sns')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                                {runningAction === 'sns' ? '制作中...' : '🔄 パイプラインを再実行'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                        {dynamicIgDays.map(d => (
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
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                            <div className="xl:col-span-7 space-y-5">
                                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-xl">
                                    <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] uppercase font-mono tracking-widest text-pink-400 font-bold block mb-1">
                                                {DAY_LABELS[selectedIgDay]} Posting Slot
                                            </span>
                                            <h3 className="text-base font-bold text-white">{currentIgDaily?.theme || aiData.snsPosts.theme}</h3>
                                        </div>
                                        <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                                            推奨: {aiData.snsPosts.recommendedTiming || '日本時間 21:00'}
                                        </span>
                                    </div>

                                    {igImageUrl && (
                                        <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30 flex justify-between items-center">
                                            <div className="text-xs text-emerald-300 flex items-center gap-2">
                                                <span>🖼️</span>
                                                <span className="font-bold">インフォグラフィック画像が生成されました</span>
                                            </div>
                                            <a
                                                href={igImageUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-white font-bold transition flex items-center gap-1 shadow-md"
                                            >
                                                👁️ 画像プレビュー
                                            </a>
                                        </div>
                                    )}

                                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                        <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                                            <span>🖼️</span> カルーセル画像スライド構成指示（全{igSlides.length}枚）
                                        </h4>
                                        <div className="space-y-1.5 text-xs text-slate-300">
                                            {igSlides.map((s: string, i: number) => {
                                                const parts = s.includes(':') ? s.split(':') : [s.slice(0, 6), s.slice(6)];
                                                const label = parts[0];
                                                const desc = parts.slice(1).join(':');
                                                const isSelected = currentIgSlideIdx === i;
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => setCurrentIgSlideIdx(i)}
                                                        className={`p-2 rounded cursor-pointer transition flex items-start gap-2 border ${
                                                            isSelected ? 'bg-pink-950/40 border-pink-500/50 text-white' : 'hover:bg-slate-900/80 border-transparent text-slate-400'
                                                        }`}
                                                    >
                                                        <span className={`font-bold shrink-0 font-mono text-[11px] ${i === 0 ? 'text-pink-400' : 'text-slate-300'}`}>
                                                            {label}:
                                                        </span>
                                                        <span className="text-[11px] leading-relaxed">{desc}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {aiData?.snsPosts?.hashtags && aiData.snsPosts.hashtags.length > 0 && (
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                                                    <span>🏷️</span> 推奨ハッシュタグ
                                                </h4>
                                                <button
                                                    onClick={() => handleCopy(aiData?.snsPosts?.hashtags?.join(' ') || '', 'ig_tags')}
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
                                            <h4 className="text-xs font-bold text-white">📝 【{DAY_LABELS[selectedIgDay]}】投稿キャプション全文</h4>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(igPostText, `ig_${selectedIgDay}`)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">
                                                    {copiedKey === `ig_${selectedIgDay}` ? '✓ コピー完了' : 'コピー'}
                                                </button>
                                                {(() => {
                                                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                                                    const info = currentIgDaily?.infographicData;
                                                    const currentCardTitle = info?.cardName || aiData?.chiefPackage?.mvpHighlight?.cardName || 'Featured Card';
                                                    const params = new URLSearchParams({
                                                        type: selectedIgDay,
                                                        cardName: currentCardTitle,
                                                        jpPrice: info?.jpPrice || '',
                                                        overseasPrice: info?.overseasPrice || '',
                                                        spread: info?.spread || '',
                                                        roi: info?.roi || '',
                                                        hookText: info?.hookText || '',
                                                    });
                                                    const slide1Url = `${baseUrl}/api/og?${params.toString()}`;
                                                    const slide2Url = `${baseUrl}/api/og?type=cta`;
                                                    const carouselSlideImages = [slide1Url, slide2Url];

                                                    return (
                                                        <button
                                                            onClick={() => handlePublishToInstagram(igPostText, selectedIgDay, carouselSlideImages)}
                                                            disabled={Boolean(isPublishingInstagram)}
                                                            className="text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold px-3 py-1 rounded-lg shadow-md transition active:scale-95 disabled:opacity-50"
                                                        >
                                                            {isPublishingInstagram === selectedIgDay ? '投稿中...' : '📸 IGへ自動投稿'}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans border border-slate-800 max-h-56 overflow-y-auto leading-relaxed">
                                            {igPostText || 'この曜日の投稿はまだ作成されていません。'}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="xl:col-span-5 flex flex-col items-center">
                                <div className="w-full max-w-[360px] bg-black rounded-[32px] border-[5px] border-slate-700 shadow-2xl overflow-hidden text-white font-sans text-xs">
                                    <div className="h-5 bg-black flex justify-between items-center px-6 pt-1 text-[10px] text-slate-400 font-mono">
                                        <span>21:00</span>
                                        <div className="w-16 h-3 bg-slate-900 rounded-full mx-auto" />
                                        <span>5G 100%</span>
                                    </div>

                                    <div className="p-3 flex items-center justify-between border-b border-slate-900 bg-slate-950/80">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-[2px]">
                                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs">
                                                    ⚡
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs flex items-center gap-1">
                                                    <span>worldwide_tcg</span>
                                                    <span className="text-[10px] text-sky-400">●</span>
                                                </div>
                                                <div className="text-[9px] text-slate-400">Tokyo, Japan</div>
                                            </div>
                                        </div>
                                        <span className="text-slate-400 text-sm">•••</span>
                                    </div>

                                    <div className="relative aspect-square w-full bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 flex flex-col justify-between p-4 border-y border-slate-900 select-none overflow-hidden">
                                        <div className="self-end z-10">
                                            <span className="bg-black/70 backdrop-blur text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700 text-slate-200">
                                                {currentIgSlideIdx + 1} / {igSlides.length}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-center my-auto px-2 relative z-10">
                                            {currentIgSlideIdx === 0 ? (
                                                <div className="space-y-3">
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono text-[9px] uppercase font-bold tracking-wider">
                                                        COVER HOOK SLIDE
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-white leading-snug drop-shadow-md">
                                                        {currentIgDaily?.theme || aiData.snsPosts.theme}
                                                    </h4>
                                                    <div className="text-[10px] text-amber-300 font-bold bg-slate-950/80 p-2 rounded-lg border border-amber-500/30 mx-auto max-w-[240px]">
                                                        {igSlides[0]?.replace(/^.*?:\s*/, '')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] font-bold">
                                                        SLIDE {currentIgSlideIdx + 1}
                                                    </span>
                                                    <p className="text-xs text-slate-200 leading-relaxed font-bold bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                                                        {igSlides[currentIgSlideIdx]?.replace(/^.*?:\s*/, '')}
                                                    </p>
                                                    {currentIgSlideIdx === igSlides.length - 1 && (
                                                        <div className="pt-2 flex justify-center gap-1.5">
                                                            <span className="text-[9px] bg-blue-600/80 text-white px-2 py-0.5 rounded font-bold">
                                                                自社代理購入 ➔
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {currentIgSlideIdx === 0 && igImageUrl && (
                                            <div
                                                className="absolute inset-0 opacity-40 z-0 bg-cover bg-center"
                                                style={{ backgroundImage: `url('${igImageUrl}')` }}
                                            />
                                        )}

                                        <div className="absolute inset-y-0 left-1 flex items-center z-10">
                                            {currentIgSlideIdx > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentIgSlideIdx(prev => Math.max(0, prev - 1))}
                                                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xs shadow-md backdrop-blur"
                                                >
                                                    ◀
                                                </button>
                                            )}
                                        </div>
                                        <div className="absolute inset-y-0 right-1 flex items-center z-10">
                                            {currentIgSlideIdx < igSlides.length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentIgSlideIdx(prev => Math.min(igSlides.length - 1, prev + 1))}
                                                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xs shadow-md backdrop-blur"
                                                >
                                                    ▶
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex justify-center gap-1 self-center z-10">
                                            {igSlides.map((_, dotIdx) => (
                                                <div
                                                    key={dotIdx}
                                                    className={`h-1.5 rounded-full transition-all ${
                                                        currentIgSlideIdx === dotIdx ? 'w-4 bg-pink-500' : 'w-1.5 bg-slate-600'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3 text-base">
                                            <span>🤍</span>
                                            <span>💬</span>
                                            <span>↗️</span>
                                        </div>
                                        <span className="text-base text-amber-400">🔖</span>
                                    </div>

                                    <div className="px-3 pb-4 space-y-1 text-[11px] leading-snug">
                                        <div className="text-[10px] font-bold text-slate-300">
                                            いいね！ 342件
                                        </div>
                                        <div>
                                            <span className="font-bold mr-1.5 text-white">worldwide_tcg</span>
                                            <span className="text-slate-300 whitespace-pre-wrap line-clamp-4">
                                                {igPostText}
                                            </span>
                                        </div>
                                        {aiData?.snsPosts?.hashtags && (
                                            <p className="text-[10px] text-sky-400/90 line-clamp-1 font-mono">
                                                {aiData.snsPosts.hashtags.join(' ')}
                                            </p>
                                        )}
                                        <div className="text-[9px] text-slate-500 uppercase pt-1">
                                            1時間前 • 翻訳を見る
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだInstagram投稿が生成されていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* ✍️ X クリエイター（スレッドプレビュー統合） */}
            {/* ========================================================= */}
            {aiActiveDesk === 'desk_x' && (
                <div className="w-full space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">✍️</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">X クリエイター</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {renderExportButtons(handleDownloadXCreatorCSV, handleDownloadXCreatorJSON, !aiData?.xPosts)}
                            <button onClick={() => runSingleAi('x_posts')} disabled={Boolean(runningAction)} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md transition">
                                {runningAction === 'x_posts' || runningAction === 'x' ? '制作中...' : '🔄 パイプラインを再実行'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                        {dynamicXDays.map(d => (
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
                                <span className="text-[10px] opacity-70 font-mono truncate max-w-[100px]">({d.desc})</span>
                            </button>
                        ))}
                    </div>

                    {aiData?.xPosts ? (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                            <div className="xl:col-span-7 space-y-5">
                                <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-xl">
                                    <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-bold block mb-1">
                                                {DAY_LABELS[selectedXDay]} Viral Thread
                                            </span>
                                            <h3 className="text-base font-bold text-white">{aiData.xPosts.theme}</h3>
                                        </div>
                                    </div>

                                    {xImageUrl && (
                                        <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30 flex justify-between items-center">
                                            <div className="text-xs text-emerald-300 flex items-center gap-2">
                                                <span>🖼️</span>
                                                <span className="font-bold">インフォグラフィック画像が生成されました</span>
                                            </div>
                                            <a
                                                href={xImageUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-white font-bold transition flex items-center gap-1 shadow-md"
                                            >
                                                👁️ 画像プレビュー
                                            </a>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-sky-300">📌 1ポスト目（140字フック）</h4>
                                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                                    xMainPost.length <= 140 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                }`}>
                                                    {xMainPost.length} / 140文字
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(xMainPost, `x_main_${selectedXDay}`)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-slate-300">
                                                    {copiedKey === `x_main_${selectedXDay}` ? '✓ コピー完了' : 'コピー'}
                                                </button>
                                                <button
                                                    onClick={() => handlePublishToX(xMainPost, xThreadPosts, xImageUrl)}
                                                    disabled={isPublishingX}
                                                    className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1 rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1 transition active:scale-95"
                                                >
                                                    {isPublishingX ? '投稿中...' : `🐦 【${DAY_LABELS[selectedXDay]}】スレッド自動投稿`}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-950 rounded-lg text-xs text-white font-mono border border-sky-500/30 leading-relaxed">
                                            {xMainPost || 'この曜日のスレッドはまだ作成されていません。'}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-300">🧵 スレッド展開 (2〜4ポスト目)</h4>
                                        {xThreadPosts.map((tp: string, idx: number) => (
                                            <div key={idx} className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 border border-slate-800 space-y-1">
                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                    <span>Post {idx + 2} ({tp.length}文字)</span>
                                                    <button onClick={() => handleCopy(tp, `x_thread_${selectedXDay}_${idx}`)} className="hover:text-white">
                                                        {copiedKey === `x_thread_${selectedXDay}_${idx}` ? '✓ コピー' : 'コピー'}
                                                    </button>
                                                </div>
                                                <p className="leading-relaxed whitespace-pre-wrap">{tp}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="xl:col-span-5 flex flex-col items-center">
                                <div className="w-full max-w-[400px] bg-black border border-slate-800 rounded-2xl p-4 shadow-2xl text-white font-sans text-xs space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                                        <span className="font-bold flex items-center gap-1.5">
                                            <span className="text-base text-white">𝕏</span> タイムライン・スレッド表示
                                        </span>
                                        <span className="text-[10px] text-slate-500">最新アルゴリズム適合</span>
                                    </div>

                                    <div className="space-y-3 relative">
                                        {xThreadPosts.length > 0 && (
                                            <div className="absolute left-4 top-10 bottom-[-16px] w-[2px] bg-slate-800" />
                                        )}

                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-sm">
                                                ⚡
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-white text-xs truncate">Worldwide TCG</span>
                                                    <span className="text-sky-400 text-[10px]">☑</span>
                                                    <span className="text-slate-500 text-[11px]">@worldwide_tcg</span>
                                                    <span className="text-slate-500 text-[11px]">· 1m</span>
                                                </div>
                                                <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">
                                                    {xMainPost}
                                                </p>

                                                <div
                                                    className="mt-2.5 rounded-xl overflow-hidden border border-slate-800/80 aspect-square bg-slate-950 bg-cover bg-center"
                                                    style={xImageUrl ? { backgroundImage: `url('${xImageUrl}')` } : {}}
                                                >
                                                    {!xImageUrl && (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                            画像データなし
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-center text-slate-500 text-xs mt-2.5 pt-1 px-1">
                                                    <span className="hover:text-sky-400 cursor-pointer">💬 12</span>
                                                    <span className="hover:text-green-400 cursor-pointer">🔁 45</span>
                                                    <span className="hover:text-pink-400 cursor-pointer">❤️ 189</span>
                                                    <span className="hover:text-sky-400 cursor-pointer">🔖 82</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {xThreadPosts.map((threadText: string, tIdx: number) => {
                                        const isLast = tIdx === xThreadPosts.length - 1;
                                        return (
                                            <div key={tIdx} className="space-y-2 relative pt-1">
                                                {!isLast && (
                                                    <div className="absolute left-4 top-10 bottom-[-16px] w-[2px] bg-slate-800" />
                                                )}
                                                <div className="flex items-start gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-xs text-slate-400">
                                                        {tIdx + 2}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-white text-xs">Worldwide TCG</span>
                                                            <span className="text-slate-500 text-[11px]">@worldwide_tcg</span>
                                                        </div>
                                                        <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                                                            {threadText}
                                                        </p>
                                                        <div className="flex justify-between items-center text-slate-500 text-[11px] mt-2 pt-1 px-1">
                                                            <span>💬 4</span>
                                                            <span>🔁 18</span>
                                                            <span>❤️ 67</span>
                                                            <span>🔖 34</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">まだX投稿が生成されていません。「🚀 全AIに一斉調査・発信制作を指示」を実行してください。</div>
                    )}
                </div>
            )}
        </>
    );
}