// app/[lang]/admin/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminInventoryPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // 新規登録用フォーム State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [tax, setTax] = useState('10');
    const [weight, setWeight] = useState('');

    // 編集モード用 State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editTax, setEditTax] = useState('');
    const [editWeight, setEditWeight] = useState('');

    // データ取得
    const fetchInventory = () => {
        setLoading(true);
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                setItems(data?.rarities || []);
            })
            .catch(err => console.error("在庫データ取得エラー:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // 新規追加処理
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
            }),
        });

        setName('');
        setPrice('');
        setTax('10');
        setWeight('');
        fetchInventory();
    };

    // 編集保存処理
    const handleSaveEdit = async (id: number) => {
        if (!editName || !editPrice) return;

        await fetch(`/api/data?type=rarity&id=${id}`, {
            method: 'DELETE',
        });

        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'rarity',
                name: editName,
                price: parseFloat(editPrice),
                tax: parseFloat(editTax || '0'),
                weight: parseFloat(editWeight || '0'),
            }),
        });

        setEditingId(null);
        fetchInventory();
    };

    // 削除処理
    const handleDelete = async (id: number, itemName: string) => {
        if (!confirm(`「${itemName}」を在庫リストから削除してもよろしいですか？`)) return;

        await fetch(`/api/data?type=rarity&id=${id}`, {
            method: 'DELETE',
        });

        fetchInventory();
    };

    // 編集開始
    const startEditing = (item: any) => {
        setEditingId(item.id);
        setEditName(item.name || '');
        setEditPrice(String(item.price ?? '0'));
        setEditTax(String(item.tax ?? '0'));
        setEditWeight(String(item.weight ?? '0'));
    };

    const filteredItems = items.filter(item =>
        !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-xs space-y-4 max-w-5xl mx-auto">
            {/* [UPDATED] ナビゲーションバー（管理者ダッシュボードへ戻るのみに一元化） */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <Link href="/admin" className="text-blue-600 hover:underline font-bold flex items-center gap-1">
                    ← 管理者ダッシュボードへ戻る
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">当社在庫リスト 編集・管理</h1>
                        <p className="text-slate-500 text-[11px] mt-0.5">自社在庫商品の登録・価格・消費税・重量データの更新</p>
                    </div>

                    <div className="w-full md:w-64">
                        <input
                            type="text"
                            placeholder="在庫商品を検索..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* 在庫登録フォーム */}
                <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h2 className="font-bold text-slate-700 text-xs">＋ 新規在庫商品の登録</h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <input
                            type="text"
                            placeholder="商品名 (必須)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-slate-300 text-slate-900 bg-white outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="number"
                            placeholder="仕入れ単価 (円)"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-slate-300 text-slate-900 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="number"
                            step="0.1"
                            placeholder="消費税率 (%)"
                            value={tax}
                            onChange={e => setTax(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-slate-300 text-slate-900 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            placeholder="1枚重量 (g)"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-slate-300 text-slate-900 text-right bg-white outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button type="submit" className="h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors shadow-sm">
                            在庫に追加
                        </button>
                    </div>
                </form>

                {/* 在庫テーブル */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-slate-900 text-xs">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                                <th className="p-3 font-semibold">商品名</th>
                                <th className="p-3 font-semibold text-right">単価 (円)</th>
                                <th className="p-3 font-semibold text-right">消費税率 (%)</th>
                                <th className="p-3 font-semibold text-right">重量 (g)</th>
                                <th className="p-3 font-semibold text-center w-28">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">読み込み中...</td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">登録された在庫データはありません</td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const isEditing = editingId === item.id;
                                    return (
                                        <tr key={item.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50 transition-colors">
                                            <td className="p-2.5">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        className="w-full p-1 border border-slate-300 rounded text-xs"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-slate-800">{item.name}</span>
                                                )}
                                            </td>

                                            <td className="p-2.5 text-right font-mono">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={e => setEditPrice(e.target.value)}
                                                        className="w-24 p-1 border border-slate-300 rounded text-xs text-right font-mono"
                                                    />
                                                ) : (
                                                    `¥${Number(item.price).toLocaleString()}`
                                                )}
                                            </td>

                                            <td className="p-2.5 text-right font-mono">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={editTax}
                                                        onChange={e => setEditTax(e.target.value)}
                                                        className="w-16 p-1 border border-slate-300 rounded text-xs text-right font-mono"
                                                    />
                                                ) : (
                                                    `${item.tax ?? 0}%`
                                                )}
                                            </td>

                                            <td className="p-2.5 text-right font-mono">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editWeight}
                                                        onChange={e => setEditWeight(e.target.value)}
                                                        className="w-16 p-1 border border-slate-300 rounded text-xs text-right font-mono"
                                                    />
                                                ) : (
                                                    `${item.weight || 0} g`
                                                )}
                                            </td>

                                            <td className="p-2.5 text-center">
                                                {isEditing ? (
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveEdit(item.id)}
                                                            className="px-2 py-1 bg-blue-600 text-white rounded font-bold text-[10px]"
                                                        >
                                                            保存
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingId(null)}
                                                            className="px-2 py-1 bg-slate-200 text-slate-600 rounded font-bold text-[10px]"
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditing(item)}
                                                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition-colors"
                                                        >
                                                            編集
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item.id, item.name)}
                                                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[11px] font-bold transition-colors"
                                                        >
                                                            削除
                                                        </button>
                                                    </div>
                                                )}
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