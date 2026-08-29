// app/actions/wise.ts
'use server'

import { createWiseQuote, createWiseRecipient, createWiseTransfer } from '@/lib/wise'
// プロジェクトのSupabase Server Clientの正確なパスに書き換えてください
// 例: '@/utils/supabase/server' でエラーになる場合は '@/lib/supabase/server' など
import { createClient } from '@/lib/supabase/server'

export async function executeWisePayout(targetUserId: string, amount: number) {
    try {
        const supabase = await createClient()

        // 1. 対象ユーザーのWise用メールアドレスを取得
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('wise_email, full_name')
            .eq('id', targetUserId)
            .single()

        if (error || !profile?.wise_email) {
            return { success: false, error: 'Wise用メールアドレスが登録されていません。' }
        }

        // 2. Quotes（見積もり）作成
        const quote = await createWiseQuote(profile.wise_email, 'JPY', 'JPY', amount)

        // 3. Recipient（受取人）登録
        const recipient = await createWiseRecipient(
            profile.wise_email,
            profile.full_name || 'Recipient User'
        )

        // 4. Transfers（送金指示）作成
        const transactionId = crypto.randomUUID() // 標準の globalThis.crypto を使用
        const transfer = await createWiseTransfer(quote.id, recipient.id, transactionId)

        return {
            success: true,
            data: {
                transferId: transfer.id,
                status: transfer.status,
                amount: amount,
                email: profile.wise_email,
            },
        }
    } catch (err: any) {
        console.error('Wise Payout Action Error:', err)
        return { success: false, error: err.message || 'Wise送金処理に失敗しました。' }
    }
}