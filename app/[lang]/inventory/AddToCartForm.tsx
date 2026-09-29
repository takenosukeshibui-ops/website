'use client'

import React, { useState } from 'react'
import { addToCart } from '@/app/actions/items'

export function AddToCartForm({ product }: { product: any }) {
  const [isPending, setIsPending] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleAction = async (formData: FormData) => {
    setIsPending(true)
    try {
      await addToCart(formData)
      // 成功時にトーストを表示し、3秒後に消す
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      alert('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <form action={handleAction}>
        <input type="hidden" name="url" value={`inhouse://${product.id}`} />
        <input type="hidden" name="title" value={product.name} />
        <input type="hidden" name="price_estimated" value={product.price} />
        
        <button 
          type="submit" 
          disabled={isPending} 
          className="w-full bg-black text-white py-2.5 rounded font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 flex justify-center items-center"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding...
            </span>
          ) : (
            'Add to Cart'
          )}
        </button>
      </form>

      {/* トースト通知 (画面右下に固定表示) */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg font-bold flex items-center gap-2 z-50 animate-bounce">
          <span>✅</span>
          Added to Cart! 
        </div>
      )}
    </>
  )
}