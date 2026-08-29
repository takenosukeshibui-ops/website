// app/api/wise/quote/route.ts
import { NextResponse } from 'next/server' // [UPDATED] 'next' から 'next/server' に修正
import { getWiseQuoteDetails } from '@/lib/wise'

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}))
        const { amount, sourceCurrency = 'JPY', targetCurrency = 'JPY' } = body

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: '有効な金額を入力してください。' }, { status: 400 })
        }

        // Wise Quote 取得の実行
        const quoteDetails = await getWiseQuoteDetails(Number(amount), sourceCurrency, targetCurrency)

        if (!quoteDetails) {
            return NextResponse.json({
                success: false,
                message: 'Wise API Token 未設定または認証エラーのためフォールバックします。'
            }, { status: 200 })
        }

        return NextResponse.json({
            success: true,
            quote: quoteDetails
        })
    } catch (err: any) {
        console.error('Wise Quote API Route Error:', err)
        return NextResponse.json({
            success: false,
            error: err.message || '内部エラーが発生しました。'
        }, { status: 500 })
    }
}