'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import CountryCombobox from '@/components/CountryCombobox'

export default function EstimatePage(props: { params: Promise<{ lang: 'en' | 'ja' }> }) {
  const { lang } = use(props.params)
  const isEn = lang === 'en'

  // 1. ユーザー入力用の State
  const [serviceType, setServiceType] = useState<'proxy' | 'inventory'>('proxy') // サービスの種類
  const [totalItemPrice, setTotalItemPrice] = useState<number>(0) // 商品代金合計
  const [normalCount, setNormalCount] = useState<number>(0)       // ノーマルカード枚数
  const [foilCount, setFoilCount] = useState<number>(0)           // キラカード枚数
  const [country, setCountry] = useState<string>('')              // 配送先国
  const [shippingMethod, setShippingMethod] = useState<'japan_post' | 'fedex'>('japan_post')
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'wise'>('paypal')

  // 2. 計算結果の State
  const [shippingFees, setShippingFees] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState<boolean>(false)

  // 入力された文字列から数字のみを抽出してStateにセットする共通関数
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    setter(rawValue ? Number(rawValue) : 0)
  }

  // 重量の自動計算 (ノーマル 1.6g / キラ 1.8g) を kg に変換
  const totalWeightKg = ((normalCount * 1.6) + (foilCount * 1.8)) / 1000

  // 配送先国または重量が変わったときに送料を再計算
  useEffect(() => {
    const fetchShipping = async () => {
      if (!country || totalWeightKg <= 0) {
        setShippingFees(null)
        return
      }
      
      setIsCalculating(true)
      try {
        const res = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: country,
            weight: totalWeightKg,
            isEstimate: true
          })
        })
        const data = await res.json()
        setShippingFees(data)
      } catch (error) {
        console.error('Error calculating shipping:', error)
      } finally {
        setIsCalculating(false)
      }
    }

    // 入力中の連続リクエストを防ぐためのデバウンス処理
    const timer = setTimeout(fetchShipping, 500)
    return () => clearTimeout(timer)
  }, [country, totalWeightKg])

  // --- 最終計算ロジック ---
  const proxyFee = serviceType === 'proxy' ? Math.floor(totalItemPrice * 0.05) : 0
  
  // 日本郵便の料金
  const jpFee = shippingFees?.japanPost?.total || 0

  // FedExの料金：複数プランの中から最安値のオブジェクトを抽出
  const cheapestFedexPlan = shippingFees?.fedexRates?.length > 0
    ? shippingFees.fedexRates.reduce((prev: any, curr: any) => (prev.total < curr.total ? prev : curr))
    : null

  const fedexFee = cheapestFedexPlan ? cheapestFedexPlan.total : 0
  
  const currentShippingFee = shippingMethod === 'japan_post' ? jpFee : fedexFee
  
  const subTotal = totalItemPrice + proxyFee + currentShippingFee

  // 決済手数料の計算 (PayPal: 8.1% + 40円 / Wise: 仮で1%)
  let paymentFee = 0
  if (paymentMethod === 'paypal' && subTotal > 0) {
    const grandTotalPaypal = Math.ceil((subTotal + 40) / (1 - 0.081))
    paymentFee = grandTotalPaypal - subTotal
  } else if (paymentMethod === 'wise' && subTotal > 0) {
    paymentFee = Math.floor(subTotal * 0.01) 
  }

  const grandTotal = subTotal + paymentFee

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      {/* ホームへ戻るボタン */}
      <div className="mb-4">
        <Link 
          href={`/${lang}`} 
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          {isEn ? '← Back to Home' : '← ホームへ戻る'}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">{isEn ? 'Fee Estimator' : '料金シミュレーター'}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 左カラム：入力エリア */}
        <div className="space-y-6">
          
          {/* ▼ 追加：重量の自動計算と注意事項の案内 */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-xl">💡</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-blue-800">
                  {isEn ? 'No need to weigh! Automatic calculation' : '重量を測る必要はありません（自動計算）'}
                </h3>
                <div className="mt-2 text-xs text-blue-700 space-y-1">
                  <p>
                    {isEn 
                      ? 'Just enter the number of cards. The system calculates the estimated weight automatically:' 
                      : '枚数を入力するだけで、システムが自動的に重量を計算します。'}
                  </p>
                  <ul className="list-disc list-inside ml-2 font-medium">
                    <li>{isEn ? 'Normal Cards: approx. 1.6g / card' : 'ノーマルカード：約1.6g / 枚'}</li>
                    <li>{isEn ? 'Foil Cards (RR, AR, etc.): approx. 1.8g / card' : 'キラカード（RR、ARなど）：約1.8g / 枚'}</li>
                  </ul>
                  <p className="mt-2 text-blue-600/80">
                    {isEn 
                      ? '* Note: This is an estimate. Packing materials (cardboard boxes) are relatively light, so please do not worry about the exact weight of the boxes when estimating.' 
                      : '※あくまで概算見積もりです。段ボール等の梱包材の重量は軽いため、箱の重さは気にせず枚数だけを入力してください。'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* サービス種類・金額・枚数入力 */}
          <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{isEn ? 'Service Type' : 'サービスの種類'}</label>
              <select 
                value={serviceType} 
                onChange={e => setServiceType(e.target.value as 'proxy' | 'inventory')}
                className="w-full border rounded p-2 bg-gray-50"
              >
                <option value="proxy">{isEn ? 'Proxy Purchase (5% Fee)' : '代理購入サービス (手数料5%)'}</option>
                <option value="inventory">{isEn ? 'In-house Inventory (No Fee)' : '自社在庫 (手数料無料)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{isEn ? 'Total Items Price' : '商品代金合計'}</label>
              <div className="relative">
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={totalItemPrice > 0 ? totalItemPrice.toLocaleString() : ''} 
                  onChange={e => handleNumberInput(e, setTotalItemPrice)}
                  className="w-full border rounded p-2 pr-12 text-right" 
                />
                <span className="absolute right-3 top-2.5 text-gray-500 pointer-events-none">
                  {isEn ? 'JPY' : '円'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {isEn ? 'Normal Cards' : 'ノーマルカード枚数'}
                  <br/>
                  <span className="text-xs text-gray-500">{isEn ? '(1.6g / card)' : '(1.6g / 1枚)'}</span>
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={normalCount > 0 ? normalCount.toLocaleString() : ''} 
                  onChange={e => handleNumberInput(e, setNormalCount)}
                  className="w-full border rounded p-2 text-right" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {isEn ? 'Foil Cards' : 'キラカード枚数'}
                  <br/>
                  <span className="text-xs text-gray-500">{isEn ? '(1.8g / card)' : '(1.8g / 1枚)'}</span>
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={foilCount > 0 ? foilCount.toLocaleString() : ''} 
                  onChange={e => handleNumberInput(e, setFoilCount)}
                  className="w-full border rounded p-2 text-right" 
                />
              </div>
            </div>
          </section>

          {/* 配送・決済選択 */}
          <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{isEn ? 'Destination Country' : '配送先国'}</label>
              <CountryCombobox value={country} onChange={setCountry} isEn={isEn} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{isEn ? 'Shipping Method' : '配送方法'}</label>
              <select 
                value={shippingMethod} 
                onChange={e => setShippingMethod(e.target.value as any)}
                className="w-full border rounded p-2"
              >
                <option value="japan_post">{isEn ? 'Japan Post (Surface Mail)' : '日本郵便 (船便)'}</option>
                <option value="fedex">{isEn ? 'FedEx (Lowest Rate)' : 'FedEx (最安値を自動選択)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{isEn ? 'Payment Method' : '決済方法'}</label>
              <select 
                value={paymentMethod} 
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full border rounded p-2"
              >
                <option value="paypal">PayPal (8.1% + 40 JPY)</option>
                <option value="wise">Wise</option>
              </select>
            </div>
          </section>
        </div>

        {/* 右カラム：結果表示エリア */}
        <div>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 sticky top-6">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">{isEn ? 'Estimated Total' : 'お見積もり結果'}</h2>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">{isEn ? 'Total Weight' : '合計重量'}</span>
                <span>{totalWeightKg.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{isEn ? 'Items Total' : '商品代金'}</span>
                <span>¥{totalItemPrice.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {isEn ? 'Proxy Fee' : '代理手数料'} {serviceType === 'proxy' && '(5%)'}
                </span>
                <span>¥{proxyFee.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-gray-600">{isEn ? 'Shipping Fee' : '送料'}</span>
                  {shippingMethod === 'fedex' && cheapestFedexPlan && (
                    <span className="text-[11px] text-blue-600 font-medium">
                      {isEn ? 'Lowest Rate Plan:' : '最安値適用:'} {cheapestFedexPlan.serviceName.replace('FedEx ', '')}
                    </span>
                  )}
                </div>
                <span className="text-right">
                  {isCalculating ? (
                    <span className="text-gray-400 text-xs">{isEn ? 'Calculating...' : '計算中...'}</span>
                  ) : currentShippingFee > 0 ? (
                    `¥${currentShippingFee.toLocaleString()}`
                  ) : (
                    <span className="text-gray-400 text-xs">{country ? (isEn ? 'Unavailable' : '取得不可') : (isEn ? 'Not selected' : '未選択')}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">{isEn ? 'Payment Fee' : '決済手数料'}</span>
                <span>¥{paymentFee.toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-end">
                <span className="font-bold text-gray-800">{isEn ? 'Grand Total' : 'お支払い総額'}</span>
                <span className="text-3xl font-black text-blue-600">
                  ¥{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ▼ 追加：よくある質問 (FAQ) セクション */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="text-xl">❓</span>
          {isEn ? 'Frequently Asked Questions (FAQ)' : 'よくある質問 (FAQ)'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FAQ 1: バルクの重さ */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-700 text-sm mb-3 flex gap-2 items-start">
              <span className="text-blue-600 shrink-0">Q.</span>
              <span>{isEn 
                ? 'How much does 100,000 bulk cards weigh?' 
                : '10万枚（バルク）の重さはどれくらいですか？'}</span>
            </h3>
            <p className="text-gray-600 text-sm flex gap-2 leading-relaxed items-start bg-gray-50 p-3 rounded-lg">
              <span className="text-red-500 font-bold shrink-0">A.</span>
              <span>{isEn 
                ? 'Approximately 160kg. You don\'t need to calculate this yourself—just enter "100000" in the Normal Cards field above, and the shipping options will be calculated automatically.' 
                : '約160kgです。ご自身で計算する必要はありません。上のノーマルカード入力欄に「100000」と入力するだけで、すぐに送料が自動計算されます。'}</span>
            </p>
          </div>

          {/* FAQ 2: 特殊な梱包指定 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-700 text-sm mb-3 flex gap-2 items-start">
              <span className="text-blue-600 shrink-0">Q.</span>
              <span>{isEn 
                ? 'Can I request special packaging (e.g., splitting into boxes of 7,500 cards)?' 
                : '梱包箱を小分けにするなど、特殊な梱包は指定できますか？'}</span>
            </h3>
            <p className="text-gray-600 text-sm flex gap-2 leading-relaxed items-start bg-gray-50 p-3 rounded-lg">
              <span className="text-red-500 font-bold shrink-0">A.</span>
              <span>{isEn 
                ? 'Currently, due to limited staff, we cannot accommodate custom packaging requests. Orders are typically packed in standard boxes containing around 10,000 cards each.' 
                : '現在スタッフが不足しているため、特殊な梱包指定はお受けしておりません。通常、1箱あたり約10,000枚基準での発送となります。'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}