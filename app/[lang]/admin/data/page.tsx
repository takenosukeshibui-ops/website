// app/admin/data/page.tsx
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
        <main className="p-4 max-w-5xl mx-auto text-xs space-y-4">
            {/* [UPDATED] ナビゲーションバー（管理者ダッシュボードへ戻るのみに一元化） */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-zinc-200 rounded-lg overflow-hidden">
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
                                        <th className="p-2 font-semibold text-right">単価</th>
                                        <th className="p-2 font-semibold text-right">消費税</th>
                                        <th className="p-2 font-semibold text-right">重量 (g)</th>
                                        <th className="p-2 font-semibold text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 font-medium">
                                    {rarities.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-zinc-400">データがありません</td>
                                        </tr>
                                    ) : (
                                        rarities.map((r) => (
                                            <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                                                <td className="p-2 font-medium">{r.name}</td>
                                                <td className="p-2 text-right font-mono">¥{Number(r.price).toLocaleString()}</td>
                                                <td className="p-2 text-right font-mono">{r.tax ?? 0}%</td>
                                                <td className="p-2 text-right font-mono">{r.weight || 0} g</td>
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
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="border border-zinc-200 rounded-lg overflow-hidden">
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