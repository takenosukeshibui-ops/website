'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 商品情報の型定義
export type ProductInput = {
  name: string
  price: number
  weight: number
  stock: number
  image_url?: string
  is_active?: boolean
}

// 1. 全商品取得 (顧客・管理者共通)
export async function getProducts(isAdmin = false) {
  const supabase = await createClient()
  let query = supabase.from('inhouse_products').select('*').order('created_at', { ascending: false })
  
  // 管理者でなければ公開中のものだけを取得
  if (!isAdmin) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// 2. 商品の新規追加 (管理者のみ)
export async function addProduct(product: ProductInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('inhouse_products').insert([product])
  
  if (error) throw new Error(error.message)
  revalidatePath('/[lang]/admin/inventory', 'page')
  revalidatePath('/[lang]/inventory', 'page')
}

// 3. 商品の更新 (管理者のみ)
export async function updateProduct(id: string, updates: Partial<ProductInput>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inhouse_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(error.message)
  revalidatePath('/[lang]/admin/inventory', 'page')
  revalidatePath('/[lang]/inventory', 'page')
}