// app/api/admin/paypal/invoice/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PayPal アクセストークン取得ヘルパー
async function getPayPalAccessToken() {
    const isSandbox = process.env.PAYPAL_MODE !== 'live'
    const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
    const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    const secret = process.env.PAYPAL_CLIENT_SECRET

    if (!clientId || !secret) {
        throw new Error('PAYPAL_CLIENT_ID または PAYPAL_CLIENT_SECRET が環境変数に設定されていません。')
    }

    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${auth}`,
        },
        body: 'grant_type=client_credentials',
    })

    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`PayPal OAuth Token 取得エラー (${res.status}): ${errText}`)
    }

    const data = await res.json()
    return { accessToken: data.access_token, baseUrl }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1. 管理者権限チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: '認証エラーが発生しました。' }, { status: 401 })
        }

        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (adminProfile?.role !== 'admin') {
            return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 })
        }

        // 2. リクエスト解析
        const { orderId, orderNumber, recipientEmail, amount } = await req.json()

        if (!recipientEmail || !amount) {
            return NextResponse.json({ error: '受取人Emailおよび請求金額は必須です。' }, { status: 400 })
        }

        // 3. PayPal アクセストークン取得
        const { accessToken, baseUrl } = await getPayPalAccessToken()

        // 請求書番号の重複 (DUPLICATE_INVOICE_NUMBER) を回避するためタイムスタンプを付与してユニーク化
        const uniqueInvoiceNumber = `INV-${orderNumber ? `${orderNumber}-${Date.now()}` : Date.now()}`

        // 4. Draft Invoice（ドラフト請求書）の作成
        const draftPayload: any = {
            detail: {
                invoice_number: uniqueInvoiceNumber,
                reference: String(orderId),
                currency_code: 'JPY',
                note: 'ご利用ありがとうございます。代金のお支払いをお願いいたします。',
                payment_term: {
                    term_type: 'DUE_ON_RECEIPT',
                },
            },
            invoicer: {
                name: {
                    given_name: 'Store',
                    surname: 'Admin',
                },
            },
            primary_recipients: [
                {
                    billing_info: {
                        email_address: recipientEmail,
                    },
                },
            ],
            items: [
                {
                    name: `Order #${orderNumber || orderId}`,
                    quantity: '1',
                    unit_amount: {
                        currency_code: 'JPY',
                        value: String(amount),
                    },
                },
            ],
        }

        if (process.env.PAYPAL_INVOICER_EMAIL) {
            draftPayload.invoicer.email_address = process.env.PAYPAL_INVOICER_EMAIL
        }

        const draftRes = await fetch(`${baseUrl}/v2/invoicing/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(draftPayload),
        })

        const draftData = await draftRes.json()

        if (!draftRes.ok) {
            console.error('PayPal Draft Invoice 作成エラー:', draftData)
            const detailedMsg = draftData.message || draftData.details?.[0]?.description || 'PayPal ドラフト請求書の作成に失敗しました。'
            return NextResponse.json({
                error: detailedMsg,
                details: draftData,
            }, { status: 400 })
        }

        // [NEW] 柔軟な ID 取得ロジック (ルート id, links 配列, Href等からの抽出)
        let invoiceId = draftData.id

        if (!invoiceId && Array.isArray(draftData.links)) {
            const selfLink = draftData.links.find((l: any) => l.rel === 'self' || l.rel === 'send')
            if (selfLink?.href) {
                const parts = selfLink.href.split('/')
                invoiceId = parts[parts.length - 1] || parts[parts.length - 2]
            }
        }

        if (!invoiceId && draftData.href) {
            const parts = draftData.href.split('/')
            invoiceId = parts[parts.length - 1]
        }

        if (!invoiceId) {
            console.error('PayPal Invoice Draft Response (ID未検出):', JSON.stringify(draftData, null, 2))
            return NextResponse.json({
                error: '作成された PayPal 請求書 ID の取得に失敗しました。',
                details: draftData
            }, { status: 500 })
        }

        // 5. 請求書の送信 (Send Invoice)
        const sendRes = await fetch(`${baseUrl}/v2/invoicing/invoices/${invoiceId}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                send_to_recipient: true,
            }),
        })

        if (!sendRes.ok) {
            const sendErrData = await sendRes.json().catch(() => ({}))
            console.error('PayPal Invoice Send API エラー詳細:', JSON.stringify(sendErrData, null, 2))
            
            const detailedMsg = sendErrData.message || sendErrData.details?.[0]?.description || 'PayPal 請求書の送信処理でエラーが発生しました。'
            return NextResponse.json({
                error: `請求書ドラフトの作成は成功しましたが送信に失敗しました: ${detailedMsg}`,
                invoiceId: invoiceId,
                details: sendErrData
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            invoiceId: invoiceId,
        })
    } catch (err: any) {
        console.error('PayPal Invoice API Internal Error:', err)
        return NextResponse.json({ error: err.message || 'サーバー内部エラーが発生しました。' }, { status: 500 })
    }
}