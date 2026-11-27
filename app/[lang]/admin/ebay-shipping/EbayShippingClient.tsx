'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'

interface RegionRateItem {
  id: string
  region: string
  rateClass: 'H' | 'A' | 'F' | 'D' | 'M'
  countryCode: string
  fedexFeeJpy: number | null
  status: 'ok' | 'error' | 'idle'
  errorMessage?: string | null
}

interface EbayShippingClientProps {
  lang: string
}

const INITIAL_REGIONS: RegionRateItem[] = [
  { id: 'europe', region: 'Europe', rateClass: 'H', countryCode: 'DE', fedexFeeJpy: null, status: 'idle' },
  { id: 'asia', region: 'Asia', rateClass: 'A', countryCode: 'SG', fedexFeeJpy: null, status: 'idle' },
  { id: 'canada', region: 'Canada', rateClass: 'F', countryCode: 'CA', fedexFeeJpy: null, status: 'idle' },
  { id: 'australia', region: 'Australia', rateClass: 'D', countryCode: 'AU', fedexFeeJpy: null, status: 'idle' },
  { id: 'us', region: 'United State', rateClass: 'F', countryCode: 'US', fedexFeeJpy: null, status: 'idle' },
  { id: 'uk', region: 'United Kingdom', rateClass: 'M', countryCode: 'GB', fedexFeeJpy: null, status: 'idle' },
]

export default function EbayShippingClient({ lang }: EbayShippingClientProps) {
  const [weightKg, setWeightKg] = useState<string>('0.5')
  const [feeRatePercent, setFeeRatePercent] = useState<string>('16.5')
  const [usdToJpyRate, setUsdToJpyRate] = useState<number | null>(null)
  const [rates, setRates] = useState<RegionRateItem[]>(INITIAL_REGIONS)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false)

  const parsedWeight = useMemo(() => {
    const num = parseFloat(weightKg)
    return Number.isFinite(num) && num > 0 ? num : null
  }, [weightKg])

  const parsedFeeRate = useMemo(() => {
    const num = parseFloat(feeRatePercent)
    if (!Number.isFinite(num) || num < 0 || num >= 100) return 16.5
    return num
  }, [feeRatePercent])

  const fetchShippingRates = useCallback(async (targetWeight: number) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/ebay-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg: targetWeight }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || '送料の取得に失敗しました。')
      }
      if (Array.isArray(data.rates)) {
        setRates(data.rates)
      }
      if (typeof data.usdToJpyRate === 'number' && data.usdToJpyRate > 0) {
        setUsdToJpyRate(data.usdToJpyRate)
      } else {
        setUsdToJpyRate(null)
      }
      if (data.error) {
        setErrorMsg(data.error)
      }
    } catch (err: any) {
      const msg = err?.message || '通信エラーが発生しました。'
      setErrorMsg(msg)
      setRates((prev) =>
        prev.map((item) => ({
          ...item,
          fedexFeeJpy: null,
          status: 'error',
          errorMessage: msg,
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (parsedWeight !== null) {
      fetchShippingRates(parsedWeight)
    }
  }, [parsedWeight, fetchShippingRates])

  const calculatedRows = useMemo(() => {
    const divisor = 1 - parsedFeeRate / 100
    return rates.map((item) => {
      if (item.status === 'error' || item.fedexFeeJpy === null || item.fedexFeeJpy <= 0 || divisor <= 0) {
        return {
          ...item,
          isError: item.status === 'error' || item.fedexFeeJpy === null,
          ebayShippingJpy: null,
          ebayShippingUsd: null,
        }
      }

      const ebayShippingJpy = Math.ceil(item.fedexFeeJpy / divisor)
      const ebayShippingUsd =
        usdToJpyRate !== null && usdToJpyRate > 0
          ? ebayShippingJpy / usdToJpyRate
          : null

      return {
        ...item,
        isError: false,
        ebayShippingJpy,
        ebayShippingUsd,
      }
    })
  }, [rates, parsedFeeRate, usdToJpyRate])

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // クリップボード非対応環境は無視
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded">
                ADMIN
              </span>
              <h1 className="text-xl font-bold text-gray-900">
                eBay 設定送料 一覧（FedEx Connect Plus）
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              サービス: FedEx International Connect Plus ／ 端数処理: 1円単位切り上げ ／ 為替:{' '}
              {usdToJpyRate !== null ? `1 USD = ${usdToJpyRate.toFixed(2)} JPY` : 'レート未取得'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${lang}/admin`}
              className="px-3.5 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition"
            >
              ← 管理者ダッシュボードへ戻る
            </Link>
          </div>
        </div>

        {/* コントロールパネル：重量・手数料率 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              重量 (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例: 0.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              eBay 手数料率 (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="99.9"
                value={feeRatePercent}
                onChange={(e) => setFeeRatePercent(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="16.5"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => parsedWeight && fetchShippingRates(parsedWeight)}
              disabled={loading || parsedWeight === null}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition"
            >
              {loading ? '取得中...' : '再取得・更新'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* メインテーブル */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-600">
              地域別 eBay送料（手数料 {parsedFeeRate}% 考慮・1円単位切り上げ）
            </span>
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {showBreakdown ? '内訳を隠す' : '料金区分・FedEx元送料を表示'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 text-sm font-bold">
                  <th className="py-3 px-4 border-r border-gray-200">地域</th>
                  {showBreakdown && (
                    <>
                      <th className="py-3 px-4 border-r border-gray-200 text-center">区分</th>
                      <th className="py-3 px-4 border-r border-gray-200 text-right">FedEx元送料</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-right">ebay送料</th>
                  <th className="py-3 px-3 w-20 text-center">コピー</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {calculatedRows.map((row) => {
                  const jpyText =
                    row.ebayShippingJpy !== null ? `${row.ebayShippingJpy.toLocaleString()}円` : null
                  const usdText =
                    row.ebayShippingUsd !== null ? `$${row.ebayShippingUsd.toFixed(2)}` : null
                  const combinedText =
                    jpyText && usdText ? `${jpyText} (${usdText})` : jpyText || ''

                  return (
                    <tr key={row.id} className="hover:bg-indigo-50/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 border-r border-gray-200">
                        {row.region}
                      </td>
                      {showBreakdown && (
                        <>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-700 border-r border-gray-200">
                            {row.rateClass}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-gray-600 border-r border-gray-200">
                            {loading ? (
                              '...'
                            ) : row.fedexFeeJpy !== null ? (
                              `${row.fedexFeeJpy.toLocaleString()}円`
                            ) : (
                              <span className="text-red-600 font-semibold">エラー</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {loading ? (
                          <span className="text-gray-400">取得中...</span>
                        ) : row.isError || !jpyText ? (
                          <span
                            className="text-red-600"
                            title={row.errorMessage || '実際のレートを取得できませんでした'}
                          >
                            エラー
                          </span>
                        ) : (
                          <span className="text-gray-900">
                            {jpyText}
                            {usdText ? (
                              <span className="text-indigo-700 font-semibold"> ({usdText})</span>
                            ) : (
                              <span className="text-red-600 font-semibold"> (ドル換算エラー)</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={loading || !combinedText}
                          onClick={() => handleCopy(row.id, combinedText)}
                          className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 rounded transition"
                        >
                          {copiedId === row.id ? '完了' : 'コピー'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}