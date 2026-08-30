// app/admin/data/rarity/page.tsx
// [UPDATED] レアリティ・商品個別追加ページ (在庫数 stock 追加)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RarityPage() {
    const [rarities, setRarities] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [tax, setTax] = useState('10');
    const [weight, setWeight] = useState('');
    const [stock, setStock] = useState('0'); // [NEW] 在庫数初期値
    const [loading, setLoading] = useState(true);

    const fetchRarities = () => {
        setLoading(true);
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                setRarities(data?.rarities || []);
            })
            .catch(err => console.error("データ取得エラー:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchRarities();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) return;

        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'rarity',
                name,
                price: parseFloat(price),
                tax: parseFloat(tax || '0'),
                weight: parseFloat(weight || '0'),
                stock: parseInt(stock || '0', 10), // [NEW] 在庫数
            }),
        });

        setName('');
        setPrice('');
        setTax('10');
        setWeight('');
        setStock('0');
        fetchRarities();
    };

    const handleDelete = async (id: number, rarityName: string) => {
        if (!confirm(`「${rarityName}」を削除してもよろしいですか？`)) return;

        await fetch(`/api/data?type=rarity&id=${id}`, {
            method: 'DELETE',
        });

        fetchRarities();
    };

    return (
        <main className="min-h-screen bg-zinc-50 p-3 text-xs space-y-3">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-2 pb-1">
                <Link href="/admin/data" className="text-blue-600 hover:underline font-bold">
                    ← マスタ管理ハブへ戻る
                </Link>
                <Link href="/admin/profit" className="text-emerald-700 hover:underline font-bold">
                    📊 利益計算ダッシュボードへ
                </Link>
            </div>

            <div className="mx-auto max-w-xl bg-white p-4 rounded-lg shadow-2xs border border-zinc-200 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h1 className="text-sm font-bold text-zinc-900">レアリティ・商品マスタ登録</h1>
                </div>

                <form onSubmit={handleAdd} className="space-y-3 bg-zinc-50 p-3 rounded border border-zinc-200">
                    <h2 className="font-bold text-zinc-700 text-xs">＋ 新規登録</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <input
                            type="text"
                            placeholder="商品名 (例: PSA10)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="number"
                            placeholder="単価 (円)"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="number"
                            step="0.1"
                            placeholder="消費税 (%)"
                            value={tax}
                            onChange={e => setTax(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            placeholder="重量 (g)"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {/* [NEW] 在庫数入力欄 */}
                        <input
                            type="number"
                            placeholder="初期在庫数"
                            value={stock}
                            onChange={e => setStock(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="h-8 px-4 bg-zinc-900 text-white rounded font-bold hover:bg-zinc-800 transition-colors">
                            追加保存
                        </button>
                    </div>
                </form>

                <div className="border border-zinc-200 rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-zinc-900">
                        <thead>
                            <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500">
                                <th className="p-2 font-semibold">名称</th>
                                <th className="p-2 font-semibold text-right">単価</th>
                                <th className="p-2 font-semibold text-right">消費税</th>
                                <th className="p-2 font-semibold text-right">重量</th>
                                <th className="p-2 font-semibold text-right">在庫数</th>
                                <th className="p-2 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-zinc-400">読み込み中...</td>
                                </tr>
                            ) : rarities.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-zinc-400">データがありません</td>
                                </tr>
                            ) : (
                                rarities.map((r, i) => (
                                    <tr key={r.id || i} className="border-b border-zinc-100 last:border-none hover:bg-zinc-50 transition-colors">
                                        <td className="p-2 font-medium">{r.name}</td>
                                        <td className="p-2 text-right font-mono">¥{Number(r.price).toLocaleString()}</td>
                                        <td className="p-2 text-right font-mono">{r.tax ?? 0}%</td>
                                        <td className="p-2 text-right font-mono">{r.weight || 0}g</td>
                                        <td className="p-2 text-right font-mono font-bold text-blue-700">{r.stock || 0}個</td>
                                        <td className="p-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(r.id, r.name)}
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
        </main>
    );
}