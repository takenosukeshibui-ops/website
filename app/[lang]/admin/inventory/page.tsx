import React from 'react'
import { getProducts } from '@/app/actions/inventory'
import { createClient } from '@/lib/supabase/server'
import { AddToCartForm } from '../../inventory/AddToCartForm'

export default async function InventoryPage() {
  const products = await getProducts()

  // ログイン状態の判定
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">取扱商品一覧</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product: any) => (
          <div key={product.id} className="border rounded-lg p-4 shadow-sm bg-white flex flex-col justify-between">
            <div>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded mb-4" />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded mb-4 flex items-center justify-center text-gray-400">No Image</div>
              )}
              <h2 className="font-bold text-lg mb-2">{product.name}</h2>
              <p className="text-blue-600 font-semibold mb-4">¥{Number(product.price).toLocaleString()}</p>
            </div>

            {/* ログイン判定フラグをPropsとして伝達 */}
            <AddToCartForm product={product} isLoggedIn={isLoggedIn} />
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-gray-500 col-span-3 text-center py-8">現在取扱中の商品はありません。</p>
        )}
      </div>
    </div>
  )
}