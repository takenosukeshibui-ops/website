// app/[lang]/inventory/page.tsx
// [UPDATED] 原価列を削除し、指定の並び順（商品名、販売価格、仕入れ単価、消費税率、利益率、利益額、重量、在庫数）に合わせて更新
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InventoryPage() {
    const [rarities, setRarities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                setRarities(data?.rarities || []);
            })
            .catch(err => console.error("データ取得エラー:", err))
            .finally(() => setLoading(false));
    }, []);

    const filteredRarities = rarities.filter(r =>
        !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-xs space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <Link href="/" className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1">
                    ← ホームへ戻る
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">当社在庫リスト</h1>
                        <p className="text-slate-500 text-[11px] mt-0.5">取扱商品・マスタ在庫データ一覧</p>
                    </div>

                    <div className="w-full md:w-64">
                        <input
                            type="text"
                            placeholder="商品名で検索..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-slate-900 text-xs">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                                <th className="p-3 font-semibold">商品名</th>
                                <th className="p-3 font-semibold text-right">販売価格</th>
                                <th className="p-3 font-semibold text-right">仕入れ単価 (参考)</th>
                                <th className="p-3 font-semibold text-right">適用消費税率</th>
                                <th className="p-3 font-semibold text-right">利益率</th>
                                <th className="p-3 font-semibold text-right">利益額</th>
                                <th className="p-3 font-semibold text-right">1枚重量 (g)</th>
                                <th className="p-3 font-semibold text-right">現在の在庫数</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">読み込み中...</td>
                                </tr>
                            ) : filteredRarities.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        {searchQuery ? '検索条件に一致する商品はありません' : '登録された商品データはありません'}
                                    </td>
                                </tr>
                            ) : (
                                filteredRarities.map((r, i) => {
                                    const buyPrice = Number(r.price || 0);
                                    const taxVal = Number(r.tax || 0);
                                    const sellPriceVal = Number(r.sell_price || 0);
                                    const effectiveCost = buyPrice - Math.floor(buyPrice * (taxVal / 100));
                                    const profitAmount = sellPriceVal > 0 ? (sellPriceVal - effectiveCost) : 0;

                                    return (
                                        <tr key={r.id || i} className="border-b border-slate-100 last:border-none hover:bg-slate-50 transition-colors">
                                            {/* 1. 商品名 */}
                                            <td className="p-3 font-medium text-slate-800">{r.name}</td>
                                            {/* 2. 販売価格 */}
                                            <td className="p-3 text-right font-mono font-bold text-blue-700">
                                                ¥{sellPriceVal.toLocaleString()}
                                            </td>
                                            {/* 3. 仕入れ単価 */}
                                            <td className="p-3 text-right font-mono font-bold text-slate-900">
                                                ¥{buyPrice.toLocaleString()}
                                            </td>
                                            {/* 4. 消費税率 */}
                                            <td className="p-3 text-right font-mono text-slate-600">
                                                {r.tax ?? 0}%
                                            </td>
                                            {/* 5. 利益率 */}
                                            <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                                {r.profit_rate || 0}%
                                                <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
                                                    {r.profit_type === 'sales' ? '売上比' : '仕入れ比'}
                                                </span>
                                            </td>
                                            {/* 6. 利益額 */}
                                            <td className="p-3 text-right font-mono font-bold text-emerald-600">
                                                ¥{profitAmount.toLocaleString()}
                                            </td>
                                            {/* 7. 重量 */}
                                            <td className="p-3 text-right font-mono text-slate-600">
                                                {r.weight || 0} g
                                            </td>
                                            {/* 8. 在庫数 */}
                                            <td className="p-3 text-right font-mono font-bold text-blue-700">
                                                {r.stock ?? 0} 個
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}