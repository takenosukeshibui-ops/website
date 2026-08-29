// [UPDATED]
import { NextResponse } from 'next/server'
import { calculateShippingFees } from '@/lib/calculator'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { destination, weight, targetCurrency } = body

    if (!destination || weight === undefined || weight === null) {
      return NextResponse.json(
        { success: false, error: 'destination と weight は必須パラメーターです' },
        { status: 400 }
      )
    }

    // [NEW] 環境変数の柔軟な読み込み (FEDEX_API_KEY / FEDEX_CLIENT_ID 対応)
    const apiKey = process.env.FEDEX_API_KEY || process.env.FEDEX_CLIENT_ID
    const secretKey = process.env.FEDEX_SECRET_KEY || process.env.FEDEX_CLIENT_SECRET
    const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER

    if (!apiKey || !secretKey) {
      console.warn('⚠️ FedEx APIキーがVercel環境変数に設定されていません。')
    }

    // [UPDATED] 送料計算処理の実行
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

    // [UPDATED] 成功レスポンス（FedEx側で個別エラーがあっても日本郵便などの結果を添えて返却）
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