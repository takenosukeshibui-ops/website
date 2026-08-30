// app/admin/profit/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { countries } from '@/components/countries';

const CountryCombobox = ({ value, onChange }: { value: string; onChange: (code: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredCountries = useMemo(() => {
        if (!query) return countries;
        const lowerQuery = query.toLowerCase();
        return countries.filter(
            (c) => c.code.toLowerCase().includes(lowerQuery) || c.name.toLowerCase().includes(lowerQuery)
        );
    }, [query]);

    const selectedCountry = countries.find((c) => c.code === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <input
                type="text"
                className="w-full h-9 px-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="国名/コード"
                value={isOpen ? query : (selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : "")}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    setQuery("");
                    setIsOpen(true);
                }}
            />
            {isOpen && (
                <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg text-xs">
                    {filteredCountries.map((country) => (
                        <li
                            key={country.code}
                            className="px-2.5 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-900 border-b border-slate-50 last:border-0"
                            onClick={() => {
                                onChange(country.code);
                                setIsOpen(false);
                                setQuery("");
                            }}
                        >
                            {country.name} ({country.code})
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default function AdminProfitPage() {
    // レアリティ（商品）マスタ一覧用 State [NEW]
    const [masterRarities, setMasterRarities] = useState<any[]>([]);
    const [selectedRarityId, setSelectedRarityId] = useState<string>('');

    // 計算用フォーム State [UPDATED]
    const [productName, setProductName] = useState(''); // [NEW] 商品名
    const [profitRate, setProfitRate] = useState('15');
    const [feeRate, setFeeRate] = useState('3.6');
    const [unitPrice, setUnitPrice] = useState('3000');
    const [taxRate, setTaxRate] = useState('10'); // [NEW] 消費税率(%)
    const [quantity, setQuantity] = useState('1');
    const [weightKg, setWeightKg] = useState('0.5');
    const [destination, setDestination] = useState('US');

    const [apiLoading, setApiLoading] = useState(false);
    const [shippingFeeJp, setShippingFeeJp] = useState<number | null>(null);
    const [fedexRatesList, setFedexRatesList] = useState<any[]>([]); 
    const [fedexApiError, setFedexApiError] = useState<string | null>(null);

    // [NEW] マスタデータ（レアリティ一覧）の取得
    useEffect(() => {
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                setMasterRarities(data?.rarities || []);
            })
            .catch(err => console.error("マスタデータ取得エラー:", err));
    }, []);

    // [NEW] レアリティ（商品）選択時にフォーム値を自動入力
    const handleSelectRarity = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedRarityId(id);

        if (!id) return;

        const target = masterRarities.find(r => String(r.id) === String(id));
        if (target) {
            setProductName(target.name || '');
            setUnitPrice(String(target.price ?? '0'));
            setTaxRate(String(target.tax ?? '10'));
            // 重量(g)をkg単位に換算 (/1000)
            const kgVal = (Number(target.weight || 0) / 1000).toFixed(3);
            setWeightKg(String(parseFloat(kgVal)));
        }
    };

    const parsedQty = parseInt(quantity.replace(/[^0-9]/g, '') || '0', 10);
    const parsedPrice = parseFloat(unitPrice.replace(/[^0-9.]/g, '') || '0');
    const parsedTaxRate = parseFloat(taxRate.replace(/[^0-9.]/g, '') || '0');
    
    // [UPDATED] 消費税を考慮した仕入れ原価小計・消費税額・原価合計
    const subtotalPrice = parsedPrice * parsedQty;
    const taxAmount = Math.floor(subtotalPrice * (parsedTaxRate / 100));
    const totalPrice = subtotalPrice + taxAmount; // 税込仕入れ原価合計

    const parsedWeight = parseFloat(weightKg) || 0;

    useEffect(() => {
        if (parsedWeight <= 0) return;

        const timer = setTimeout(async () => {
            setApiLoading(true);
            setFedexApiError(null);

            try {
                const res = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        destination,
                        weight: parsedWeight,
                        targetCurrency: 'JPY',
                        isEstimate: true 
                    })
                });

                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`サーバーエラー (${res.status})`);
                }

                const data = await res.json();

                if (data.success) {
                    setShippingFeeJp(data.japanPost?.total ?? null);
                    setFedexRatesList(data.fedexRates || []); 
                    setFedexApiError(data.fedexError || null);
                } else {
                    setFedexApiError(data.error || '計算エラーが発生しました');
                }
            } catch (err: any) {
                console.error("送料計算 API エラー:", err);
                setFedexApiError("APIの呼び出しに失敗しました");
            } finally {
                setApiLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [destination, parsedWeight]);

    const calculateProfitRow = (shippingFee: number) => {
        const targetRate = (parseFloat(profitRate) || 0) / 100;
        const feeRatio = (parseFloat(feeRate) || 0) / 100;
        const denominator = 1 - targetRate - feeRatio;

        if (denominator <= 0) return { sellPrice: 0, profit: 0 };

        // 税込仕入れ原価 (totalPrice) + 送料 を基準に計算
        const sellPrice = (totalPrice + shippingFee) / denominator;
        const profit = sellPrice * targetRate;

        return {
            sellPrice: Math.round(sellPrice),
            profit: Math.round(profit)
        };
    };

    const jpCalculation = useMemo(() => {
        if (totalPrice <= 0 || parsedWeight <= 0 || shippingFeeJp === null) return null;
        return calculateProfitRow(shippingFeeJp);
    }, [totalPrice, parsedWeight, shippingFeeJp, profitRate, feeRate]);

    return (
        <main className="p-6 max-w-6xl mx-auto text-xs space-y-4">
            <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-200">
                <Link href="/admin" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold transition-colors">
                    ← 管理画面トップ
                </Link>
                <Link href="/admin/data" className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-bold transition-colors">
                    ⚙️ マスタ管理ハブ
                </Link>
                <Link href="/calculator" target="_blank" className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-bold transition-colors ml-auto">
                    ↗ ユーザー用シミュレーター確認
                </Link>
            </div>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">管理者用 利益・送料自動計算ダッシュボード</h1>
                    <p className="text-slate-500 mt-1">FedEx API（全適用プラン）/ 日本郵便料金と連動したリアルタイム試算</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-slate-700 border-b pb-2">試算条件設定</h2>
                    
                    {/* [NEW] マスタ登録商品からの自動セット機能 */}
                    <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                        <label className="block text-[11px] font-bold text-blue-900">
                            📦 マスタ登録商品からセット
                        </label>
                        <select
                            value={selectedRarityId}
                            onChange={handleSelectRarity}
                            className="w-full h-8 px-2 rounded border border-blue-300 text-slate-900 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">-- マスタ商品を選択して自動入力 --</option>
                            {masterRarities.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name} (単価: ¥{Number(r.price).toLocaleString()} / 税: {r.tax}% / {r.weight}g)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">目標利益率 (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={profitRate}
                                onChange={e => setProfitRate(e.target.value)}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">想定決済手数料率 (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={feeRate}
                                onChange={e => setFeeRate(e.target.value)}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* [NEW] 商品名入力項目 */}
                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">商品名 (任意)</label>
                        <input
                            type="text"
                            placeholder="例: ポケモンカード PSA10"
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            className="w-full h-9 px-2 rounded border border-slate-300 font-medium bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* [UPDATED] 単価・消費税率・数量 */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">仕入れ単価 (円)</label>
                            <input
                                type="number"
                                value={unitPrice}
                                onChange={e => setUnitPrice(e.target.value)}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">消費税 (%)</label> {/* [NEW] */}
                            <input
                                type="number"
                                step="0.1"
                                value={taxRate}
                                onChange={e => setTaxRate(e.target.value)}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">数量</label>
                            <input
                                type="text"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">仕向国</label>
                            <CountryCombobox value={destination} onChange={setDestination} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">総重量 (kg)</label>
                            <input
                                type="number"
                                step="0.001"
                                value={weightKg}
                                onChange={e => setWeightKg(e.target.value)}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* [UPDATED] 税抜き・消費税額・税込合計の表示 */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-slate-500 text-[11px]">
                            <span>仕入れ小計 (税抜):</span>
                            <span className="font-mono">¥{subtotalPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 text-[11px]">
                            <span>仕入れ消費税額 ({parsedTaxRate}%):</span>
                            <span className="font-mono">¥{taxAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-slate-700 font-bold">仕入れ原価合計 (税込):</span>
                            <span className="text-base font-bold font-mono text-slate-900">¥{totalPrice.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-700 text-sm">
                            全配送プラン比較 {productName && <span className="text-blue-700 font-normal">({productName})</span>}
                        </span>
                        {apiLoading ? (
                            <span className="text-blue-600 text-[11px] font-bold animate-pulse">運賃計算中...</span>
                        ) : (
                            <span className="text-emerald-600 text-[11px] font-bold">✓ API取得完了 ({fedexRatesList.length + (shippingFeeJp ? 1 : 0)}件)</span>
                        )}
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="p-3">配送プラン名</th>
                                <th className="p-3 text-right">API送料</th>
                                <th className="p-3 text-right">推奨販売価格</th>
                                <th className="p-3 text-right">想定利益額</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {shippingFeeJp !== null && jpCalculation && (
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-bold text-slate-800">日本郵便 (船便)</td>
                                    <td className="p-3 text-right font-mono text-slate-600">¥{shippingFeeJp.toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">¥{jpCalculation.sellPrice.toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono font-bold text-emerald-600 text-sm">¥{jpCalculation.profit.toLocaleString()}</td>
                                </tr>
                            )}

                            {fedexRatesList.map((fRate, i) => {
                                const calc = calculateProfitRow(fRate.total);
                                return (
                                    <tr key={i} className="bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
                                        <td className="p-3 font-bold text-amber-950">
                                            {fRate.serviceName}
                                        </td>
                                        <td className="p-3 text-right font-mono text-amber-900">
                                            ¥{fRate.total.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-right font-mono font-bold text-amber-950 text-sm">
                                            ¥{calc.sellPrice.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-right font-mono font-bold text-emerald-600 text-sm">
                                            ¥{calc.profit.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}

                            {fedexApiError && (
                                <tr>
                                    <td colSpan={4} className="p-3 bg-red-50 text-red-600 text-center text-[11px]">
                                        ⚠️ FedEx: {fedexApiError}
                                    </td>
                                </tr>
                            )}

                            {shippingFeeJp === null && fedexRatesList.length === 0 && !apiLoading && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                        条件を入力すると利用可能な全プランが表示されます
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}