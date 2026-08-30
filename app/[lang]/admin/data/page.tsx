// app/admin/data/page.tsx
// [UPDATED] 原価列を削除し、「商品名、販売価格、仕入れ単価、消費税率、利益率、利益額、重量、在庫数」の並び順に変更
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDataPage() {
    const [rarities, setRarities] = useState<any[]>([]);
    const [fees, setFees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = () => {
        setLoading(true);
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                setRarities((data?.rarities || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
                setFees((data?.fees || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
            })
            .catch(err => console.error("データ取得エラー:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateStock = async (id: number, newStock: number) => {
        const targetStock = Math.max(0, newStock);

        setRarities(prev => prev.map(r => r.id === id ? { ...r, stock: targetStock } : r));

        try {
            await fetch('/api/data', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'rarity_stock',
                    id,
                    stock: targetStock
                })
            });
        } catch (err) {
            console.error('在庫数更新エラー:', err);
            fetchData();
        }
    };

    const handleDeleteRarity = async (id: number, rarityName: string) => {
        if (!confirm(`「${rarityName}」を削除してもよろしいですか？`)) return;

        await fetch(`/api/data?type=rarity&id=${id}`, {
            method: 'DELETE',
        });

        fetchData();
    };

    const handleDeleteFee = async (id: number, feeName: string) => {
        if (!confirm(`「${feeName}」を削除してもよろしいですか？`)) return;

        await fetch(`/api/data?type=fee&id=${id}`, {
            method: 'DELETE',
        });

        fetchData();
    };

    return (
        <main className="p-4 max-w-7xl mx-auto text-xs space-y-4">
            <div className="flex pb-3 border-b border-zinc-200">
                <Link href="/admin" className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-bold transition-colors">
                    ← 管理者ダッシュボードへ戻る
                </Link>
            </div>

            <div className="flex justify-between items-center mb-2">
                <h1 className="text-lg font-bold text-zinc-900">マスタデータ管理ハブ</h1>
            </div>

            <div className="w-full bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
                {loading ? (
                    <div className="text-center py-6 text-zinc-400">読み込み中...</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* [UPDATED] 並び順: 商品名, 販売価格, 仕入れ単価, 消費税率, 利益率, 利益額, 重量, 在庫数 */}
                        <div className="lg:col-span-8 border border-zinc-200 rounded-lg overflow-hidden">
                            <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-200 font-bold text-zinc-700 flex justify-between items-center">
                                <span>レアリティ・商品マスタ管理</span>
                                <Link href="/admin/data/rarity" className="text-blue-600 hover:underline text-[11px] font-bold">
                                    ＋ 編集・個別追加
                                </Link>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-100/70 text-zinc-500 border-b border-zinc-200">
                                    <tr>
                                        <th className="p-2 font-semibold">商品名</th>
                                        <th className="p-2 font-semibold text-right">販売価格</th>
                                        <th className="p-2 font-semibold text-right">仕入れ単価</th>
                                        <th className="p-2 font-semibold text-right">消費税率</th>
                                        <th className="p-2 font-semibold text-right">利益率</th>
                                        {/* [NEW] 利益額カラム */}
                                        <th className="p-2 font-semibold text-right">利益額</th>
                                        <th className="p-2 font-semibold text-right">重量</th>
                                        <th className="p-2 font-semibold text-center w-32">在庫数</th>
                                        <th className="p-2 font-semibold text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 font-medium">
                                    {rarities.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-4 text-center text-zinc-400">データがありません</td>
                                        </tr>
                                    ) : (
                                        rarities.map((r) => {
                                            const buyPrice = Number(r.price || 0);
                                            const tax = Number(r.tax || 0);
                                            const sellPrice = Number(r.sell_price || 0);
                                            // 実質原価（仕入れ単価 - 消費税還付分）
                                            const effectiveCost = buyPrice - Math.floor(buyPrice * (tax / 100));
                                            // 利益額 = 販売価格 - 実質原価（販売価格未設定時は0）
                                            const profitAmount = sellPrice > 0 ? (sellPrice - effectiveCost) : 0;

                                            return (
                                                <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                                                    {/* 1. 商品名 */}
                                                    <td className="p-2 font-medium">{r.name}</td>
                                                    {/* 2. 販売価格 */}
                                                    <td className="p-2 text-right font-mono text-blue-700">¥{sellPrice.toLocaleString()}</td>
                                                    {/* 3. 仕入れ単価 */}
                                                    <td className="p-2 text-right font-mono">¥{buyPrice.toLocaleString()}</td>
                                                    {/* 4. 消費税率 */}
                                                    <td className="p-2 text-right font-mono">{r.tax ?? 0}%</td>
                                                    {/* 5. 利益率 */}
                                                    <td className="p-2 text-right font-mono text-emerald-700">
                                                        {r.profit_rate || 0}%
                                                        <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-zinc-100 text-zinc-600 font-normal">
                                                            {r.profit_type === 'sales' ? '売上比' : '仕入れ比'}
                                                        </span>
                                                    </td>
                                                    {/* 6. 利益額 [NEW] */}
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-600">
                                                        ¥{profitAmount.toLocaleString()}
                                                    </td>
                                                    {/* 7. 重量 */}
                                                    <td className="p-2 text-right font-mono">{r.weight || 0}g</td>

                                                    {/* 8. 在庫数 */}
                                                    <td className="p-1.5 text-center">
                                                        <div className="inline-flex items-center justify-center gap-1 bg-zinc-50 p-1 border border-zinc-200 rounded-lg">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateStock(r.id, (r.stock || 0) - 1)}
                                                                className="w-5 h-5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded font-bold text-xs flex items-center justify-center transition-colors"
                                                                title="1減らす"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={r.stock ?? 0}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value, 10);
                                                                    setRarities(prev => prev.map(item => item.id === r.id ? { ...item, stock: isNaN(val) ? 0 : val } : item));
                                                                }}
                                                                onBlur={(e) => {
                                                                    const val = parseInt(e.target.value, 10);
                                                                    handleUpdateStock(r.id, isNaN(val) ? 0 : val);
                                                                }}
                                                                className="w-12 text-center border border-zinc-300 rounded h-5 text-xs font-mono font-bold bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateStock(r.id, (r.stock || 0) + 1)}
                                                                className="w-5 h-5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded font-bold text-xs flex items-center justify-center transition-colors"
                                                                title="1増やす"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </td>

                                                    <td className="p-2 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteRarity(r.id, r.name)}
                                                            className="px-2 py-0.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold transition-colors"
                                                        >
                                                            削除
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 手数料管理 */}
                        <div className="lg:col-span-4 border border-zinc-200 rounded-lg overflow-hidden h-fit">
                            <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-200 font-bold text-zinc-700 flex justify-between items-center">
                                <span>手数料管理</span>
                                <Link href="/admin/data/rarity/fee" className="text-blue-600 hover:underline text-[11px] font-bold">
                                    ＋ 編集・個別追加
                                </Link>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-100/70 text-zinc-500 border-b border-zinc-200">
                                    <tr>
                                        <th className="p-2 font-semibold">名称</th>
                                        <th className="p-2 font-semibold text-right">手数料率</th>
                                        <th className="p-2 font-semibold text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 font-medium">
                                    {fees.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-4 text-center text-zinc-400">データがありません</td>
                                        </tr>
                                    ) : (
                                        fees.map((f) => (
                                            <tr key={f.id} className="hover:bg-zinc-50 transition-colors">
                                                <td className="p-2 font-medium">{f.name}</td>
                                                <td className="p-2 text-right font-mono">{f.rate}%</td>
                                                <td className="p-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFee(f.id, f.name)}
                                                        className="px-2 py-0.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold transition-colors"
                                                    >
                                                        削除
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}