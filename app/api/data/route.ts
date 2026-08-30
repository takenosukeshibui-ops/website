// app/api/data/route.ts
// [UPDATED] マスタデータ（レアリティ・手数料）管理用 API Route (在庫数 stock 対応追加)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// [NEW] GET: レアリティおよび手数料一覧の取得
export async function GET() {
    try {
        const supabase = await createClient()

        const [raritiesRes, feesRes] = await Promise.all([
            supabase.from('rarities').select('*').order('created_at', { ascending: true }),
            supabase.from('fees').select('*').order('created_at', { ascending: true })
        ])

        if (raritiesRes.error) {
            console.error('Rarities fetch error:', raritiesRes.error.message)
        }
        if (feesRes.error) {
            console.error('Fees fetch error:', feesRes.error.message)
        }

        return NextResponse.json({
            rarities: raritiesRes.data || [],
            fees: feesRes.data || []
        })
    } catch (err: any) {
        console.error('API GET Data Internal Error:', err)
        return NextResponse.json({ error: err.message || 'データ取得エラーが発生しました' }, { status: 500 })
    }
}

// [UPDATED] POST: レアリティまたは手数料の新規登録 (stock 対応)
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const body = await req.json()

        const { type, name, price, tax, weight, stock, rate } = body // [UPDATED] stock を追加

        if (type === 'rarity') {
            const { data, error } = await supabase
                .from('rarities')
                .insert({
                    name,
                    price: Number(price) || 0,
                    tax: Number(tax) || 0,
                    weight: Number(weight) || 0,
                    stock: Number(stock) || 0 // [NEW] 在庫数
                })
                .select()
                .single()

            if (error) {
                console.error('Rarity insert error:', error.message)
                return NextResponse.json({ error: error.message }, { status: 400 })
            }

            return NextResponse.json({ success: true, data })
        }

        if (type === 'fee') {
            const { data, error } = await supabase
                .from('fees')
                .insert({
                    name,
                    rate: Number(rate) || 0
                })
                .select()
                .single()

            if (error) {
                console.error('Fee insert error:', error.message)
                return NextResponse.json({ error: error.message }, { status: 400 })
            }

            return NextResponse.json({ success: true, data })
        }

        return NextResponse.json({ error: '不正な type が指定されました' }, { status: 400 })
    } catch (err: any) {
        console.error('API POST Data Internal Error:', err)
        return NextResponse.json({ error: err.message || 'データ追加エラーが発生しました' }, { status: 500 })
    }
}

// [NEW] PATCH: 在庫数の即時更新用API
export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const body = await req.json()
        const { type, id, stock } = body

        if (type === 'rarity_stock') {
            const { data, error } = await supabase
                .from('rarities')
                .update({ stock: Math.max(0, Number(stock) || 0) })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('Stock update error:', error.message)
                return NextResponse.json({ error: error.message }, { status: 400 })
            }

            return NextResponse.json({ success: true, data })
        }

        return NextResponse.json({ error: '不正な type が指定されました' }, { status: 400 })
    } catch (err: any) {
        console.error('API PATCH Data Internal Error:', err)
        return NextResponse.json({ error: err.message || '在庫数更新エラーが発生しました' }, { status: 500 })
    }
}

// [NEW] DELETE: レアリティまたは手数料の削除
export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')
        const id = searchParams.get('id')

        if (!type || !id) {
            return NextResponse.json({ error: 'type と id は必須パラメータです' }, { status: 400 })
        }

        const tableName = type === 'rarity' ? 'rarities' : type === 'fee' ? 'fees' : null
        if (!tableName) {
            return NextResponse.json({ error: '不正な type が指定されました' }, { status: 400 })
        }

        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

        if (error) {
            console.error(`${tableName} delete error:`, error.message)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('API DELETE Data Internal Error:', err)
        return NextResponse.json({ error: err.message || 'データ削除エラーが発生しました' }, { status: 500 })
    }
}