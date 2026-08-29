// lib/wise.ts

const API_URL = (process.env.WISE_API_URL || 'https://api.wise.com').trim()
const rawToken = process.env.WISE_API_TOKEN || ''
const API_TOKEN = rawToken.replace(/['"]/g, '').trim()

const rawProfileId = process.env.WISE_PROFILE_ID || ''
const PROFILE_ID = rawProfileId.replace(/^P/i, '').replace(/['"]/g, '').trim()

/**
 * Wise API 共通リクエスト関数
 */
async function fetchWise(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    }

    if (API_TOKEN) {
        headers['Authorization'] = `Bearer ${API_TOKEN}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`Wise API Fetch Failed [Status ${response.status}]:`, errorData)
        throw new Error(`Wise API Error [${response.status}]: ${JSON.stringify(errorData)}`)
    }

    return response.json()
}

/**
 * 1. Quotes（見積もり作成）
 */
export async function createWiseQuote(targetAccountEmail?: string, sourceCurrency = 'USD', targetCurrency = 'JPY', amount = 1000) {
    const endpoint = PROFILE_ID && API_TOKEN ? `/v3/profiles/${PROFILE_ID}/quotes` : '/v3/quotes'

    return fetchWise(endpoint, {
        method: 'POST',
        body: JSON.stringify({
            sourceCurrency,
            targetCurrency,
            targetAmount: amount, // 日本円で受け取りたい目標金額 (JPY)
            payOut: 'BANK_TRANSFER',
        }),
    })
}

/**
 * リアルタイム手数料取得用の安全なヘルパー関数
 * [UPDATED] 概算補正を排除し、Wise APIのリアルタイム外貨手数料(USD等)にリアルタイム為替レート(rate)を乗算して正確な日本円(JPY)手数料を算出
 */
export async function getWiseQuoteDetails(amount: number, sourceCurrency = 'USD', targetCurrency = 'JPY') {
    const actualSourceCurrency = sourceCurrency === targetCurrency ? 'USD' : sourceCurrency

    try {
        const quote = await createWiseQuote(undefined, actualSourceCurrency, targetCurrency, amount)

        // Wise v3 API の paymentOptions から正確な外貨建て手数料を抽出
        let extractedFee = 0
        if (Array.isArray(quote.paymentOptions) && quote.paymentOptions.length > 0) {
            const defaultOption = quote.paymentOptions.find((opt: any) => opt.disabled === false) || quote.paymentOptions[0]
            extractedFee = defaultOption?.fee?.total ?? defaultOption?.feeDetails?.total ?? 0
        }

        const rawFeeInSourceCurrency = extractedFee || quote.fee || quote.feeDetails?.total || 0
        const exchangeRate = quote.rate || 1

        // [NEW] Wise APIで取得したリアルタイム手数料 (例: USD) × リアルタイム為替レート (JPY/USD) で正確な日本円手数料を算出
        const exactFeeInJpy = Math.ceil(rawFeeInSourceCurrency * exchangeRate)

        return {
            quoteId: quote.id || 'public-quote',
            fee: exactFeeInJpy, // [UPDATED] 精確な日本円（円単位切り上げ整数）
            rate: Number(exchangeRate),
            sourceAmount: Number(quote.sourceAmount || (amount / exchangeRate)),
            targetAmount: Number(quote.targetAmount || amount),
            sourceCurrency: actualSourceCurrency,
        }
    } catch (error) {
        console.error('Wise Quote 取得例外 (Fallback適用):', error)
        // Wise API通信不能時のみの標準フォールバック試算 (標準3.6% + 40円)
        const fallbackFee = Math.ceil((amount + 40) / (1 - 0.036) - amount)
        return {
            quoteId: 'fallback-local',
            fee: fallbackFee,
            rate: 1,
            sourceAmount: amount + fallbackFee,
            targetAmount: amount,
            sourceCurrency: actualSourceCurrency
        }
    }
}

/**
 * 2. Recipients（受取人の登録）
 */
export async function createWiseRecipient(email: string, fullName: string, currency = 'JPY') {
    if (!PROFILE_ID) {
        throw new Error('WISE_PROFILE_ID is not defined in environment variables.')
    }

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
 */
export async function createWiseTransfer(quoteId: string, recipientId: number, customerTransactionId: string) {
    return fetchWise('/v1/transfers', {
        method: 'POST',
        body: JSON.stringify({
            targetAccount: recipientId,
            quoteUuid: quoteId,
            customerTransactionId: customerTransactionId,
        }),
    })
}