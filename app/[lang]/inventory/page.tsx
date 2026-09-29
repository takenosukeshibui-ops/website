import React from 'react'
import { getProducts } from '@/app/actions/inventory'
import { createClient } from '@/lib/supabase/server'
import { AddToCartForm } from './AddToCartForm'
import Link from 'next/link'

export default async function InventoryPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  const products = await getProducts(false)
  
  // ログイン状態の確認
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-10 bg-blue-50 border border-blue-100 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-blue-900">Trading Cards - Q&A & Notes</h2>
        <ul className="list-disc list-inside space-y-2 text-blue-800 text-sm">
          <li><strong>0% Proxy Fee:</strong> All trading cards listed on this page are our in-house inventory, so no proxy purchasing fees will be charged.</li>
          <li><strong>Condition:</strong> All cards are assumed to be Near Mint (NM) unless otherwise stated in the title.</li>
          <li><strong>Shipping:</strong> Shipping fees will be automatically calculated based on the total weight of your cart during checkout.</li>
          <li><strong>Stock:</strong> Inventory is secured at the time of order confirmation. Please proceed to checkout promptly after adding to cart.</li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold mb-6">In-house Trading Cards</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border rounded-lg overflow-hidden shadow-sm bg-white flex flex-col hover:shadow-md transition-shadow relative">
            <div className="aspect-square bg-gray-100 relative">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
              )}
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-bold text-lg mb-1 leading-tight">{product.name}</h3>
              <p className="text-gray-800 font-semibold mb-2">
                {product.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} JPY
              </p>
              
              <div className="text-xs text-gray-500 mb-4 space-y-1">
                <p>Weight: {product.weight} g</p>
                <p>Stock: {product.stock > 0 ? `${product.stock} available` : <span className="text-red-500 font-bold">Out of stock</span>}</p>
              </div>
              
              <div className="mt-auto">
                {product.stock <= 0 ? (
                  <button disabled className="w-full bg-gray-200 text-gray-500 py-2.5 rounded font-medium cursor-not-allowed">
                    Sold Out
                  </button>
                ) : !isLoggedIn ? (
                  <Link href={`/${lang}/signup`} className="w-full bg-indigo-600 text-white py-2.5 rounded font-medium hover:bg-indigo-700 transition-colors flex justify-center text-sm">
                    Register to Purchase
                  </Link>
                ) : (
                  <AddToCartForm product={product} />
                )}
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            現在、販売中の商品はありません。<br/>(No items available at the moment.)
          </div>
        )}
      </div>
    </div>
  )
}