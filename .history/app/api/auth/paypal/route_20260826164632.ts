// app/api/auth/paypal/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    
    // リダイレクトURI（Local用。本番時は本番ドメインに変更）
    const redirectUri = encodeURIComponent('http://localhost:3000/api/auth/callback/paypal')
    
    // 要求する権限スコープ (openid, profile, email)
    const scope = encodeURIComponent('openid profile email')

    // PayPalのOAuth認可URL (Sandbox環境用)
    // ※本番環境に切り替える際は www.paypal.com に変更します
    const paypalAuthUrl = `https://www.sandbox.paypal.com/signin/authorize?client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${redirectUri}`

    return NextResponse.redirect(paypalAuthUrl)
}