'use client'

import React, { useState, useMemo } from 'react'
import { addProduct, updateProduct, uploadProductImage, ProductInput } from '@/app/actions/inventory'

export default function AdminInventoryClient({ 
  initialProducts, 
  isLoggedIn = true 
}: { 
  initialProducts: any[]
  isLoggedIn?: boolean 
}) {
  const [products, setProducts] = useState(initialProducts)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductInput>({
    name: '',
    price: 0,
    cost_price: 0,
    weight: 0,
    stock: 0,
    is_active: true,
    image_url: ''
  })
  
  // 利益率入力用の State
  const [marginInput, setMarginInput] = useState<string>('')
  // 在庫数入力用の State（初期値を空白に設定）
  const [stockInput, setStockInput] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)

  // 利益率が空白の場合に表示する自動計算利益率 (%)
  const calculatedMargin = useMemo(() => {
    if (marginInput !== '') return marginInput
    if (form.price > 0 && form.cost_price >= 0) {
      const margin = ((form.price - form.cost_price) / form.price) * 100
      return margin.toFixed(1)
    }
    return ''
  }, [marginInput, form.price, form.cost_price])

  // 販売価格の手動変更
  const handlePriceChange = (val: number) => {
    setForm(prev => ({ ...prev, price: val }))
    setMarginInput('')
  }

  // 自動価格算出用のヘルパー関数（1未満: 小数点第3位切り上げ / 1以上: 小数点第2位切り上げ）
  const calculateAutoPrice = (cost: number, marginPercent: number): number => {
    if (marginPercent >= 100 || cost <= 0) return 0
    const rawPrice = cost / (1 - marginPercent / 100)
    
    if (rawPrice < 1) {
      return Math.ceil(rawPrice * 100) / 100
    }
    return Math.ceil(rawPrice * 10) / 10
  }

  // 仕入価格（原価）の変更（小数点以下対応）
  const handleCostPriceChange = (val: number) => {
    setForm(prev => {
      const nextForm = { ...prev, cost_price: val }
      if (marginInput !== '' && !isNaN(Number(marginInput))) {
        const margin = Number(marginInput)
        if (margin < 100 && val > 0) {
          nextForm.price = calculateAutoPrice(val, margin)
        }
      }
      return nextForm
    })
  }

  // 利益率の入力変更
  const handleMarginChange = (val: string) => {
    setMarginInput(val)
    if (val !== '' && !isNaN(Number(val))) {
      const margin = Number(val)
      if (margin < 100 && form.cost_price > 0) {
        const autoPrice = calculateAutoPrice(form.cost_price, margin)
        setForm(prev => ({ ...prev, price: autoPrice }))
      }
    }
  }

  // 在庫数の入力変更 (3桁カンマフォーマット)
  const handleStockChange = (valStr: string) => {
    const rawValue = valStr.replace(/[^0-9]/g, '')
    if (rawValue === '') {
      setStockInput('')
      setForm(prev => ({ ...prev, stock: 0 }))
      return
    }
    const num = parseInt(rawValue, 10)
    setStockInput(num.toLocaleString())
    setForm(prev => ({ ...prev, stock: num }))
  }

  const handleEdit = (product: any) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      price: product.price,
      cost_price: product.cost_price ?? 0,
      weight: product.weight,
      stock: product.stock,
      is_active: product.is_active,
      image_url: product.image_url || ''
    })
    setMarginInput('')
    setStockInput(product.stock !== undefined && product.stock !== null ? product.stock.toLocaleString() : '')
    setFile(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm({ name: '', price: 0, cost_price: 0, weight: 0, stock: 0, is_active: true, image_url: '' })
    setMarginInput('')
    setStockInput('')
    setFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn) return
    setLoading(true)

    try {
      let finalImageUrl = form.image_url

      // ファイルが選択されている場合はSupabase Storage等へアップロード
      if (file) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        finalImageUrl = await uploadProductImage(uploadFormData)
      }

      const productData = { ...form, image_url: finalImageUrl }

      if (editingId) {
        await updateProduct(editingId, productData)
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...productData } : p))
      } else {
        await addProduct(productData)
        window.location.reload()
      }
      handleCancel()
    } catch (error: any) {
      console.error('画像アップロード・更新エラー:', error)
      alert('エラーが発生しました: ' + (error?.message || '画像のアップロードに失敗しました。'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* フォームセクション */}
      <div className="xl:col-span-1 bg-white p-6 rounded shadow h-fit">
        <h2 className="text-xl font-bold mb-4">{editingId ? '商品を編集' : '新規商品を追加'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">商品名 (英語推奨)</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded p-2" />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">仕入価格</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={form.cost_price === 0 ? '' : form.cost_price}
                  onChange={e => handleCostPriceChange(e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full border rounded p-2 pr-6 bg-red-50 text-sm text-right"
                />
                <span className="absolute right-2 text-xs text-gray-500 pointer-events-none">円</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">想定利益率</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  placeholder={marginInput === '' ? calculatedMargin : ''}
                  value={marginInput}
                  onChange={e => handleMarginChange(e.target.value)}
                  className="w-full border rounded p-2 pr-6 bg-emerald-50 text-sm text-right placeholder-gray-400"
                />
                <span className="absolute right-2 text-xs text-gray-500 pointer-events-none">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">販売価格</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={form.price === 0 ? '' : form.price}
                  onChange={e => handlePriceChange(e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full border rounded p-2 pr-6 bg-blue-50 text-sm text-right"
                />
                <span className="absolute right-2 text-xs text-gray-500 pointer-events-none">円</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">重量</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={form.weight === 0 ? '' : form.weight}
                  onChange={e => setForm({ ...form, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0"
                  className="w-full border rounded p-2 pr-6 text-right"
                />
                <span className="absolute right-2 text-sm text-gray-500 pointer-events-none">g</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">在庫数</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={stockInput}
                  onChange={e => handleStockChange(e.target.value)}
                  className="w-full border rounded p-2 text-right"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">商品画像</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => setFile(e.target.files?.[0] || null)} 
              className="w-full text-sm" 
            />
            {form.image_url && !file && (
              <img src={form.image_url} alt="Current" className="mt-2 h-20 object-cover rounded border" />
            )}
          </div>

          <div className="flex items-center">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="mr-2" id="isActive" />
            <label htmlFor="isActive" className="text-sm font-medium">公開する</label>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={loading || !isLoggedIn} 
                className={`px-4 py-2 rounded flex-1 text-white ${
                  !isLoggedIn 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {loading ? '処理中...' : (editingId ? '更新' : '追加')}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400">
                  キャンセル
                </button>
              )}
            </div>
            {!isLoggedIn && (
              <p className="text-xs text-red-500 text-center font-medium mt-1">
                ※ログイン、アカウント登録が必要です
              </p>
            )}
          </div>
        </form>
      </div>

      {/* 一覧セクション */}
      <div className="xl:col-span-2 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">登録済み商品一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 w-12">画像</th>
                <th className="p-2 min-w-[150px]">商品名</th>
                <th className="p-2 text-right">販売価格</th>
                <th className="p-2 text-right">仕入価格</th>
                <th className="p-2 text-right">想定利益</th>
                <th className="p-2 text-center">在庫</th>
                <th className="p-2 text-center">状態</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const costPrice = Number(product.cost_price || 0)
                const price = Number(product.price || 0)
                const profit = price - costPrice
                const profitRate = price > 0 ? (profit / price) * 100 : 0
                
                return (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-500">No Img</div>
                      )}
                    </td>
                    <td className="p-2 font-medium break-words">{product.name}</td>
                    <td className="p-2 text-right font-semibold text-blue-700">¥{price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right text-red-600">¥{costPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-emerald-600">¥{profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-gray-500">({profitRate.toFixed(1)}%)</span>
                      </div>
                    </td>
                    <td className="p-2 text-center">{Number(product.stock || 0).toLocaleString()}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 text-[10px] rounded ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                        {product.is_active ? '公開中' : '非公開'}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        onClick={() => handleEdit(product)} 
                        disabled={!isLoggedIn} 
                        className={`text-xs ${!isLoggedIn ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`}
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">商品が登録されていません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}