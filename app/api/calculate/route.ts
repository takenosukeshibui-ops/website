// [UPDATED]
import { NextResponse } from 'next/server'
import { calculateShippingFees } from '@/lib/calculator'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { destination, weight, targetCurrency } = body

    if (!destination || !weight) {
      return NextResponse.json(
        { success: false, error: 'destination と weight は必須パラメーターです' },
        { status: 400 }
      )
    }

    // [NEW] 環境変数名の表記揺れ（FEDEX_CLIENT_ID / FEDEX_API_KEY）を両方フォールバック読み込み
    const apiKey = process.env.FEDEX_CLIENT_ID || process.env.FEDEX_API_KEY
    const secretKey = process.env.FEDEX_CLIENT_SECRET || process.env.FEDEX_SECRET_KEY
    const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER

    if (!apiKey || !secretKey) {
      console.warn('⚠️ FedEx APIキーがVercel環境変数に設定されていません。')
    }

    const result = await calculateShippingFees({
      destination,
      weight: Number(weight),
      targetCurrency: targetCurrency || 'JPY',
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
    console.error('送料計算APIエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '送料の計算中にエラーが発生しました',
      },
      { status: 500 }
    )
  }
}