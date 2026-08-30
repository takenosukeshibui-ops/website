// app/[lang]/calculator/page.tsx
// [UPDATED] タイトルを "Shipping Simulator" に変更し、入力欄内に "kg" を追加
"use client";

import { useState, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; 
import { countries } from "@/components/countries";

export default function CalculatorPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = use(props.params);
  const pathname = usePathname();
  const isEn = pathname.startsWith('/en'); 

  const [countryCode, setCountryCode] = useState("US");
  const [weight, setWeight] = useState<number>(1.0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (newCountry: string) => {
    setCountryCode(newCountry);
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: countryCode,
          weight: Number(weight) || 1.0,
          isEstimate: true
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEn ? "Failed to calculate shipping." : "送料の計算に失敗しました。"));
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || (isEn ? "An unexpected error occurred." : "予期せぬエラーが発生しました。"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-4">
        <Link href={`/${lang}`} className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1">
          {isEn ? '← Back to Home' : '← ホームへ戻る'}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
        Shipping Simulator
      </h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {isEn ? 'Destination Country' : '配送先の国 (Destination Country)'}
          </label>
          <select
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {isEn ? c.enName : c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {isEn ? 'Weight' : '商品重量 (Weight)'}
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded-md p-2.5 pr-8 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="absolute right-3 text-sm font-bold text-gray-500">kg</span>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-200 disabled:opacity-50"
        >
          {loading ? (isEn ? "Calculating..." : "計算中...") : (isEn ? "🚀 Calculate Shipping" : "🚀 送料を試算する")}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {result && result.success && (
        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-1">
            {isEn ? 'Calculation Result (Estimate)' : '計算結果 (概算)'}
          </h2>

          {result.fedexError && (
            <div className="p-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-md text-sm">
              <span className="font-bold">{isEn ? '⚠️ API Error occurred:' : '⚠️ APIエラーが発生しました:'}</span><br/>
              {result.fedexError}<br />
              <span className="text-xs text-amber-600 mt-1 block">
                {isEn ? '*Currently showing one estimated rate as a fallback.' : '※現在はエラー回避用の概算料金を1件のみ表示しています。'}
              </span>
            </div>
          )}

          {/* 日本郵便の表示 */}
          {result.japanPost && result.japanPost.total !== null && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600 font-bold">{isEn ? 'Japan Post (Sea)' : result.japanPost.serviceName}</span>
                <span className="text-gray-600">{isEn ? 'Approx 1-2 months' : result.japanPost.deliveryDays}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-blue-700 border-t border-blue-200 pt-2">
                <span>{isEn ? 'Estimated Shipping:' : '概算送料:'}</span>
                <span>¥{result.japanPost.total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* FedExの全適用プラン表示 */}
          {result.fedexRates && result.fedexRates.length > 0 && (
            <div className="space-y-3">
              {result.fedexRates.map((rate: any, index: number) => (
                <div key={index} className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600 font-bold">{rate.serviceName}</span>
                    <span className="text-gray-600">{rate.deliveryDays}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold text-purple-700 border-t border-purple-200 pt-2">
                    <span>{isEn ? 'Estimated Shipping:' : '概算送料:'}</span>
                    <span>¥{rate.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}