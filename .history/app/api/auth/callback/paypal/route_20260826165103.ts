// app/api/auth/callback/paypal/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.redirect(new URL('/dashboard/settings?error=paypal_cancel', request.url))
    }

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET!
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    try {
        // 1. 認可コードからアクセストークンを取得 (Sandbox)
        const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
            }),
        })

        const tokenData = await tokenRes.json()

        if (!tokenData.access_token) {
            throw new Error('Failed to get access token')
        }

        // 2. アクセストークンを使ってユーザー情報を取得
        const userRes = await fetch('https://api-m.sandbox.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
        })

        const userData = await userRes.json()
        const paypalEmail = userData.email

        if (!paypalEmail) {
            throw new Error('PayPal email not found')
        }

        // 3. Supabaseにログイン中ユーザーの paypal_email として保存
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            await supabase
                .from('profiles')
                .update({ paypal_email: paypalEmail })
                .eq('id', user.id)
        }

        // 成功したら設定画面へリダイレクト
        return NextResponse.redirect(new URL('/dashboard/settings?success=paypal_linked', request.url))

    } catch (error) {
        console.error('PayPal Auth Error:', error)
        return NextResponse.redirect(new URL('/dashboard/settings?error=paypal_failed', request.url))
    }
}