'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { addProduct, updateProduct, uploadProductImage, ProductInput } from '@/app/actions/inventory'

// 仕入先別の希望価格管理用型定義
interface SupplierItem {
  id: string
  supplierName: string
  productName: string
  desiredPrice: number
  note?: string
}

export default function AdminInventoryClient({ 
  initialProducts, 
  isLoggedIn = true 
}: { 
  initialProducts: any[]
  isLoggedIn?: boolean 
}) {
  const [products, setProducts] = useState(initialProducts)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  
  // 「仕入先情報一覧」モーダルの開閉状態
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)

  // 商品とは独立した仕入先・希望価格データリスト
  const [supplierList, setSupplierList] = useState<SupplierItem[]>([
    { id: '1', supplierName: 'A商事', productName: '商品サンプルA', desiredPrice: 2500, note: 'ロット50個〜' },
    { id: '2', supplierName: 'A商事', productName: '商品サンプルB', desiredPrice: 4200, note: '' },
    { id: '3', supplierName: 'Bトレーディング', productName: '商品サンプルC', desiredPrice: 1800, note: '即納可' }
  ])

  // 仕入先追加用の簡易フォームState
  const [newSupplier, setNewSupplier] = useState({
    supplierName: '',
    productName: '',
    desiredPrice: '',
    note: ''
  })
  
  const [isPending, startTransition] = useTransition()

  // 自社在庫商品の入力フォーム (元のシンプルな構成を保持)
  const [form, setForm] = useState<ProductInput>({
    name: '',
    price: 0,
    cost_price: 0,
    weight: 0,
    stock: 0,
    is_active: true,
    image_url: ''
  })
  
  const [marginInput, setMarginInput] = useState<string>('')
  const [stockInput, setStockInput] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)

  const calculatedMargin = useMemo(() => {
    if (marginInput !== '') return marginInput
    if (form.price > 0 && form.cost_price >= 0) {
      const margin = ((form.price - form.cost_price) / form.price) * 100
      return margin.toFixed(1)
    }
    return ''
  }, [marginInput, form.price, form.cost_price])

  // 仕入先名ごとにグループ化
  const groupedSuppliers = useMemo(() => {
    const groups: { [supplier: string]: SupplierItem[] } = {}
    supplierList.forEach((item) => {
      const name = item.supplierName.trim() || '未分類'
      if (!groups[name]) groups[name] = []
      groups[name].push(item)
    })
    return groups
  }, [supplierList])

  const handlePriceChange = (val: number) => {
    setForm(prev => ({ ...prev, price: val }))
    setMarginInput('')
  }

  const calculateAutoPrice = (cost: number, marginPercent: number): number => {
    if (marginPercent >= 100 || cost <= 0) return 0
    const rawPrice = cost / (1 - marginPercent / 100)
    
    if (rawPrice < 1) {
      return Math.ceil(rawPrice * 100) / 100
    }
    return Math.ceil(rawPrice * 10) / 10
  }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn) return
    setLoading(true)

    startTransition(async () => {
      try {
        let finalImageUrl = form.image_url || ''

        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          const uploadRes = await uploadProductImage(formData)
          
          if (!uploadRes.success) {
            alert('画像のアップロードエラー: ' + uploadRes.error)
            setLoading(false)
            return
          }
          if (uploadRes.url) {
            finalImageUrl = uploadRes.url
          }
        }

        const productData: ProductInput = { 
          name: form.name,
          price: Number(form.price),
          cost_price: Number(form.cost_price),
          weight: Number(form.weight),
          stock: Number(form.stock),
          is_active: form.is_active,
          image_url: finalImageUrl 
        }

        if (editingId) {
          const updateRes = await updateProduct(editingId, productData)
          if (!updateRes.success) {
            alert('更新エラー: ' + updateRes.error)
            setLoading(false)
            return
          }
          const updatedItem = updateRes.data || { ...productData, id: editingId }
          setProducts(prev => prev.map(p => String(p.id) === String(editingId) ? updatedItem : p))
        } else {
          const addRes = await addProduct(productData)
          if (!addRes.success) {
            alert('追加エラー: ' + addRes.error)
            setLoading(false)
            return
          }
          if (addRes.data) {
            setProducts(prev => [addRes.data, ...prev])
          }
        }
        
        handleCancel()
      } catch (error: any) {
        console.error('Submit Error:', error)
        alert('エラーが発生しました: ' + (error?.message || '処理に失敗しました'))
      } finally {
        setLoading(false)
      }
    })
  }

  // 仕入先希望価格の追加ハンドラー
  const handleAddSupplierItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplier.supplierName || !newSupplier.productName) return
    
    const newItem: SupplierItem = {
      id: Date.now().toString(),
      supplierName: newSupplier.supplierName.trim(),
      productName: newSupplier.productName.trim(),
      desiredPrice: Number(newSupplier.desiredPrice) || 0,
      note: newSupplier.note.trim()
    }
    
    setSupplierList(prev => [newItem, ...prev])
    setNewSupplier({ supplierName: newSupplier.supplierName, productName: '', desiredPrice: '', note: '' })
  }

  const handleDeleteSupplierItem = (id: string) => {
    setSupplierList(prev => prev.filter(item => item.id !== id))
  }

  const isProcessing = loading || isPending

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* 自社商品登録フォーム */}
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
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
            {form.image_url && !file && <img src={form.image_url} alt="Current" className="mt-2 h-20 object-cover rounded border" />}
          </div>

          <div className="flex items-center">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="mr-2" id="isActive" />
            <label htmlFor="isActive" className="text-sm font-medium">公開する</label>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={isProcessing || !isLoggedIn} 
                className={`px-4 py-2 rounded flex-1 text-white ${
                  !isLoggedIn 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {isProcessing ? '処理中...' : (editingId ? '更新' : '追加')}
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold">登録済み商品一覧</h2>
          
          {/* 仕入先情報一覧を開くボタン */}
          <button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700 transition"
          >
            <span>📋</span>
            <span>仕入先情報一覧</span>
          </button>
        </div>

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

      {/* 仕入先別情報一覧モーダル */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* モーダルヘッダー */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span>📋</span> 仕入先別 希望価格一覧
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* 仕入先希望価格の簡易追加バー */}
              <form onSubmit={handleAddSupplierItem} className="bg-gray-50 p-4 rounded-lg border grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="仕入先名"
                  value={newSupplier.supplierName}
                  onChange={e => setNewSupplier({ ...newSupplier, supplierName: e.target.value })}
                  className="border rounded p-2 text-sm bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder="商品名"
                  value={newSupplier.productName}
                  onChange={e => setNewSupplier({ ...newSupplier, productName: e.target.value })}
                  className="border rounded p-2 text-sm bg-white"
                />
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    placeholder="希望価格"
                    value={newSupplier.desiredPrice}
                    onChange={e => setNewSupplier({ ...newSupplier, desiredPrice: e.target.value })}
                    className="w-full border rounded p-2 pr-6 text-sm bg-white text-right"
                  />
                  <span className="absolute right-2 text-xs text-gray-400">円</span>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 py-2"
                >
                  リストに追加
                </button>
              </form>

              {/* 仕入先ごとの希望価格グループリスト */}
              {Object.keys(groupedSuppliers).length === 0 ? (
                <p className="text-center text-gray-400 py-8">仕入先情報が登録されていません</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedSuppliers).map(([supplier, items]) => (
                    <div key={supplier} className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-4 py-2 font-bold text-gray-700 flex justify-between items-center text-sm">
                        <span>🏢 {supplier}</span>
                        <span className="text-xs text-gray-500 font-normal">{items.length} 件</span>
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b text-xs text-gray-500">
                            <th className="p-2.5">商品名</th>
                            <th className="p-2.5 text-right w-32">仕入先希望価格</th>
                            <th className="p-2.5 text-center w-16">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50/50">
                              <td className="p-2.5 font-medium">{item.productName}</td>
                              <td className="p-2.5 text-right font-semibold text-emerald-700">
                                {item.desiredPrice > 0 ? `¥${item.desiredPrice.toLocaleString()}` : '未定'}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSupplierItem(item.id)}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  削除
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* モーダルフッター */}
            <div className="px-6 py-3 border-t bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}