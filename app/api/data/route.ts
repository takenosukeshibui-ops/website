// app/api/data/route.ts
// [UPDATED] 原価 (cost_price) および 利益率タイプ (profit_type) の保存・取得処理を追加
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: レアリティおよび手数料一覧の取得
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

// [UPDATED] POST: レアリティまたは手数料の新規登録 (cost_price, profit_type 対応)
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const body = await req.json()

        // [NEW] cost_price (原価), profit_type (利益率タイプ) を追加取得
        const { type, name, price, cost_price, tax, weight, stock, rate, sell_price, profit_rate, profit_type } = body 

        if (type === 'rarity') {
            const parsedPrice = Number(price) || 0
            const parsedTax = Number(tax) || 0
            // 原価が指定されていない場合は仕入れ単価から還付控除分を自動試算
            const calculatedCost = cost_price !== undefined && cost_price !== '' && !isNaN(Number(cost_price))
                ? Number(cost_price)
                : Math.floor(parsedPrice - (parsedPrice * (parsedTax / 100)))

            const { data, error } = await supabase
                .from('rarities')
                .insert({
                    name,
                    price: parsedPrice, // 仕入れ単価
                    cost_price: calculatedCost, // [NEW] 原価
                    sell_price: Number(sell_price) || 0, // 販売価格
                    profit_rate: Number(profit_rate) || 0, // [NEW] 手動入力利益率
                    profit_type: profit_type || 'cost', // [NEW] 利益率タイプ ('cost' | 'sales')
                    tax: parsedTax,
                    weight: Number(weight) || 0,
                    stock: Number(stock) || 0 
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

// PATCH: 在庫数の即時更新用API
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

// DELETE: レアリティまたは手数料の削除
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