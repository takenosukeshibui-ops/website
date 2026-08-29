// lib/wise.ts

const API_URL = process.env.WISE_API_URL || 'https://api.wise.com'
const API_TOKEN = process.env.WISE_API_TOKEN
// Profile ID から先頭の 'P' を除外した数字のみを抽出（APIリクエスト用）
const PROFILE_ID = process.env.WISE_PROFILE_ID?.replace(/^P/i, '')

/**
 * Wise API 共通リクエスト関数
 */
async function fetchWise(endpoint: string, options: RequestInit = {}) {
    if (!API_TOKEN) {
        throw new Error('WISE_API_TOKEN is not defined in environment variables.')
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Wise API Error:', errorData)
        throw new Error(`Wise API Error [${response.status}]: ${JSON.stringify(errorData)}`)
    }

    return response.json()
}

/**
 * 1. Quotes（見積もり作成）
 * 送金通貨・受取通貨・金額から手数料や為替レートを取得
 */
export async function createWiseQuote(targetAccountEmail: string, sourceCurrency = 'JPY', targetCurrency = 'JPY', amount = 1000) {
    return fetchWise('/v3/profiles/' + PROFILE_ID + '/quotes', {
        method: 'POST',
        body: JSON.stringify({
            sourceCurrency,
            targetCurrency,
            targetAmount: amount, // 受取人が受け取る金額
            payOut: 'BANK_TRANSFER',
        }),
    })
}

/**
 * 2. Recipients（受取人（メールアドレス指定）の登録）
 * Wise to Wise または メールアドレス宛て送金先オブジェクトを作成
 */
export async function createWiseRecipient(email: string, fullName: string, currency = 'JPY') {
    return fetchWise('/v1/accounts', {
        method: 'POST',
        body: JSON.stringify({
            profile: Number(PROFILE_ID),
            accountHolderName: fullName,
            currency: currency,
            type: 'email',
            details: {
                email: email,
            },
        }),
    })
}

/**
 * 3. Transfers（送金実行指示の作成）
 * 見積もり（Quote ID）と受取人（Recipient ID）を紐付けて送金を作成
 */
export async function createWiseTransfer(quoteId: string, recipientId: number, customerTransactionId: string) {
    return fetchWise('/v1/transfers', {
        method: 'POST',
        body: JSON.stringify({
            targetAccount: recipientId,
            quoteUuid: quoteId,
            customerTransactionId: customerTransactionId, // 重複実行防止用のユニークID (UUID等)
        }),
    })
}