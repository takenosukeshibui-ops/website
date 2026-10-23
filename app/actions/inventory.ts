'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 商品情報の型定義
export type ProductInput = {
  name: string
  price: number
  cost_price: number
  weight: number
  stock: number
  image_url?: string
  is_active?: boolean
}

// 1. 全商品取得 (顧客・管理者共通)
export async function getProducts(isAdmin = false) {
  const supabase = await createClient()
  let query = supabase.from('inhouse_products').select('*').order('created_at', { ascending: false })
  
  if (!isAdmin) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

// 2. 商品の新規追加 (管理者のみ) - 作成されたデータを返すように変更
export async function addProduct(product: ProductInput) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('inhouse_products')
      .insert([product])
      .select()
      .single()
    
    if (error) return { success: false, error: error.message }
    
    revalidatePath('/[lang]/admin/inventory', 'page')
    revalidatePath('/[lang]/inventory', 'page')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || '追加に失敗しました' }
  }
}

// 3. 商品の更新 (管理者のみ)
export async function updateProduct(id: string, updates: Partial<ProductInput>) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('inhouse_products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) return { success: false, error: error.message }

    revalidatePath('/[lang]/admin/inventory', 'page')
    revalidatePath('/[lang]/inventory', 'page')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || '更新に失敗しました' }
  }
}

// 4. 画像アップロード
export async function uploadProductImage(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file || file.size === 0) return { success: false, error: '画像が選択されていません' }

    const supabase = await createClient()
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file)

    if (uploadError) return { success: false, error: uploadError.message }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    return { success: true, url: data.publicUrl }
  } catch (err: any) {
    return { success: false, error: err.message || '画像のアップロードに失敗しました' }
  }
}