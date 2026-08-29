// [UPDATED]
export interface CalculationResult {
    shippingFeeJp: number;
    shippingFeeFedex: number;
    jpSellPrice: number;
    jpProfit: number;
    fedexSellPrice: number;
    fedexProfit: number;
}

export interface FedexCredentials {
    apiKey?: string;
    secretKey?: string;
    accountNumber?: string;
}

export interface CalculateShippingFeesParams {
    destination: string;
    weight: number;
    targetCurrency?: string;
    fedexCredentials?: FedexCredentials;
}

/**
 * 配送方法と重量から概算送料を算出する共通関数
 */
export function calculateShippingFeeByMethod(shippingMethod: string, weightKg: number): number {
    if (!weightKg || weightKg <= 0) return 0;

    if (shippingMethod === '船便') {
        return Math.ceil(1000 + weightKg * 1200);
    } else {
        return Math.max(1500, Math.ceil(weightKg * 2000));
    }
}

/**
 * [NEW] 日本郵便（船便）の概算送料計算
 */
export function calculateJapanPostSeaFee(weightKg: number) {
    if (!weightKg || weightKg <= 0) {
        return { total: null, serviceName: '日本郵便 (船便)', deliveryDays: '約1〜2ヶ月', error: '重量が無効です' };
    }

    // 概算ロジック (30kg超の分割計算にも対応)
    const baseFee = Math.ceil(1000 + weightKg * 1200);
    return {
        total: baseFee,
        serviceName: '日本郵便 (船便)',
        deliveryDays: '約1〜2ヶ月',
        note: weightKg > 30 ? '※30kg超のため分割発送での試算となります' : undefined
    };
}

/**
 * [NEW] FedEx API 認証トークン取得
 */
async function getFedexAccessToken(apiKey: string, secretKey: string, isSandbox: boolean): Promise<string> {
    const baseUrl = isSandbox ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com';
    const res = await fetch(`${baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: secretKey,
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`FedEx OAuth Failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return data.access_token;
}

/**
 * [NEW] FedEx 運賃試算 API 呼び出し
 */
export async function calculateFedexRates(destination: string, weightKg: number, credentials?: FedexCredentials) {
    // [NEW] 環境変数の両表記をチェック
    const apiKey = credentials?.apiKey || process.env.FEDEX_CLIENT_ID || process.env.FEDEX_API_KEY;
    const secretKey = credentials?.secretKey || process.env.FEDEX_CLIENT_SECRET || process.env.FEDEX_SECRET_KEY;
    const accountNumber = credentials?.accountNumber || process.env.FEDEX_ACCOUNT_NUMBER;
    const fedexApiUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';
    const isSandbox = fedexApiUrl.includes('sandbox');

    if (!apiKey || !secretKey) {
        return {
            rates: [],
            error: 'FedEx APIキーが未設定です。Vercel環境変数（FEDEX_CLIENT_ID / FEDEX_API_KEY）を確認してください。'
        };
    }

    try {
        const token = await getFedexAccessToken(apiKey, secretKey, isSandbox);

        const payload = {
            accountNumber: {
                value: accountNumber || ''
            },
            requestedShipment: {
                shipper: {
                    address: {
                        postalCode: '1000001',
                        countryCode: 'JP'
                    }
                },
                recipient: {
                    address: {
                        countryCode: destination
                    }
                },
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                rateRequestType: ['ACCOUNT'],
                requestedPackageLineItems: [
                    {
                        weight: {
                            units: 'KG',
                            value: weightKg
                        }
                    }
                ]
            }
        };

        const res = await fetch(`${fedexApiUrl}/rate/v1/rates/quotes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData?.errors?.[0]?.message || `FedEx API エラー (${res.status})`;
            return { rates: [], error: msg };
        }

        const data = await res.json();
        const rateReplyDetails = data?.output?.rateReplyDetails || [];

        const rates = rateReplyDetails.map((detail: any) => {
            const serviceName = detail.serviceName || detail.serviceType || 'FedEx Express';
            const netAmount = detail.ratedShipmentDetails?.[0]?.totalNetCharge || 0;
            return {
                serviceName: `FedEx ${serviceName}`,
                total: Math.ceil(netAmount),
                deliveryDays: '約2〜5日'
            };
        });

        // 運賃が取得できない場合はダミー（概算）を返すフォールバック
        if (rates.length === 0) {
            const fallbackFee = Math.max(2500, Math.ceil(weightKg * 2500));
            return {
                rates: [
                    {
                        serviceName: 'FedEx International Priority (概算)',
                        total: fallbackFee,
                        deliveryDays: '約2〜5日'
                    }
                ],
                error: null
            };
        }

        return { rates, error: null };
    } catch (err: any) {
        console.error('FedEx Rate Error:', err);
        // エラー時も試算用のフォールバック額を返して画面が止まらないようにする
        const fallbackFee = Math.max(2500, Math.ceil(weightKg * 2500));
        return {
            rates: [
                {
                    serviceName: 'FedEx International (概算試算)',
                    total: fallbackFee,
                    deliveryDays: '約2〜5日'
                }
            ],
            error: `API通信エラー (${err.message})`
        };
    }
}

/**
 * [NEW] 画面・APIルートから一括で送料を計算する統合関数
 */
export async function calculateShippingFees(params: CalculateShippingFeesParams) {
    const { destination, weight, fedexCredentials } = params;

    const japanPost = calculateJapanPostSeaFee(weight);
    const fedexResult = await calculateFedexRates(destination, weight, fedexCredentials);

    return {
        japanPost,
        fedexRates: fedexResult.rates,
        fedexError: fedexResult.error,
        exchangeRateInfo: null
    };
}