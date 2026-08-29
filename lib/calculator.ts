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
 * 日本郵便（船便）の概算送料計算
 */
export function calculateJapanPostSeaFee(weightKg: number) {
    if (!weightKg || weightKg <= 0) {
        return { total: null, serviceName: '日本郵便 (船便)', deliveryDays: '約1〜2ヶ月', error: '重量が無効です' };
    }

    const baseFee = Math.ceil(1000 + weightKg * 1200);
    return {
        total: baseFee,
        serviceName: '日本郵便 (船便)',
        deliveryDays: '約1〜2ヶ月',
        note: weightKg > 30 ? '※30kg超のため分割発送での試算となります' : undefined
    };
}

/**
 * FedEx API 認証トークン取得
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
 * [UPDATED] FedEx 運賃試算 API 呼び出し (Validation Error 対策版)
 */
export async function calculateFedexRates(destination: string, weightKg: number, credentials?: FedexCredentials) {
    const apiKey = credentials?.apiKey || process.env.FEDEX_API_KEY || process.env.FEDEX_CLIENT_ID;
    const secretKey = credentials?.secretKey || process.env.FEDEX_SECRET_KEY || process.env.FEDEX_CLIENT_SECRET;
    const accountNumber = credentials?.accountNumber || process.env.FEDEX_ACCOUNT_NUMBER;
    const fedexApiUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';
    const isSandbox = fedexApiUrl.includes('sandbox');

    if (!apiKey || !secretKey) {
        return {
            rates: [],
            error: 'FedEx APIキーが未設定です（環境変数 FEDEX_API_KEY / FEDEX_SECRET_KEY を確認してください）'
        };
    }

    try {
        const token = await getFedexAccessToken(apiKey, secretKey, isSandbox);

        // [NEW] 日付フォーマットの作成 (YYYY-MM-DD)
        const shipDate = new Date();
        shipDate.setDate(shipDate.getDate() + 1); // 翌日発送
        const formattedShipDate = shipDate.toISOString().split('T')[0];

        // [UPDATED] rateInputVO のバリデーションエラーを防ぐために送達先・差出人住所の必須フィールドを補完
        const payload: any = {
            requestedShipment: {
                shipper: {
                    address: {
                        streetLines: ['1-1-1 Chiyoda'],
                        city: 'Chiyoda-ku',
                        stateOrProvinceCode: 'TOKYO',
                        postalCode: '1000001',
                        countryCode: 'JP'
                    }
                },
                recipient: {
                    address: {
                        countryCode: destination
                    }
                },
                shipTimestamp: formattedShipDate,
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                rateRequestType: ['ACCOUNT'],
                requestedPackageLineItems: [
                    {
                        groupPackageCount: 1,
                        weight: {
                            units: 'KG',
                            value: Number(weightKg.toFixed(2))
                        }
                    }
                ]
            }
        };

        // [NEW] accountNumber が存在する場合のみオブジェクトを注入
        if (accountNumber && accountNumber.trim() !== '') {
            payload.accountNumber = {
                value: accountNumber.trim()
            };
        }

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
            console.error('FedEx Quote API Validation Error Details:', JSON.stringify(errData));
            
            // Validation Error 発生時は概算フォールバックで試算を継続
            const fallbackFee = Math.max(2500, Math.ceil(weightKg * 2500));
            return {
                rates: [
                    {
                        serviceName: 'FedEx International (概算試算)',
                        total: fallbackFee,
                        deliveryDays: '約2〜5日'
                    }
                ],
                error: `FedEx: ${msg}`
            };
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
 * 画面・APIルートから一括で送料を計算する統合関数
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