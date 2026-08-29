// [UPDATED]
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';

const ALL_COUNTRIES = [
    { code: 'US', name: 'アメリカ (United States)' },
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
    { code: 'TH', name: 'タイ (Thailand)' },
    { code: 'MY', name: 'マレーシア (Malaysia)' },
    { code: 'PH', name: 'フィリピン (Philippines)' },
    { code: 'VN', name: 'ベトナム (Vietnam)' },
    { code: 'ID', name: 'インドネシア (Indonesia)' },
    { code: 'IN', name: 'インド (India)' },
    { code: 'NL', name: 'オランダ (Netherlands)' },
    { code: 'IT', name: 'イタリア (Italy)' },
    { code: 'ES', name: 'スペイン (Spain)' },
    { code: 'CH', name: 'スイス (Switzerland)' },
    { code: 'JP', name: '日本 (Japan)' },
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
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="国名やコードで検索..."
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
                <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg text-xs">
                    {filteredCountries.map((country) => (
                        <li
                            key={country.code}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-slate-900 border-b border-slate-50 last:border-0 flex justify-between items-center"
                            onClick={() => {
                                onChange(country.code);
                                setIsOpen(false);
                                setQuery("");
                            }}
                        >
                            <span className="font-medium">{country.name}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{country.code}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default function UserShippingCalculatorPage() {
    const [destination, setDestination] = useState("US");
    const [weightKg, setWeightKg] = useState("10");

    const [apiLoading, setApiLoading] = useState(false);
    const [japanPostData, setJapanPostData] = useState<any>(null);
    const [fedexRatesList, setFedexRatesList] = useState<any[]>([]);
    const [apiError, setApiError] = useState<string | null>(null);

    const parsedWeight = parseFloat(weightKg) || 0;

    const handleCalculate = async () => {
        if (parsedWeight <= 0) return;

        setApiLoading(true);
        setApiError(null);

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

            const data = await res.json();

            if (data.success) {
                setJapanPostData(data.japanPost);
                setFedexRatesList(data.fedexRates || []);
                if (data.fedexError) setApiError(data.fedexError);
            } else {
                setApiError(data.error || "送料の計算に失敗しました");
            }
        } catch (err: any) {
            console.error("送料取得エラー:", err);
            setApiError("送料の自動取得に失敗しました");
        } finally {
            setApiLoading(false);
        }
    };

    useEffect(() => {
        handleCalculate();
    }, [destination]);

    const formatAmount = (amount: number) => {
        return `¥${Math.round(amount).toLocaleString()}`;
    };

    const sortedFedexRatesList = useMemo(() => {
        return [...fedexRatesList].sort((a, b) => a.total - b.total);
    }, [fedexRatesList]);

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-xs">
            <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center border-b pb-3">
                    <h1 className="text-xl font-bold text-slate-800">国際送料・概算試算シミュレーター</h1>
                    <Link href="/dashboard" className="text-blue-600 hover:underline font-bold text-[11px]">
                        ← マイページへ
                    </Link>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">配送先の国 (Destination Country)</label>
                        <CountryCombobox value={destination} onChange={setDestination} />
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1">商品重量 (Weight / kg)</label>
                        <div className="relative flex items-center">
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="10"
                            />
                            <span className="absolute right-3 text-slate-500 font-bold pointer-events-none text-xs">
                                kg
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleCalculate}
                        disabled={apiLoading}
                        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {apiLoading ? '計算中...' : '🚀 送料を試算する'}
                    </button>
                </div>

                {/* 計算結果一覧 */}
                <div className="space-y-3 pt-2">
                    <h2 className="font-bold text-slate-800 text-sm border-b pb-1">計算結果</h2>

                    {apiLoading ? (
                        <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-lg bg-slate-50">
                            最新の運賃を取得中...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* [NEW] 日本郵便 (船便) の独立表示 */}
                            {japanPostData && japanPostData.total !== null && (
                                <div className="p-4 bg-white rounded-lg border border-blue-200 flex items-center justify-between shadow-2xs">
                                    <div>
                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-block mb-1">
                                            お届け目安: {japanPostData.deliveryDays}
                                        </span>
                                        <div className="font-bold text-slate-800 text-sm">
                                            {japanPostData.serviceName}
                                        </div>
                                        {japanPostData.note && (
                                            <span className="text-[10px] text-blue-600 font-normal block">
                                                {japanPostData.note}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right font-bold font-mono text-slate-900 text-lg">
                                        {formatAmount(japanPostData.total)}
                                    </div>
                                </div>
                            )}

                            {/* [NEW] FedEx全配送プラン一覧（安い順） */}
                            {sortedFedexRatesList.length > 0 && (
                                <div className="space-y-2">
                                    {sortedFedexRatesList.map((fRate, idx) => (
                                        <div key={idx} className="p-4 bg-white rounded-lg border border-purple-200 flex items-center justify-between shadow-2xs">
                                            <div>
                                                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full inline-block mb-1">
                                                    お届け目安: {fRate.deliveryDays}
                                                </span>
                                                <div className="font-bold text-purple-950 text-sm">
                                                    {fRate.serviceName}
                                                </div>
                                            </div>
                                            <div className="text-right font-bold font-mono text-purple-950 text-lg">
                                                {formatAmount(fRate.total)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {apiError && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                                    ⚠️ {apiError}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}