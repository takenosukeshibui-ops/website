import { createClient } from '@/lib/supabase/server'

/**
 * 管理者（role = 'admin'）のメールアドレス一覧を取得
 */
export async function getAdminEmails(): Promise<string[]> {
  const supabase = await createClient()
  
  // profiles テーブルから role が admin のユーザーの email を取得
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'admin')

  if (error || !data || data.length === 0) {
    // DBから取得できない場合は環境変数をフォールバックに使用
    const envAdminEmail = process.env.ADMIN_EMAIL
    return envAdminEmail ? [envAdminEmail] : []
  }

  return data.map((p) => p.email).filter((email): email is string => Boolean(email))
}


/**
 * 管理者へ注文通知メールを送信（Resend APIを利用する例）
 */
export async function sendOrderNotificationToAdmin(orderDetails: {
  orderId: string
  userEmail: string
  itemCount: number
  shippingMethod: string
  paymentMethod: string
}) {
  const adminEmails = await getAdminEmails()

  if (adminEmails.length === 0) {
    console.warn('管理者メールアドレスが見つかりませんでした。通知メールをスキップします。')
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY が未設定のため、メール送信をスキップします。')
    return
  }

  const { orderId, userEmail, itemCount, shippingMethod, paymentMethod } = orderDetails

  const subject = `【新着注文】新しい購入依頼が届きました (注文ID: ${orderId.slice(0, 8)})`
  const text = `
管理者様

新しい購入依頼（注文）が送信されました。

■ 注文概要
・注文ID: ${orderId}
・依頼ユーザー: ${userEmail}
・商品数: ${itemCount} 点
・配送方法: ${shippingMethod}
・決済方法: ${paymentMethod}

管理画面より詳細をご確認ください。
`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev', // 発信元アドレス
        to: adminEmails,
        subject: subject,
        text: text,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('メール送信失敗:', err)
    }
  } catch (error) {
    console.error('メール送信エラー:', error)
  }
}