'use client'

import React, { useState, useMemo } from 'react'
import { addProduct, updateProduct, uploadProductImage, ProductInput } from '@/app/actions/inventory'

export default function AdminInventoryClient({ initialProducts }: { initialProducts: any[] }) {
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
  
  // 利益率入力用の State（手動入力なしの空白状態を判定できるよう string で管理）
  const [marginInput, setMarginInput] = useState<string>('')
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
    // 販売価格を直接書き換えた場合は利益率の固定入力をクリア
    setMarginInput('')
  }

  // 仕入価格（原価）の変更
  const handleCostPriceChange = (val: number) => {
    setForm(prev => {
      const nextForm = { ...prev, cost_price: val }
      // 利益率が入力されていれば、新しい原価に基づいて販売価格を自動更新
      if (marginInput !== '' && !isNaN(Number(marginInput))) {
        const margin = Number(marginInput)
        if (margin < 100 && val > 0) {
          nextForm.price = Math.ceil(val / (1 - margin / 100))
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
        // 販売価格 = 原価 / (1 - 利益率)
        const autoPrice = Math.ceil(form.cost_price / (1 - margin / 100))
        setForm(prev => ({ ...prev, price: autoPrice }))
      }
    }
  }

  const handleEdit = (product: any) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      price: product.price,
      cost_price: product.cost_price || 0,
      weight: product.weight,
      stock: product.stock,
      is_active: product.is_active,
      image_url: product.image_url || ''
    })
    setMarginInput('') // 編集開始時は入力利益率をリセットし、現在価格での計算結果を表示
    setFile(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm({ name: '', price: 0, cost_price: 0, weight: 0, stock: 0, is_active: true, image_url: '' })
    setMarginInput('')
    setFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let finalImageUrl = form.image_url

      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        finalImageUrl = await uploadProductImage(formData)
      }

      const productData = { ...form, image_url: finalImageUrl }

      if (editingId) {
        await updateProduct(editingId, productData)
        setProducts(products.map(p => p.id === editingId ? { ...p, ...productData } : p))
      } else {
        await addProduct(productData)
        window.location.reload()
      }
      handleCancel()
    } catch (error: any) {
      alert('エラーが発生しました: ' + error.message)
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
              <label className="block text-xs font-medium mb-1">仕入価格 (¥)</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={form.cost_price}
                onChange={e => handleCostPriceChange(Number(e.target.value))}
                className="w-full border rounded p-2 bg-red-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">想定利益率 (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder={marginInput === '' ? calculatedMargin : ''}
                value={marginInput}
                onChange={e => handleMarginChange(e.target.value)}
                className="w-full border rounded p-2 bg-emerald-50 text-sm placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">販売価格 (¥)</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={form.price}
                onChange={e => handlePriceChange(Number(e.target.value))}
                className="w-full border rounded p-2 bg-blue-50 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">重量 (g)</label>
              <input type="number" required min="0" step="any" value={form.weight} onChange={e => setForm({ ...form, weight: Number(e.target.value) })} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">在庫数</label>
              <input type="number" required min="0" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} className="w-full border rounded p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">商品画像</label>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            {form.image_url && !file && <img src={form.image_url} alt="Current" className="mt-2 h-20 object-cover" />}
          </div>

          <div className="flex items-center">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="mr-2" id="isActive" />
            <label htmlFor="isActive" className="text-sm font-medium">公開する</label>
          </div>

          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded flex-1 hover:bg-blue-700 disabled:opacity-50">
              {loading ? '処理中...' : (editingId ? '更新' : '追加')}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400">
                キャンセル
              </button>
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
                const profit = product.price - (product.cost_price || 0)
                const profitRate = product.price > 0 ? (profit / product.price) * 100 : 0
                
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
                    <td className="p-2 text-right font-semibold text-blue-700">¥{product.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right text-red-600">¥{(product.cost_price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-emerald-600">¥{profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-gray-500">({profitRate.toFixed(1)}%)</span>
                      </div>
                    </td>
                    <td className="p-2 text-center">{product.stock}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 text-[10px] rounded ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                        {product.is_active ? '公開中' : '非公開'}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => handleEdit(product)} className="text-blue-600 hover:underline text-xs">編集</button>
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