// lib/paypal.ts

const PAYPAL_FEE_RATE = Number(process.env.PAYPAL_FEE_RATE || '0.081') // 8.1%
const PAYPAL_FIXED_FEE = Number(process.env.PAYPAL_FIXED_FEE || '40')   // 40 JPY

/**
 * PayPal 決済手数料および合計請求金額の計算
 * @param baseAmount 商品＋代理手数料＋送料の小計 (JPY)
 */
export function calculatePayPalFee(baseAmount: number) {
    if (!baseAmount || baseAmount <= 0) {
        return {
            paymentFee: 0,
            grandTotal: 0,
            feeDetail: '8.1% + 40円 (海外決済+為替換算)'
        }
    }

    // バック計算式: (小計 + 固定費) / (1 - 手数料率)
    const gross = (baseAmount + PAYPAL_FIXED_FEE) / (1 - PAYPAL_FEE_RATE)
    const paymentFee = Math.ceil(gross - baseAmount)
    const grandTotal = baseAmount + paymentFee

    return {
        paymentFee: paymentFee > 0 ? paymentFee : 0,
        grandTotal: grandTotal > baseAmount ? grandTotal : baseAmount,
        feeDetail: `${(PAYPAL_FEE_RATE * 100).toFixed(1)}% + ${PAYPAL_FIXED_FEE}円 (海外決済+為替換算)`
    }
}