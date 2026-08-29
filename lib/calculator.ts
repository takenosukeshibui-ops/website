// lib/calculator.ts

export interface CalculationResult {
    shippingFeeJp: number;
    shippingFeeFedex: number;
    jpSellPrice: number;
    jpProfit: number;
    fedexSellPrice: number;
    fedexProfit: number;
}

/**
 * 配送方法と重量から概算送料を算出する共通関数
 */
export function calculateShippingFeeByMethod(shippingMethod: string, weightKg: number): number { // [NEW]
    if (!weightKg || weightKg <= 0) return 0;

    if (shippingMethod === '船便') {
        return Math.ceil(1000 + weightKg * 1200);
    } else {
        return Math.max(1500, Math.ceil(weightKg * 2000));
    }
}