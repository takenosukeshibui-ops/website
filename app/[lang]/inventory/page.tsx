// app/[lang]/inventory/page.tsx
// [UPDATED] 「現在の在庫数」表示を削除し、表示項目を「商品名」「販売価格」の2列に変更
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
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-xs space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <Link href="/" className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1">
                    ← ホームへ戻る
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">取扱商品</h1>
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
                            {/* [UPDATED] 表示項目を「商品名」「販売価格」の2列に限定 */}
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                                <th className="p-3 font-semibold">商品名</th>
                                <th className="p-3 font-semibold text-right">販売価格</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    {/* [UPDATED] colSpan を 2 に変更 */}
                                    <td colSpan={2} className="p-8 text-center text-slate-400">読み込み中...</td>
                                </tr>
                            ) : filteredRarities.length === 0 ? (
                                <tr>
                                    {/* [UPDATED] colSpan を 2 に変更 */}
                                    <td colSpan={2} className="p-8 text-center text-slate-400">
                                        {searchQuery ? '検索条件に一致する商品はありません' : '登録された商品データはありません'}
                                    </td>
                                </tr>
                            ) : (
                                filteredRarities.map((r, i) => {
                                    const sellPriceVal = Number(r.sell_price || 0);

                                    return (
                                        <tr key={r.id || i} className="border-b border-slate-100 last:border-none hover:bg-slate-50 transition-colors">
                                            {/* 1. 商品名 */}
                                            <td className="p-3 font-medium text-slate-800">{r.name}</td>
                                            {/* 2. 販売価格 */}
                                            <td className="p-3 text-right font-mono font-bold text-blue-700">
                                                ¥{sellPriceVal.toLocaleString()}
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