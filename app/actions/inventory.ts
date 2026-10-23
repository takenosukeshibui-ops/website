'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProductInput = {
  name: string
  price: number
  cost_price: number
  weight: number
  stock: number
  image_url?: string
  is_active?: boolean
}

// 1. 全商品取得
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

// 2. 新規追加
export async function addProduct(product: ProductInput) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('inhouse_products')
      .insert([product])
      .select()
      .single()
    
    if (error) {
      console.error('SERVER addProduct ERROR:', error)
      return { success: false, error: `[DB Insert Error] ${error.message}` }
    }
    
    revalidatePath('/[lang]/admin/inventory', 'page')
    revalidatePath('/[lang]/inventory', 'page')
    return { success: true, data }
  } catch (err: any) {
    console.error('SERVER addProduct FATAL:', err)
    return { success: false, error: `[Server Fatal] ${err?.message || String(err)}` }
  }
}

// 3. 商品更新（エラーハンドリングと引数構造を強化）
export async function updateProduct(id: string, updates: Partial<ProductInput>) {
  try {
    const supabase = await createClient()

    // updated_at の型エラー等を防ぐため、シンプルなオブジェクトで渡す
    const payload = {
      name: updates.name,
      price: updates.price,
      cost_price: updates.cost_price,
      weight: updates.weight,
      stock: updates.stock,
      is_active: updates.is_active,
      image_url: updates.image_url,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('inhouse_products')
      .update(payload)
      .eq('id', id)
      .select()

    if (error) {
      console.error('SERVER updateProduct ERROR:', error)
      return { success: false, error: `[DB Update Error] ${error.message}` }
    }

    // 更新対象のレコードが存在しなかった場合（ID不一致等）
    if (!data || data.length === 0) {
      return { success: false, error: '更新対象の商品が見つかりませんでした (ID不一致)' }
    }

    revalidatePath('/[lang]/admin/inventory', 'page')
    revalidatePath('/[lang]/inventory', 'page')
    return { success: true, data: data[0] }
  } catch (err: any) {
    console.error('SERVER updateProduct FATAL:', err)
    return { success: false, error: `[Server Fatal] ${err?.message || String(err)}` }
  }
}

// 4. 画像アップロード
export async function uploadProductImage(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file || file.size === 0) {
      return { success: false, error: 'ファイルが選択されていません' }
    }

    const supabase = await createClient()
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('SERVER Storage Upload ERROR:', uploadError)
      return { success: false, error: `[Storage Upload Error] ${uploadError.message}` }
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    return { success: true, url: data.publicUrl }
  } catch (err: any) {
    console.error('SERVER uploadProductImage FATAL:', err)
    return { success: false, error: `[Server Storage Exception] ${err?.message || String(err)}` }
  }
}