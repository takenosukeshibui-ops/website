// app/[lang]/inventory/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { addToCart } from '@/app/actions/items';
import { useFormStatus } from 'react-dom';

function AddToCartButton({ isEn }: { isEn: boolean }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
        >
            {pending ? (isEn ? 'Adding...' : '追加中...') : (isEn ? 'Add to Cart' : 'カートに追加')}
        </button>
    );
}

export default function InventoryPage(props: { params: Promise<{ lang: string }> }) {
    const { lang } = use(props.params);
    const isEn = lang === 'en';

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
                <Link href={`/${lang}`} className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1">
                    {isEn ? '← Back to Home' : '← ホームへ戻る'}
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{isEn ? 'Inventory' : '取扱商品'}</h1>
                    </div>

                    <div className="w-full md:w-64">
                        <input
                            type="text"
                            placeholder={isEn ? 'Search items...' : '商品名で検索...'}
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
                                <th className="p-3 font-semibold">{isEn ? 'Product Name' : '商品名'}</th>
                                <th className="p-3 font-semibold text-right">{isEn ? 'Price' : '販売価格'}</th>
                                <th className="p-3 font-semibold text-center w-32">{isEn ? 'Action' : '操作'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-400">{isEn ? 'Loading...' : '読み込み中...'}</td>
                                </tr>
                            ) : filteredRarities.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-400">
                                        {searchQuery ? (isEn ? 'No items match your search.' : '検索条件に一致する商品はありません') : (isEn ? 'No inventory data found.' : '登録された商品データはありません')}
                                    </td>
                                </tr>
                            ) : (
                                filteredRarities.map((r, i) => {
                                    const sellPriceVal = Number(r.sell_price || 0);

                                    return (
                                        <tr key={r.id || i} className="border-b border-slate-100 last:border-none hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-medium text-slate-800">{r.name}</td>
                                            <td className="p-3 text-right font-mono font-bold text-blue-700">
                                                ¥{sellPriceVal.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-center">
                                               <form action={addToCart}>
                                                   <input type="hidden" name="url" value={`inhouse://${r.id}`} />
                                                   <input type="hidden" name="title" value={r.name} />
                                                   <input type="hidden" name="desiredPrice" value={sellPriceVal} />
                                                   <input type="hidden" name="quantity" value="1" />
                                                   <input type="hidden" name="isInhouse" value="true" />
                                                   <AddToCartButton isEn={isEn} />
                                               </form>
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