// [UPDATED]
import { NextResponse } from 'next/server'
import { calculateShippingFees } from '@/lib/calculator'

// Vercelキャッシュを無効化
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { destination, postalCode, weight, targetCurrency, isEstimate } = body

    if (!destination || weight === undefined || weight === null) {
      return NextResponse.json(
        { success: false, error: 'destination と weight は必須パラメーターです' },
        { status: 400 }
      )
    }

    const apiKey = process.env.FEDEX_API_KEY || process.env.FEDEX_CLIENT_ID
    const secretKey = process.env.FEDEX_SECRET_KEY || process.env.FEDEX_CLIENT_SECRET
    const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER

    if (!apiKey || !secretKey) {
      console.warn('⚠️ FedEx APIキーがVercel環境変数に設定されていません。')
    }

    const result = await calculateShippingFees({
      destination,
      postalCode,
      weight: Number(weight),
      targetCurrency: targetCurrency || 'JPY',
      isEstimate: isEstimate === true,
      fedexCredentials: {
        apiKey,
        secretKey,
        accountNumber,
      },
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('送料計算API内部エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '送料の計算中にサーバーエラーが発生しました',
      },
      { status: 500 }
    )
  }
}