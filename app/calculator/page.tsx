// app/calculator/page.tsx
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
    { code: 'SE', name: 'スウェーデン (Sweden)' },
    { code: 'BE', name: 'ベルギー (Belgium)' },
    { code: 'AT', name: 'オーストリア (Austria)' },
    { code: 'DK', name: 'デンマーク (Denmark)' },
    { code: 'FI', name: 'フィンランド (Finland)' },
    { code: 'NO', name: 'ノルウェー (Norway)' },
    { code: 'IE', name: 'アイルランド (Ireland)' },
    { code: 'PT', name: 'ポルトガル (Portugal)' },
    { code: 'PL', name: 'ポーランド (Poland)' },
    { code: 'CZ', name: 'チェコ (Czech Republic)' },
    { code: 'HU', name: 'ハンガリー (Hungary)' },
    { code: 'RO', name: 'ルーマニア (Romania)' },
    { code: 'GR', name: 'ギリシャ (Greece)' },
    { code: 'NZ', name: 'ニュージーランド (New Zealand)' },
    { code: 'MX', name: 'メキシコ (Mexico)' },
    { code: 'BR', name: 'ブラジル (Brazil)' },
    { code: 'AR', name: 'アルゼンチン (Argentina)' },
    { code: 'CL', name: 'チリ (Chile)' },
    { code: 'CO', name: 'コロンビア (Colombia)' },
    { code: 'PE', name: 'ペルー (Peru)' },
    { code: 'AE', name: 'アラブ首長国連邦 (UAE)' },
    { code: 'SA', name: 'サウジアラビア (Saudi Arabia)' },
    { code: 'IL', name: 'イスラエル (Israel)' },
    { code: 'TR', name: 'トルコ (Turkey)' },
    { code: 'EG', name: 'エジプト (Egypt)' },
    { code: 'ZA', name: '南アフリカ (South Africa)' },
    { code: 'JP', name: '日本 (Japan)' },
];

const CURRENCIES = [
    { code: 'JPY', symbol: '¥', label: 'JPY (日本円)' },
    { code: 'USD', symbol: '$', label: 'USD (米ドル)' },
    { code: 'EUR', symbol: '€', label: 'EUR (ユーロ)' },
    { code: 'GBP', symbol: '£', label: 'GBP (英ポンド)' },
    { code: 'CAD', symbol: 'CA$', label: 'CAD (カナダドル)' },
    { code: 'AUD', symbol: 'A$', label: 'AUD (豪ドル)' },
    { code: 'SGD', symbol: 'S$', label: 'SGD (シンガポールドル)' },
    { code: 'HKD', symbol: 'HK$', label: 'HKD (香港ドル)' },
    { code: 'CHF', symbol: 'CHF ', label: 'CHF (スイスフラン)' },
    { code: 'CNY', symbol: 'CN¥', label: 'CNY (人民元)' },
    { code: 'TWD', symbol: 'NT$', label: 'TWD (台湾ドル)' },
    { code: 'KRW', symbol: '₩', label: 'KRW (韓国ウォン)' },
    { code: 'NZD', symbol: 'NZ$', label: 'NZD (NZドル)' },
    { code: 'THB', symbol: '฿', label: 'THB (タイバーツ)' },
    { code: 'PHP', symbol: '₱', label: 'PHP (フィリピンペソ)' },
    { code: 'MXN', symbol: 'MX$', label: 'MXN (メキシコペソ)' },
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
                    {filteredCountries.length > 0 ? (
                        filteredCountries.map((country) => (
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
                        ))
                    ) : (
                        <li className="px-3 py-2 text-slate-400 text-center">該当する国が見つかりません</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default function UserShippingCalculatorPage() {
    const [destination, setDestination] = useState("US");
    const [weightKg, setWeightKg] = useState("1.0");
    const [targetCurrency, setTargetCurrency] = useState("JPY");

    const [apiLoading, setApiLoading] = useState(false);
    const [japanPostData, setJapanPostData] = useState<any>(null);
    const [fedexRatesList, setFedexRatesList] = useState<any[]>([]);
    const [exchangeRateInfo, setExchangeRateInfo] = useState<any>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const parsedWeight = parseFloat(weightKg) || 0;

    useEffect(() => {
        if (parsedWeight <= 0) return;

        const timer = setTimeout(async () => {
            setApiLoading(true);
            setApiError(null);

            try {
                const res = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        destination,
                        weight: parsedWeight,
                        targetCurrency
                    })
                });

                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`APIエラー (${res.status})`);
                }

                const data = await res.json();

                if (data.success) {
                    setJapanPostData(data.japanPost);
                    setFedexRatesList(data.fedexRates || []);
                    setExchangeRateInfo(data.exchangeRateInfo || null);
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
        }, 500);

        return () => clearTimeout(timer);
    }, [destination, parsedWeight, targetCurrency]);

    const currentSymbol = CURRENCIES.find(c => c.code === targetCurrency)?.symbol || '¥';

    const formatAmount = (amount: number) => {
        if (targetCurrency === 'JPY' || targetCurrency === 'KRW') {
            return `${currentSymbol}${Math.round(amount).toLocaleString()}`;
        }
        return `${currentSymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const sortedFedexRatesList = useMemo(() => {
        return [...fedexRatesList].sort((a, b) => a.total - b.total);
    }, [fedexRatesList]);

    const formattedInvertedRate = useMemo(() => {
        if (!exchangeRateInfo?.rate || exchangeRateInfo.rate === 0) return null;
        const jpyPerUnit = 1 / exchangeRateInfo.rate;
        return jpyPerUnit >= 100 
            ? jpyPerUnit.toFixed(2) 
            : jpyPerUnit.toFixed(4);
    }, [exchangeRateInfo]);

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-xs">
            <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center border-b pb-3">
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">国際送料シミュレーター</h1>
                    </div>
                    <Link href="/dashboard" className="text-blue-600 hover:underline font-bold text-[11px] whitespace-nowrap">
                        ← マイページへ
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">仕向国</label>
                        <CountryCombobox value={destination} onChange={setDestination} />
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1">重量</label>
                        <div className="relative flex items-center">
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                                className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                placeholder="1.0"
                            />
                            <span className="absolute right-3 text-slate-500 font-bold pointer-events-none text-xs">
                                kg
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1">表示通貨</label>
                        <select
                            value={targetCurrency}
                            onChange={(e) => setTargetCurrency(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-1">
                        <span className="font-bold text-slate-800">送料一覧</span>
                        
                        {targetCurrency !== 'JPY' && formattedInvertedRate && !apiLoading && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                適用レート: 1 {targetCurrency} = {formattedInvertedRate} JPY
                            </span>
                        )}

                        {apiLoading && <span className="text-blue-600 font-bold animate-pulse">運賃算出中...</span>}
                    </div>

                    {apiLoading ? (
                        <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-lg bg-slate-50">
                            最新の運賃・為替レートを取得中...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* 日本郵便（船便） */}
                            {japanPostData && japanPostData.total !== null && (
                                <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs gap-3">
                                    <div className="shrink-0">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            <span>⏱️</span>
                                            <span>{japanPostData.deliveryDays}</span>
                                        </span>
                                    </div>
                                    <div className="font-bold text-slate-800 flex-1 truncate">
                                        <span>{japanPostData.serviceName}</span>
                                        {/* [NEW] 30kg超の分割計算内訳表示 */}
                                        {japanPostData.note && (
                                            <span className="block text-[10px] text-blue-600 font-normal">
                                                {japanPostData.note}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right font-bold font-mono text-slate-900 text-base sm:text-lg min-w-[100px] shrink-0">
                                        {formatAmount(japanPostData.total)}
                                    </div>
                                </div>
                            )}

                            {/* FedExプラン群 */}
                            {sortedFedexRatesList.length > 0 && (
                                <div className="border border-amber-300/80 bg-amber-50/30 rounded-xl p-3 space-y-2">
                                    <div className="text-amber-950 font-bold text-xs border-b border-amber-200/60 pb-1 flex justify-between items-center">
                                        <span>FedEx</span>
                                        <span className="text-[10px] text-amber-800 font-normal">全{sortedFedexRatesList.length}プラン (安い順)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {sortedFedexRatesList.map((fRate, idx) => (
                                            <div key={idx} className="p-3 bg-white hover:bg-amber-50/80 rounded-lg border border-amber-200 flex items-center justify-between transition-colors shadow-2xs gap-3">
                                                <div className="shrink-0">
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                        <span>🚀</span>
                                                        <span>{fRate.deliveryDays}</span>
                                                    </span>
                                                </div>
                                                <div className="font-bold text-amber-950 flex-1 truncate">
                                                    {fRate.serviceName}
                                                </div>
                                                <div className="text-right font-bold font-mono text-amber-950 text-base sm:text-lg min-w-[100px] shrink-0">
                                                    {formatAmount(fRate.total)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {japanPostData?.error && (
                                <p className="text-[10px] text-rose-500">※日本郵便: {japanPostData.error}</p>
                            )}
                            {apiError && (
                                <p className="text-[10px] text-rose-500">※FedEx: {apiError}</p>
                            )}

                            {!japanPostData && fedexRatesList.length === 0 && !apiLoading && (
                                <div className="p-8 text-center text-slate-400 border border-slate-200 rounded-lg">
                                    重量・仕向国を指定すると送料が一覧表示されます
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                    ※表示結果はあくまで試算（見積もり）であり、実際の梱包サイズや発送タイミングによって金額が多少前後する場合があります。
                </p>
            </div>
        </main>
    );
}