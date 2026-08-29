// app/api/auth/paypal/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    
    // PayPalに初期登録されているReturn URLを指定
    const redirectUri = 'nativexo://paypalpay'

    const params = new URLSearchParams({
        client_id: clientId || '',
        response_type: 'code',
        scope: 'openid profile email',
        redirect_uri: redirectUri,
    })

    const paypalAuthUrl = `https://www.sandbox.paypal.com/signin/authorize?${params.toString()}`

    return NextResponse.redirect(paypalAuthUrl)
}