// app/admin/data/rarity/fee/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FeePage() {
    const [fees, setFees] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchFees = () => {
        setLoading(true);
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                setFees(data?.fees || []);
            })
            .catch(err => console.error("データ取得エラー:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchFees();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !rate) return;

        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'fee',
                name,
                rate: parseFloat(rate),
            }),
        });

        setName('');
        setRate('');
        fetchFees();
    };

    const handleDelete = async (id: number, feeName: string) => {
        if (!confirm(`「${feeName}」を削除してもよろしいですか？`)) return;

        await fetch(`/api/data?type=fee&id=${id}`, {
            method: 'DELETE',
        });

        fetchFees();
    };

    return (
        <main className="min-h-screen bg-zinc-50 p-3 text-xs space-y-3">
            {/* ナビゲーションバー */}
            <div className="max-w-md mx-auto flex items-center justify-between gap-2 pb-1">
                <Link href="/admin/data" className="text-blue-600 hover:underline font-bold">
                    ← マスタ管理ハブへ戻る
                </Link>
                <Link href="/admin/profit" className="text-emerald-700 hover:underline font-bold">
                    📊 利益計算ダッシュボードへ
                </Link>
            </div>

            <div className="mx-auto max-w-md bg-white p-3 rounded-lg shadow-2xs border border-zinc-200">
                <div className="flex justify-between items-center mb-2.5">
                    <h1 className="text-xs font-bold text-zinc-900">手数料管理</h1>
                </div>

                <form onSubmit={handleAdd} className="flex gap-1.5 mb-3 items-center">
                    <input
                        type="text"
                        placeholder="名称 (例: Paypal)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="h-8 px-2 w-[140px] rounded border border-zinc-300 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                    />
                    <input
                        type="number"
                        step="0.01"
                        placeholder="手数料率(%)"
                        value={rate}
                        onChange={e => setRate(e.target.value)}
                        className="h-8 px-2 w-[100px] rounded border border-zinc-300 text-zinc-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                    />
                    <button type="submit" className="h-8 px-3 bg-zinc-900 text-white rounded font-bold hover:bg-zinc-800 ml-auto transition-colors">
                        追加
                    </button>
                </form>

                <div className="border border-zinc-200 rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-zinc-900">
                        <thead>
                            <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500">
                                <th className="p-1.5 font-semibold">名称</th>
                                <th className="p-1.5 font-semibold text-right">手数料率</th>
                                <th className="p-1.5 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-zinc-400">読み込み中...</td>
                                </tr>
                            ) : fees.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-zinc-400">データがありません</td>
                                </tr>
                            ) : (
                                fees.map((f, i) => (
                                    <tr key={f.id || i} className="border-b border-zinc-100 last:border-none hover:bg-zinc-50 transition-colors">
                                        <td className="p-1.5 font-medium">{f.name}</td>
                                        <td className="p-1.5 text-right font-mono">{f.rate}%</td>
                                        <td className="p-1.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(f.id, f.name)}
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