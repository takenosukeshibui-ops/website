import React from 'react';
import { RegionKey, CategoryKey } from '../types';

interface SidebarProps {
    activeCategory: CategoryKey;
    setActiveCategory: (category: CategoryKey) => void;
    aiActiveDesk: string;
    setAiActiveDesk: (desk: string) => void;
    activeTrendRegion: RegionKey;
    setActiveTrendRegion: (region: RegionKey) => void;
    activeArbitrageRegion: RegionKey;
    setActiveArbitrageRegion: (region: RegionKey) => void;
    history: any[];
    selectedRecordId: string | null;
    onSelectHistory: (target: any) => void;
    aiLoading: boolean;
    runningAction: string | null;
}

export default function Sidebar({
    activeCategory, setActiveCategory,
    aiActiveDesk, setAiActiveDesk,
    activeTrendRegion, setActiveTrendRegion,
    activeArbitrageRegion, setActiveArbitrageRegion,
    history, selectedRecordId, onSelectHistory,
    aiLoading, runningAction
}: SidebarProps) {
    return (
        <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🤖</span>
                    <h1 className="text-base font-bold tracking-wider text-slate-100">AI STAFF OFFICE</h1>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">自律進化 11 Agents</span>
            </div>

            {/* 🌟 商材カテゴリー切り替え */}
            <div className="px-3 pt-4 pb-2">
                <select 
                    value={activeCategory} 
                    onChange={(e) => setActiveCategory(e.target.value as CategoryKey)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                >
                    <option value="pokemon">⚡ ポケモンカード部門</option>
                    <option value="onepiece">🏴‍☠️ ワンピースカード部門</option>
                    <option value="yugioh">👁️ 遊戯王OCG部門</option>
                    <option value="figure">🧸 スケールフィギュア部門</option>
                </select>
            </div>

            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 px-2">Command & Desks</h2>

                <div onClick={() => setAiActiveDesk('desk_chief')} className={`border rounded-xl p-2.5 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_chief' ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-500/40' : 'bg-slate-800/60 border-amber-500/30 hover:bg-slate-800/90'}`}>
                    <div className="h-9 w-9 rounded-full bg-amber-500/20 flex items-center justify-center text-lg shrink-0 border border-amber-500/40 text-amber-300">👑</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-amber-200 truncate">チーフマネージャー</p>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold">統括</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">6レポート審査・最優秀選定</p>
                    </div>
                </div>

                <div className="border border-slate-700/60 rounded-xl p-2 bg-slate-900/60">
                    <div className="flex items-center justify-between px-2 py-0.5 text-xs font-bold text-amber-300">
                        <span className="flex items-center gap-1.5"><span>🔮</span> 市場トレンドリサーチチーム</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">3名</span>
                    </div>
                    <div className="mt-1 space-y-1">
                        {([{ key: 'us', label: '北米担当アナリスト', desc: 'eBay / TCG' }, { key: 'eu', label: '欧州担当アナリスト', desc: 'Cardmarket' }, { key: 'asia', label: 'アジア担当アナリスト', desc: 'Shopee' }] as const).map(item => (
                            <button key={item.key} type="button" onClick={() => { setActiveTrendRegion(item.key); setAiActiveDesk(`desk_trend_${item.key}`); }} className={`w-full text-left px-2 py-1 rounded-lg text-xs flex justify-between items-center transition ${aiActiveDesk === `desk_trend_${item.key}` ? 'bg-amber-600 text-white font-bold shadow' : 'text-slate-300 hover:bg-slate-800/80'}`}>
                                <span>{item.label}</span><span className="text-[10px] opacity-60 font-mono">{item.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border border-slate-700/60 rounded-xl p-2 bg-slate-900/60">
                    <div className="flex items-center justify-between px-2 py-0.5 text-xs font-bold text-emerald-300">
                        <span className="flex items-center gap-1.5"><span>💎</span> アービトラージリサーチチーム</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">3名</span>
                    </div>
                    <div className="mt-1 space-y-1">
                        {([{ key: 'us', label: '北米担当アナリスト', desc: '日米・FedEx' }, { key: 'eu', label: '欧州担当アナリスト', desc: '日欧・EMS' }, { key: 'asia', label: 'アジア担当アナリスト', desc: '日亜・Shopee' }] as const).map(item => (
                            <button key={item.key} type="button" onClick={() => { setActiveArbitrageRegion(item.key); setAiActiveDesk(`desk_arbitrage_${item.key}`); }} className={`w-full text-left px-2 py-1 rounded-lg text-xs flex justify-between items-center transition ${aiActiveDesk === `desk_arbitrage_${item.key}` ? 'bg-emerald-600 text-white font-bold shadow' : 'text-slate-300 hover:bg-slate-800/80'}`}>
                                <span>{item.label}</span><span className="text-[10px] opacity-60 font-mono">{item.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Instagram運営グループ */}
                <div className="border border-slate-700/60 rounded-xl p-2 bg-slate-900/60">
                    <div className="flex items-center justify-between px-2 py-0.5 text-xs font-bold text-pink-300">
                        <span className="flex items-center gap-1.5"><span>📸</span> Instagram運営チーム</span>
                        <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1.5 py-0.2 rounded font-mono font-bold">2名</span>
                    </div>
                    <div className="mt-1 space-y-1">
                        <button type="button" onClick={() => setAiActiveDesk('desk_account')} className={`w-full text-left px-2 py-1 rounded-lg text-xs flex justify-between items-center transition ${aiActiveDesk === 'desk_account' ? 'bg-pink-600 text-white font-bold shadow' : 'text-slate-300 hover:bg-slate-800/80'}`}>
                            <span>📊 IG アナリスト</span><span className="text-[10px] opacity-60 font-mono">反応・ファネル分析</span>
                        </button>
                        <button type="button" onClick={() => setAiActiveDesk('desk_sns')} className={`w-full text-left px-2 py-1 rounded-lg text-xs flex justify-between items-center transition ${aiActiveDesk === 'desk_sns' ? 'bg-pink-600 text-white font-bold shadow' : 'text-slate-300 hover:bg-slate-800/80'}`}>
                            <span>🎨 IG クリエイター</span><span className="text-[10px] opacity-60 font-mono">カルーセル・原稿作成</span>
                        </button>
                    </div>
                </div>

                {/* X (Twitter) 運営グループ */}
                <div className="border border-slate-700/60 rounded-xl p-2 bg-slate-900/60">
                    <div className="flex items-center justify-between px-2 py-0.5 text-xs font-bold text-sky-300">
                        <span className="flex items-center gap-1.5"><span>🐦</span> X運営チーム</span>
                        <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono font-bold">2名</span>
                    </div>
                    <div className="mt-1 space-y-1">
                        <button type="button" onClick={() => setAiActiveDesk('desk_x_account')} className={`w-full text-left px-2 py-1 rounded-lg text-xs flex justify-between items-center transition ${aiActiveDesk === 'desk_x_account' ? 'bg-sky-500 text-white font-bold shadow' : 'text-slate-300 hover:bg-slate-800/80'}`}>
                            <span>📈 X アナリスト</span><span className="text-[10px] opacity-60 font-mono">アルゴリズム分析</span>
                        </button>
                        <button type="button" onClick={() => setAiActiveDesk('desk_x')} className={`w-full text-left px-2 py-1 rounded-lg text-xs flex justify-between items-center transition ${aiActiveDesk === 'desk_x' ? 'bg-sky-500 text-white font-bold shadow' : 'text-slate-300 hover:bg-slate-800/80'}`}>
                            <span>✍️ X クリエイター</span><span className="text-[10px] opacity-60 font-mono">140字・スレッド</span>
                        </button>
                    </div>
                </div>

                <div onClick={() => setAiActiveDesk('desk_sales')} className={`border rounded-xl p-2.5 flex items-center gap-3 cursor-pointer transition-all ${aiActiveDesk === 'desk_sales' ? 'bg-purple-500/10 border-purple-500/60 shadow-sm' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'}`}>
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-base shrink-0 border border-slate-700">✉️</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">有料コミュニティ担当</p>
                        <p className="text-[10px] text-slate-400 truncate">Discord大口オファー投稿</p>
                    </div>
                </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900">
                <span className="text-[10px] text-slate-400 mb-1 block font-bold">📅 過去のオフィス記録</span>
                <select value={selectedRecordId || ''} disabled={aiLoading || Boolean(runningAction)} onChange={(e) => {
                    const target = history.find(h => h.id === e.target.value);
                    if (target) onSelectHistory(target);
                }} className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500">
                    {history.map((h) => (
                        <option key={h.id} value={h.id}>
                            {new Date(h.created_at).toLocaleString('ja-JP')} [{h.trigger_type === 'cron' ? '⏰ 自動' : '👤 手動'}]
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}