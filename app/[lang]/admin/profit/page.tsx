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
    const [masterRarities, setMasterRarities] = useState<any[]>([]);
    const [masterFees, setMasterFees] = useState<any[]>([]);
    
    const [selectedRarityId, setSelectedRarityId] = useState<string>('');
    const [selectedFeeId, setSelectedFeeId] = useState<string>('');

    const [productName, setProductName] = useState(''); 
    const [profitType, setProfitType] = useState<'cost' | 'sales'>('cost'); 
    const [profitRate, setProfitRate] = useState('15'); 
    const [feeRate, setFeeRate] = useState('3.6'); 
    const [unitPrice, setUnitPrice] = useState(''); 
    const [taxRate, setTaxRate] = useState(''); 
    const [quantity, setQuantity] = useState('1');
    const [weightKg, setWeightKg] = useState(''); 
    const [destination, setDestination] = useState('US');

    // 為替レート取得用 State
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [rateLoading, setRateLoading] = useState<boolean>(true);

    // 内訳の開閉状態管理 State
    const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

    const toggleDetail = (key: string) => {
        setOpenDetails(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [apiLoading, setApiLoading] = useState(false);
    const [shippingFeeJp, setShippingFeeJp] = useState<number | null>(null);
    const [fedexRatesList, setFedexRatesList] = useState<any[]>([]); 
    const [fedexApiError, setFedexApiError] = useState<string | null>(null);

    // 最新の為替レート (USD/JPY) を自動取得
    useEffect(() => {
        setRateLoading(true);
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(res => res.json())
            .then(data => {
                if (data && data.rates && data.rates.JPY) {
                    setExchangeRate(Number(data.rates.JPY));
                } else {
                    setExchangeRate(150); 
                }
            })
            .catch(err => {
                console.error("為替レート取得エラー:", err);
                setExchangeRate(150); 
            })
            .finally(() => setRateLoading(false));
    }, []);

    // マスタデータ（商品・手数料）の取得
    useEffect(() => {
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                setMasterRarities(data?.rarities || []);
                const fees = data?.fees || [];
                setMasterFees(fees);

                if (fees.length > 0) {
                    setSelectedFeeId(String(fees[0].id));
                    setFeeRate(String(fees[0].rate ?? '3.6'));
                }
            })
            .catch(err => console.error("マスタデータ取得エラー:", err));
    }, []);

    // マスタ商品選択または数量変更時に「単価重量 × 数量」で総重量(kg)を自動算出して反映
    useEffect(() => {
        if (!selectedRarityId) return;

        const target = masterRarities.find(r => String(r.id) === String(selectedRarityId));
        if (target && target.weight !== undefined && target.weight !== null) {
            const parsedQ = parseInt(quantity.replace(/[^0-9]/g, '') || '0', 10);
            const totalWeightG = Number(target.weight) * parsedQ;
            const kgVal = (totalWeightG / 1000).toFixed(3);
            setWeightKg(kgVal ? String(parseFloat(kgVal)) : '');
        }
    }, [selectedRarityId, quantity, masterRarities]);

    // マスタ商品選択処理
    const handleSelectRarity = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedRarityId(id);

        if (!id) {
            setProductName('');
            setUnitPrice('');
            setTaxRate('');
            setWeightKg('');
            return;
        }

        const target = masterRarities.find(r => String(r.id) === String(id));
        if (target) {
            setProductName(target.name || '');
            setUnitPrice(target.price !== undefined && target.price !== null ? String(target.price) : '');
            setTaxRate(target.tax !== undefined && target.tax !== null ? String(target.tax) : '');
        }
    };

    // マスタ手数料選択処理
    const handleSelectFee = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedFeeId(id);

        const target = masterFees.find(f => String(f.id) === String(id));
        if (target && target.rate !== undefined) {
            setFeeRate(String(target.rate));
        }
    };

    // 日本円をドル表記文字列に変換するヘルパー
    const formatUsd = (yenAmount: number) => {
        if (!exchangeRate || exchangeRate <= 0) return '';
        const usd = yenAmount / exchangeRate;
        return `($${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    };

    const parsedQty = parseInt(quantity.replace(/[^0-9]/g, '') || '0', 10);
    const parsedPrice = parseFloat(unitPrice.replace(/[^0-9.]/g, '') || '0');
    const parsedTaxRate = parseFloat(taxRate.replace(/[^0-9.]/g, '') || '0');
    
    // 消費税還付計算ロジック
    const subtotalPrice = parsedPrice * parsedQty; 
    const refundTaxAmount = Math.floor(subtotalPrice * (parsedTaxRate / 100)); 
    const effectiveCost = subtotalPrice - refundTaxAmount; 

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
                    setFedexApiError(data.error || null);
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

    // 仕入れ利益率 / 売上利益率 の切り替え対応計算ロジック
    const calculateProfitRow = (shippingFee: number) => {
        const inputRate = (parseFloat(profitRate) || 0) / 100;
        const feeRatio = (parseFloat(feeRate) || 0) / 100;

        let totalAmount = 0; 
        let profit = 0;      
        let costProfitRateDisp = '0.0';  
        let salesProfitRateDisp = '0.0'; 

        if (profitType === 'cost') {
            const denominator = 1 - feeRatio;
            if (denominator <= 0) return { productSellPrice: 0, totalAmount: 0, costProfitAmount: 0, paymentFeeAmount: 0, profit: 0, costProfitRateDisp: '0.0', salesProfitRateDisp: '0.0' };

            const costProfitAmount = Math.round(subtotalPrice * inputRate);
            totalAmount = Math.round((effectiveCost + costProfitAmount + shippingFee) / denominator);
            profit = costProfitAmount;

            costProfitRateDisp = (parseFloat(profitRate) || 0).toFixed(1);
            salesProfitRateDisp = totalAmount > 0 ? ((profit / totalAmount) * 100).toFixed(1) : '0.0';
        } else {
            const denominator = 1 - feeRatio - inputRate;
            if (denominator <= 0) return { productSellPrice: 0, totalAmount: 0, costProfitAmount: 0, paymentFeeAmount: 0, profit: 0, costProfitRateDisp: '0.0', salesProfitRateDisp: '0.0' };

            totalAmount = Math.round((effectiveCost + shippingFee) / denominator);
            profit = Math.round(totalAmount * inputRate);

            salesProfitRateDisp = (parseFloat(profitRate) || 0).toFixed(1);
            costProfitRateDisp = subtotalPrice > 0 ? ((profit / subtotalPrice) * 100).toFixed(1) : '0.0';
        }

        const productSellPrice = totalAmount - shippingFee; 
        const paymentFeeAmount = Math.round(totalAmount * feeRatio);
        const costProfitAmount = profitType === 'cost' 
            ? Math.round(subtotalPrice * inputRate) 
            : profit;

        return {
            productSellPrice,
            totalAmount,
            costProfitAmount,
            paymentFeeAmount,
            profit,
            costProfitRateDisp,
            salesProfitRateDisp
        };
    };

    const jpCalculation = useMemo(() => {
        if (effectiveCost <= 0 || parsedWeight <= 0 || shippingFeeJp === null) return null;
        return calculateProfitRow(shippingFeeJp);
    }, [effectiveCost, parsedWeight, shippingFeeJp, profitRate, feeRate, profitType, subtotalPrice]);

    return (
        <main className="p-6 max-w-6xl mx-auto text-xs space-y-4">
            {/* [UPDATED] 管理者へ戻るボタンのみ残す */}
            <div className="flex pb-3 border-b border-slate-200">
                <Link href="/admin" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold transition-colors">
                    ← 管理者ダッシュボードへ戻る
                </Link>
            </div>

            {/* 為替レート情報のリアルタイム表示 */}
            <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">管理者用 利益・送料自動計算ダッシュボード</h1>
                    <p className="text-slate-500 mt-1">FedEx API（全適用プラン）/ 日本郵便料金と連動したリアルタイム試算</p>
                </div>
                <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 text-xs font-mono">
                    <span className="text-amber-400 font-bold">💱 為替レート:</span>
                    {rateLoading ? (
                        <span className="animate-pulse text-slate-300">取得中...</span>
                    ) : (
                        <span className="font-bold">1 USD = {exchangeRate?.toFixed(2)} JPY</span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-slate-700 border-b pb-2">試算条件設定</h2>
                    
                    {/* マスタ登録商品からの自動セット機能 */}
                    <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                        <label className="block text-[11px] font-bold text-blue-900">
                            📦 マスタ登録商品からセット (未選択で自由入力)
                        </label>
                        <select
                            value={selectedRarityId}
                            onChange={handleSelectRarity}
                            className="w-full h-8 px-2 rounded border border-blue-300 text-slate-900 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">-- 手動入力（またはマスタ商品を選択） --</option>
                            {masterRarities.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name} (単価: ¥{Number(r.price).toLocaleString()} / 税: {r.tax}% / {r.weight}g)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-medium text-slate-600">
                                    {profitType === 'cost' ? '仕入れ利益率' : '売上利益率'}
                                </label>
                                <div className="inline-flex rounded border border-slate-300 p-0.5 bg-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setProfitType('cost')}
                                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${profitType === 'cost' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        仕入れ比
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProfitType('sales')}
                                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${profitType === 'sales' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        売上比
                                    </button>
                                </div>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={profitRate}
                                    onChange={e => setProfitRate(e.target.value)}
                                    className="w-full h-9 pr-6 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="absolute right-2 text-[11px] text-slate-400 font-bold">%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">想定決済手数料 (マスタ選択)</label>
                            <select
                                value={selectedFeeId}
                                onChange={handleSelectFee}
                                className="w-full h-9 px-2 rounded border border-slate-300 font-bold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">-- 手数料マスタ選択 --</option>
                                {masterFees.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.name} ({f.rate}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 商品名入力項目 */}
                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">商品名 (任意)</label>
                        <input
                            type="text"
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            className="w-full h-9 px-2 rounded border border-slate-300 font-medium bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* 単価・消費税率・数量 */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">仕入れ単価</label>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    value={unitPrice}
                                    onChange={e => setUnitPrice(e.target.value)}
                                    className="w-full h-9 pr-6 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="absolute right-2 text-[11px] text-slate-400 font-bold">円</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">消費税率</label>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={taxRate}
                                    onChange={e => setTaxRate(e.target.value)}
                                    className="w-full h-9 pr-6 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="absolute right-2 text-[11px] text-slate-400 font-bold">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">数量</label>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full h-9 pr-6 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="absolute right-2 text-[11px] text-slate-400 font-bold">枚</span>
                            </div>
                        </div>
                    </div>

                    {/* 仕向国・総重量 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">仕向国</label>
                            <CountryCombobox value={destination} onChange={setDestination} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                総重量 {selectedRarityId && <span className="text-blue-600 font-normal">(連動中)</span>}
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    step="0.001"
                                    value={weightKg}
                                    onChange={e => setWeightKg(e.target.value)}
                                    className="w-full h-9 pr-8 px-2 rounded border border-slate-300 font-bold bg-white text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="absolute right-2 text-[11px] text-slate-400 font-bold">kg</span>
                            </div>
                        </div>
                    </div>

                    {/* 消費税還付計算に基づくサマリー表示 */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-slate-500 text-[11px]">
                            <span>仕入れ金額 ({parsedQty}枚):</span>
                            <span className="font-mono">¥{subtotalPrice.toLocaleString()} <span className="text-slate-400 font-normal">{formatUsd(subtotalPrice)}</span></span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600 text-[11px] font-medium">
                            <span>還付消費税額 (控除分):</span>
                            <span className="font-mono">- ¥{refundTaxAmount.toLocaleString()} <span className="text-emerald-700/70 font-normal">{formatUsd(refundTaxAmount)}</span></span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-slate-700 font-bold">原価:</span>
                            <span className="text-base font-bold font-mono text-slate-900">
                                ¥{effectiveCost.toLocaleString()} <span className="text-xs text-slate-500 font-normal">{formatUsd(effectiveCost)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* 全配送プラン比較 */}
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

                    <div className="p-4 space-y-4">
                        {/* 日本郵便 (船便) */}
                        {shippingFeeJp !== null && jpCalculation && (
                            <div className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-xs space-y-2.5">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="font-bold text-slate-800 text-xs">日本郵便 (船便)</span>
                                </div>

                                <div 
                                    onClick={() => toggleDetail('jp')}
                                    className="bg-blue-50/70 hover:bg-blue-100/80 p-3 rounded-md border border-blue-200 grid grid-cols-3 gap-2 text-xs cursor-pointer transition-colors relative group"
                                    title="クリックして内訳の表示/非表示を切り替え"
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-slate-700">販売価格</span>
                                            <span className="text-[9px] text-blue-600 font-bold">{openDetails['jp'] ? '▲ 閉じる' : '▼ 内訳'}</span>
                                        </div>
                                        <span className="text-base font-extrabold font-mono text-slate-900 flex items-baseline gap-1 flex-wrap">
                                            ¥{jpCalculation.totalAmount.toLocaleString()}
                                            <span className="text-xs text-slate-600 font-normal">{formatUsd(jpCalculation.totalAmount)}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col border-l border-blue-200 pl-2.5">
                                        <span className="text-[10px] font-bold text-blue-900">商品価格</span>
                                        <span className="text-base font-extrabold font-mono text-blue-700 flex items-baseline gap-1 flex-wrap">
                                            ¥{jpCalculation.productSellPrice.toLocaleString()}
                                            <span className="text-xs text-blue-600 font-normal">{formatUsd(jpCalculation.productSellPrice)}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col border-l border-blue-200 pl-2.5">
                                        <span className="text-[10px] font-bold text-slate-600">国際送料 (船便)</span>
                                        <span className="text-base font-extrabold font-mono text-slate-700 flex items-baseline gap-1 flex-wrap">
                                            ¥{shippingFeeJp.toLocaleString()}
                                            <span className="text-xs text-slate-500 font-normal">{formatUsd(shippingFeeJp)}</span>
                                        </span>
                                    </div>
                                </div>

                                {openDetails['jp'] && (
                                    <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 space-y-1 text-[11px] animate-fade-in">
                                        <div className="text-[10px] font-bold text-slate-500 border-b border-slate-200/60 pb-0.5">
                                            販売価格の内訳
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>・仕入れ金額 ({parsedQty}枚):</span>
                                            <span className="font-mono">¥{subtotalPrice.toLocaleString()} {formatUsd(subtotalPrice)}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600 font-medium">
                                            <span>・還付消費税額 (控除分):</span>
                                            <span className="font-mono">- ¥{refundTaxAmount.toLocaleString()} {formatUsd(refundTaxAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600 font-medium">
                                            <span>・仕入れ金額利益額 (仕入れ金額比 {jpCalculation.costProfitRateDisp}%):</span>
                                            <span className="font-mono text-emerald-700">¥{jpCalculation.costProfitAmount.toLocaleString()} {formatUsd(jpCalculation.costProfitAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>・決済手数料 ({feeRate}%):</span>
                                            <span className="font-mono">¥{jpCalculation.paymentFeeAmount.toLocaleString()} {formatUsd(jpCalculation.paymentFeeAmount)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* 想定利益額 */}
                                <div className="bg-emerald-50/80 p-2.5 rounded-md border border-emerald-200 flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-emerald-900">
                                        想定利益額 (売上比: {jpCalculation.salesProfitRateDisp}% / 仕入れ金額比: {jpCalculation.costProfitRateDisp}%)
                                    </span>
                                    <span className="text-lg font-extrabold font-mono text-emerald-600 flex items-baseline gap-1">
                                        ¥{jpCalculation.profit.toLocaleString()}
                                        <span className="text-sm text-emerald-700 font-normal">{formatUsd(jpCalculation.profit)}</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* FedEx 各種プラン */}
                        {fedexRatesList.map((fRate, i) => {
                            const calc = calculateProfitRow(fRate.total);
                            const cardKey = `fedex_${i}`;
                            return (
                                <div key={i} className="border border-amber-200 rounded-lg p-3.5 bg-amber-50/20 shadow-xs space-y-2.5">
                                    <div className="flex justify-between items-center border-b border-amber-100 pb-2">
                                        <span className="font-bold text-amber-950 text-xs">{fRate.serviceName}</span>
                                    </div>

                                    <div 
                                        onClick={() => toggleDetail(cardKey)}
                                        className="bg-blue-50/70 hover:bg-blue-100/80 p-3 rounded-md border border-blue-200 grid grid-cols-3 gap-2 text-xs cursor-pointer transition-colors relative group"
                                        title="クリックして内訳の表示/非表示を切り替え"
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-700">販売価格</span>
                                                <span className="text-[9px] text-blue-600 font-bold">{openDetails[cardKey] ? '▲ 閉じる' : '▼ 内訳'}</span>
                                            </div>
                                            <span className="text-base font-extrabold font-mono text-slate-900 flex items-baseline gap-1 flex-wrap">
                                                ¥{calc.totalAmount.toLocaleString()}
                                                <span className="text-xs text-slate-600 font-normal">{formatUsd(calc.totalAmount)}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col border-l border-blue-200 pl-2.5">
                                            <span className="text-[10px] font-bold text-blue-900">商品価格</span>
                                            <span className="text-base font-extrabold font-mono text-blue-700 flex items-baseline gap-1 flex-wrap">
                                                ¥{calc.productSellPrice.toLocaleString()}
                                                <span className="text-xs text-blue-600 font-normal">{formatUsd(calc.productSellPrice)}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col border-l border-blue-200 pl-2.5">
                                            <span className="text-[10px] font-bold text-slate-600">国際送料 (FedEx)</span>
                                            <span className="text-base font-extrabold font-mono text-slate-700 flex items-baseline gap-1 flex-wrap">
                                                ¥{fRate.total.toLocaleString()}
                                                <span className="text-xs text-slate-500 font-normal">{formatUsd(fRate.total)}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {openDetails[cardKey] && (
                                        <div className="bg-white p-2.5 rounded-md border border-amber-200/60 space-y-1 text-[11px] animate-fade-in">
                                            <div className="text-[10px] font-bold text-slate-500 border-b border-slate-100 pb-0.5">
                                                販売価格の内訳
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>・仕入れ金額 ({parsedQty}枚):</span>
                                                <span className="font-mono">¥{subtotalPrice.toLocaleString()} {formatUsd(subtotalPrice)}</span>
                                            </div>
                                            <div className="flex justify-between text-emerald-600 font-medium">
                                                <span>・還付消費税額 (控除分):</span>
                                                <span className="font-mono">- ¥{refundTaxAmount.toLocaleString()} {formatUsd(refundTaxAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600 font-medium">
                                                <span>・仕入れ金額利益額 (仕入れ金額比 {calc.costProfitRateDisp}%):</span>
                                                <span className="font-mono text-emerald-700">¥{calc.costProfitAmount.toLocaleString()} {formatUsd(calc.costProfitAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>・決済手数料 ({feeRate}%):</span>
                                                <span className="font-mono">¥{calc.paymentFeeAmount.toLocaleString()} {formatUsd(calc.paymentFeeAmount)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 想定利益額 */}
                                    <div className="bg-emerald-50/80 p-2.5 rounded-md border border-emerald-200 flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-emerald-900">
                                            想定利益額 (売上比: {calc.salesProfitRateDisp}% / 仕入れ金額比: {calc.costProfitRateDisp}%)
                                        </span>
                                        <span className="text-lg font-extrabold font-mono text-emerald-600 flex items-baseline gap-1">
                                            ¥{calc.profit.toLocaleString()}
                                            <span className="text-sm text-emerald-700 font-normal">{formatUsd(calc.profit)}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {fedexApiError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded text-center text-[11px]">
                                ⚠️ FedEx: {fedexApiError}
                            </div>
                        )}

                        {shippingFeeJp === null && fedexRatesList.length === 0 && !apiLoading && (
                            <div className="p-8 text-center text-slate-400">
                                条件（重量など）を入力すると試算結果が表示されます
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}