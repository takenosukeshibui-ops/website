"use client";

import { useState } from "react";

export default function CalculatorPage() {
  const [countryCode, setCountryCode] = useState("US");
  const [postalCode, setPostalCode] = useState("90210");
  const [weight, setWeight] = useState<number>(1.0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (newCountry: string) => {
    setCountryCode(newCountry);
    if (newCountry === "US") {
      setPostalCode("90210");
    } else if (newCountry === "JP") {
      setPostalCode("816-0000");
    } else if (newCountry === "CA") {
      setPostalCode("K1P 5M7");
    } else if (newCountry === "GB") {
      setPostalCode("SW1A 1AA");
    } else if (newCountry === "AU") {
      setPostalCode("2000");
    } else {
      setPostalCode("10001");
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const finalPostalCode =
        postalCode.trim() ||
        (countryCode === "US" ? "90210" : countryCode === "JP" ? "816-0000" : "10001");

      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: countryCode,
          postalCode: finalPostalCode,
          weight: Number(weight) || 1.0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "送料の計算に失敗しました。");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "予期せぬエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
        国際送料・概算試算シミュレーター
      </h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            配送先の国 (Destination Country)
          </label>
          <select
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="US">アメリカ (United States)</option>
            <option value="JP">日本 (Japan)</option>
            <option value="CA">カナダ (Canada)</option>
            <option value="GB">イギリス (United Kingdom)</option>
            <option value="AU">オーストラリア (Australia)</option>
            <option value="DE">ドイツ (Germany)</option>
            <option value="FR">フランス (France)</option>
            <option value="TW">台湾 (Taiwan)</option>
            <option value="KR">韓国 (South Korea)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            郵便番号 (Postal Code)
            <span className="text-xs text-gray-500 font-normal ml-2">
              ※ 未入力でも概算可能です
            </span>
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="例: 90210"
            className="w-full border border-gray-300 rounded-md p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            商品重量 (Weight / kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
            className="w-full border border-gray-300 rounded-md p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-200 disabled:opacity-50"
        >
          {loading ? "計算中..." : "🚀 送料を試算する"}
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
            計算結果 (概算)
          </h2>

          {/* [NEW] APIでエラーがあった場合は、フォールバックの1件を表示しつつエラー文を出す */}
          {result.fedexError && (
            <div className="p-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-md text-sm">
              <span className="font-bold">⚠️ APIエラーが発生しました:</span><br/>
              {result.fedexError}<br />
              <span className="text-xs text-amber-600 mt-1 block">※現在はエラー回避用の概算料金を1件のみ表示しています。</span>
            </div>
          )}

          {/* 日本郵便の表示 */}
          {result.japanPost && result.japanPost.total !== null && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600 font-bold">{result.japanPost.serviceName}</span>
                <span className="text-gray-600">{result.japanPost.deliveryDays}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-blue-700 border-t border-blue-200 pt-2">
                <span>概算送料:</span>
                <span>¥{result.japanPost.total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* FedExのプラン一覧表示 */}
          {result.fedexRates && result.fedexRates.length > 0 && (
            <div className="space-y-3">
              {result.fedexRates.map((rate: any, index: number) => (
                <div key={index} className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600 font-bold">{rate.serviceName}</span>
                    <span className="text-gray-600">{rate.deliveryDays}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold text-purple-700 border-t border-purple-200 pt-2">
                    <span>概算送料:</span>
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