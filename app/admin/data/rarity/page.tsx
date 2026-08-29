// app/admin/data/rarity/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RarityPage() {
    const [rarities, setRarities] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [weight, setWeight] = useState('');
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
                weight: parseFloat(weight || '0'),
            }),
        });

        setName('');
        setPrice('');
        setWeight('');
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
        <main className="min-h-screen bg-zinc-50 p-4 md:p-8 text-xs space-y-4">
            {/* ナビゲーションバー [NEW] */}
            <div className="max-w-xl mx-auto flex items-center justify-between gap-2 pb-2">
                <Link href="/admin/data" className="text-blue-600 hover:underline font-bold">
                    ← マスタ管理ハブへ戻る
                </Link>
                <Link href="/admin/profit" className="text-emerald-700 hover:underline font-bold">
                    📊 利益計算ダッシュボードへ
                </Link>
            </div>

            <div className="mx-auto max-w-xl bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-zinc-900">レアリティ管理</h1>
                </div>

                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
                    <input
                        type="text"
                        placeholder="名前 (例: Rare)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-zinc-300 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                    />
                    <input
                        type="number"
                        placeholder="単価 (円)"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-zinc-300 text-zinc-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                    />
                    <input
                        type="number"
                        placeholder="重量 (g)"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-zinc-300 text-zinc-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="submit" className="h-10 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-colors">
                        追加
                    </button>
                </form>

                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-zinc-900 text-xs">
                        <thead>
                            <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500">
                                <th className="p-3 font-semibold">名前</th>
                                <th className="p-3 font-semibold text-right">単価</th>
                                <th className="p-3 font-semibold text-right">重量 (g)</th>
                                <th className="p-3 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-zinc-400">読み込み中...</td>
                                </tr>
                            ) : rarities.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-zinc-400">登録されたレアリティデータはありません</td>
                                </tr>
                            ) : (
                                rarities.map((r, i) => (
                                    <tr key={r.id || i} className="border-b border-zinc-100 last:border-none hover:bg-zinc-50 transition-colors">
                                        <td className="p-3 font-medium">{r.name}</td>
                                        <td className="p-3 text-right font-mono">¥{Number(r.price).toLocaleString()}</td>
                                        <td className="p-3 text-right font-mono">{r.weight || 0} g</td>
                                        <td className="p-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(r.id, r.name)}
                                                className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-[11px] font-bold transition-colors"
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