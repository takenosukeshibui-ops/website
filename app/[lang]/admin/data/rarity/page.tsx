// app/[lang]/admin/data/rarity/page.tsx
// [UPDATED] 「📊 利益計算ダッシュボードへ」ボタンを削除
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RarityPage() {
    const [rarities, setRarities] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [sellPrice, setSellPrice] = useState(''); // 販売価格
    const [price, setPrice] = useState(''); // 仕入れ単価
    const [tax, setTax] = useState('10'); // 消費税率
    const [profitRate, setProfitRate] = useState(''); // 利益率
    const [profitType, setProfitType] = useState<'cost' | 'sales'>('cost'); // 利益率タイプ
    const [weight, setWeight] = useState(''); // 重量
    const [stock, setStock] = useState('0'); // 在庫数
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
                sell_price: parseFloat(sellPrice || '0'),
                tax: parseFloat(tax || '0'),
                profit_rate: parseFloat(profitRate || '0'),
                profit_type: profitType,
                weight: parseFloat(weight || '0'),
                stock: parseInt(stock || '0', 10),
            }),
        });

        setName('');
        setSellPrice('');
        setPrice('');
        setTax('10');
        setProfitRate('');
        setProfitType('cost');
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
            {/* [UPDATED] 利益計算ダッシュボードボタンを削除し、戻るリンクのみに変更 */}
            <div className="max-w-5xl mx-auto flex items-center justify-start gap-2 pb-1">
                <Link href="/admin/data" className="text-blue-600 hover:underline font-bold">
                    ← マスタ管理ハブへ戻る
                </Link>
            </div>

            <div className="mx-auto max-w-5xl bg-white p-4 rounded-lg shadow-2xs border border-zinc-200 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h1 className="text-sm font-bold text-zinc-900">レアリティ・商品マスタ登録</h1>
                </div>

                <form onSubmit={handleAdd} className="space-y-3 bg-zinc-50 p-3 rounded border border-zinc-200">
                    <h2 className="font-bold text-zinc-700 text-xs">＋ 新規登録</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                        {/* 1. 商品名 */}
                        <input
                            type="text"
                            placeholder="商品名 (例: PSA10)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                        {/* 2. 販売価格 */}
                        <input
                            type="number"
                            placeholder="販売価格 (円)"
                            value={sellPrice}
                            onChange={e => setSellPrice(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {/* 3. 仕入れ単価 */}
                        <input
                            type="number"
                            placeholder="仕入れ単価 (円)"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                        {/* 4. 消費税率 */}
                        <input
                            type="number"
                            step="0.1"
                            placeholder="消費税 (%)"
                            value={tax}
                            onChange={e => setTax(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {/* 5-1. 利益率タイプ */}
                        <select
                            value={profitType}
                            onChange={e => setProfitType(e.target.value as 'cost' | 'sales')}
                            className="h-8 px-1 rounded border border-zinc-300 text-zinc-900 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="cost">仕入れ単価比</option>
                            <option value="sales">売上比</option>
                        </select>
                        {/* 5-2. 利益率 */}
                        <input
                            type="number"
                            step="0.1"
                            placeholder="利益率 (%)"
                            value={profitRate}
                            onChange={e => setProfitRate(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {/* 6. 重量 */}
                        <input
                            type="number"
                            placeholder="重量 (g)"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            className="h-8 px-2 rounded border border-zinc-300 text-zinc-900 text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {/* 7. 初期在庫数 */}
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
                                <th className="p-2 font-semibold text-right">販売価格</th>
                                <th className="p-2 font-semibold text-right">仕入れ単価</th>
                                <th className="p-2 font-semibold text-right">消費税率</th>
                                <th className="p-2 font-semibold text-right">利益率</th>
                                <th className="p-2 font-semibold text-right">重量</th>
                                <th className="p-2 font-semibold text-right">在庫数</th>
                                <th className="p-2 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center text-zinc-400">読み込み中...</td>
                                </tr>
                            ) : rarities.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-4 text-center text-zinc-400">データがありません</td>
                                </tr>
                            ) : (
                                rarities.map((r, i) => {
                                    const buyPrice = Number(r.price || 0);
                                    const sellPriceVal = Number(r.sell_price || 0);

                                    return (
                                        <tr key={r.id || i} className="border-b border-zinc-100 last:border-none hover:bg-zinc-50 transition-colors">
                                            {/* 1. 商品名 */}
                                            <td className="p-2 font-medium">{r.name}</td>
                                            {/* 2. 販売価格 */}
                                            <td className="p-2 text-right font-mono text-blue-700">¥{sellPriceVal.toLocaleString()}</td>
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
                                            {/* 6. 重量 */}
                                            <td className="p-2 text-right font-mono">{r.weight || 0}g</td>
                                            {/* 7. 在庫数 */}
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