'use client'

import React, { useState, useEffect, use } from 'react'
import CountryCombobox from '@/components/CountryCombobox'

export default function EstimatePage(props: { params: Promise<{ lang: 'en' | 'ja' }> }) {
  const { lang } = use(props.params)
  const isEn = lang === 'en'

  // 1. マスタデータ（取扱商品の価格表）
  const [itemsData, setItemsData] = useState<any[]>([])

  // 2. ユーザー入力用の State
  const [totalItemPrice, setTotalItemPrice] = useState<number>(0) // 商品代金合計
  const [normalCount, setNormalCount] = useState<number>(0)       // ノーマルカード枚数
  const [foilCount, setFoilCount] = useState<number>(0)           // キラカード枚数
  const [country, setCountry] = useState<string>('')              // 配送先国
  const [shippingMethod, setShippingMethod] = useState<'japan_post' | 'fedex'>('japan_post')
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'wise'>('paypal')

  // 3. 計算結果の State
  const [shippingFees, setShippingFees] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState<boolean>(false)

  // 取扱商品の価格を取得（参考表示用）
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/data')
        const data = await res.json()
        if (data.rarities) setItemsData(data.rarities)
      } catch (error) {
        console.error('Error fetching items data:', error)
      }
    }
    fetchItems()
  }, [])

  // 重量の自動計算 (ノーマル 1.6g / キラ 1.8g + 梱包材の余裕分として少し足すのもありですが今回は厳密に)
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

    // 入力中の連続リクエストを防ぐための簡単なデバウンス処理
    const timer = setTimeout(fetchShipping, 500)
    return () => clearTimeout(timer)
  }, [country, totalWeightKg])

  // --- 最終計算ロジック ---
  const proxyFee = Math.floor(totalItemPrice * 0.05) // 代理手数料 (例: 5%)
  const currentShippingFee = shippingFees 
    ? (shippingMethod === 'japan_post' ? shippingFees.shippingFeeJp : shippingFees.shippingFeeFedex) 
    : 0
  
  const subTotal = totalItemPrice + proxyFee + currentShippingFee

  // 決済手数料の計算 (PayPal: 8.1% + 40円 / Wise: 概算で代替またはAPI)
  let paymentFee = 0
  if (paymentMethod === 'paypal' && subTotal > 0) {
    // 逆算式: (小計 + 40) / (1 - 0.081) - 小計
    const grandTotalPaypal = Math.ceil((subTotal + 40) / (1 - 0.081))
    paymentFee = grandTotalPaypal - subTotal
  } else if (paymentMethod === 'wise' && subTotal > 0) {
    // Wiseの場合は仮の概算(例えば手数料を一旦0にしてWise APIで別途確認させる等)
    paymentFee = Math.floor(subTotal * 0.01) // 仮として1%で計算
  }

  const grandTotal = subTotal + paymentFee

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">{isEn ? 'Fee Estimator' : '料金シミュレーター'}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 左カラム：入力エリア */}
        <div className="space-y-6">
          {/* 取扱商品参考エリア */}
          <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-3">{isEn ? 'Item Prices' : '取扱商品の参考価格'}</h2>
            <div className="max-h-40 overflow-y-auto text-sm">
              <table className="w-full text-left">
                <tbody>
                  {itemsData.map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-1">{item.name}</td>
                      <td className="py-1 text-right">¥{item.sell_price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 金額と枚数入力 */}
          <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{isEn ? 'Total Items Price (JPY)' : '商品代金合計 (円)'}</label>
              <input 
                type="number" 
                min="0"
                value={totalItemPrice || ''} 
                onChange={e => setTotalItemPrice(Number(e.target.value))}
                className="w-full border rounded p-2" 
                placeholder="例: 15000"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{isEn ? 'Normal Cards' : 'ノーマルカード枚数'}<br/><span className="text-xs text-gray-500">(1.6g / 1枚)</span></label>
                <input 
                  type="number" 
                  min="0"
                  value={normalCount || ''} 
                  onChange={e => setNormalCount(Number(e.target.value))}
                  className="w-full border rounded p-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isEn ? 'Foil Cards' : 'キラカード枚数'}<br/><span className="text-xs text-gray-500">(1.8g / 1枚)</span></label>
                <input 
                  type="number" 
                  min="0"
                  value={foilCount || ''} 
                  onChange={e => setFoilCount(Number(e.target.value))}
                  className="w-full border rounded p-2" 
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
                <option value="japan_post">Japan Post (EMS / Registered)</option>
                <option value="fedex">FedEx</option>
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
                <span>{(totalWeightKg * 1000).toFixed(1)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{isEn ? 'Items Total' : '商品代金'}</span>
                <span>¥{totalItemPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{isEn ? 'Proxy Fee (5%)' : '代理手数料 (5%)'}</span>
                <span>¥{proxyFee.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{isEn ? 'Shipping Fee' : '送料'}</span>
                <span className="text-right">
                  {isCalculating ? (
                    <span className="text-gray-400 text-xs">計算中...</span>
                  ) : currentShippingFee > 0 ? (
                    `¥${currentShippingFee.toLocaleString()}`
                  ) : (
                    <span className="text-gray-400 text-xs">{country ? '取得不可' : '未選択'}</span>
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
    </div>
  )
}