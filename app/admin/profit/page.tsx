// app/admin/profit/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';

const ALL_COUNTRIES = [
    { code: 'US', name: 'アメリカ (United States)' },
    { code: 'JP', name: '日本 (Japan)' },
    { code: 'CA', name: 'カナダ (Canada)' },
    { code: 'GB', name: 'イギリス (United Kingdom)' },
    { code: 'AU', name: 'オーストラリア (Australia)' },
    { code: 'DE', name: 'ドイツ (Germany)' },
    { code: 'FR', name: 'フランス (France)' },
    { code: 'CN', name: '中国 (China)' },
    { code: 'KR', name: '韓国 (South Korea)' },
    { code: 'TW', name: '台湾 (Taiwan)' },
    { code: 'HK', name: '香港 (Hong Kong)' },
    { code: 'SG', name: 'シンガポール (Singapore)' },
    { code: 'NL', name: 'オランダ (Netherlands)' },
    { code: 'IT', name: 'イタリア (Italy)' },
    { code: 'ES', name: 'スペイン (Spain)' },
    { code: 'CH', name: 'スイス (Switzerland)' },
    { code: 'NZ', name: 'ニュージーランド (New Zealand)' },
    { code: 'BR', name: 'ブラジル (Brazil)' },
    { code: 'MX', name: 'メキシコ (Mexico)' },
    { code: 'IN', name: 'インド (India)' },
];

const CountryCombobox = ({ value, onChange }: { value: string; onChange: (code: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredCountries = useMemo(() => {
        if (!query) return ALL_COUNTRIES;
        const lowerQuery = query.toLowerCase();
        return ALL_COUNTRIES.filter(
            (c) => c.code.toLowerCase().includes(lowerQuery) || c.name.toLowerCase().includes(lowerQuery)
        );
    }, [query]);

    const selectedCountry = ALL_COUNTRIES.find((c) => c.code === value);

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
    const [profitRate, setProfitRate] = useState('15');
    const [feeRate, setFeeRate] = useState('3.6');
    const [unitPrice, setUnitPrice] = useState('3000');
    const [quantity, setQuantity] = useState('1');
    const [weightKg, setWeightKg] = useState('0.5');
    const [destination, setDestination] = useState('US');

    const [apiLoading, setApiLoading] = useState(false);
    const [shippingFeeJp, setShippingFeeJp] = useState<number | null>(null);
    const [fedexRatesList, setFedexRatesList] = useState<any[]>([]); // [NEW] 全FedExプラン配列
    const [fedexApiError, setFedexApiError] = useState<string | null>(null);

    const parsedQty = parseInt(quantity.replace(/[^0-9]/g, '') || '0', 10);
    const parsedPrice = parseFloat(unitPrice.replace(/[^0-9.]/g, '') || '0');
    const totalPrice = parsedPrice * parsedQty;
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
                        targetCurrency: 'JPY'
                    })
                });

                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`サーバーエラー (${res.status})`);
                }

                const data = await res.json();

                if (data.success) {
                    setShippingFeeJp(data.japanPost?.total ?? null);
                    setFedexRatesList(data.fedexRates || []); // [UPDATED] 全プラン保持
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

                    <div className="grid grid-cols-2 gap-3">
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
                                step="0.1"
                                value={weightKg}
                                onChange={e => setWeightKg(e.target.value)}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-slate-500 font-medium">仕入れ原価合計:</span>
                        <span className="text-base font-bold font-mono text-slate-900">¥{totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-700 text-sm">全配送プラン比較</span>
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
                            {/* 日本郵便 船便 */}
                            {shippingFeeJp !== null && jpCalculation && (
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-bold text-slate-800">日本郵便 (船便)</td>
                                    <td className="p-3 text-right font-mono text-slate-600">¥{shippingFeeJp.toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">¥{jpCalculation.sellPrice.toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono font-bold text-emerald-600 text-sm">¥{jpCalculation.profit.toLocaleString()}</td>
                                </tr>
                            )}

                            {/* FedExの全適用プランリスト [NEW] */}
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