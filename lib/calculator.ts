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
    postalCode?: string;
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
        return Math.ceil(2500 + weightKg * 850);
    } else {
        return Math.max(3500, Math.ceil(weightKg * 1800 + 3000));
    }
}

/**
 * 日本郵便（船便・APIなしのため固定概算テーブル計算）
 */
export function calculateJapanPostSeaFee(weightKg: number) {
    if (!weightKg || weightKg <= 0) {
        return { total: null, serviceName: '日本郵便 (船便)', deliveryDays: '約1〜2ヶ月', error: '重量が無効です' };
    }

    const baseFee = Math.ceil(2500 + weightKg * 850);
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
 * FedEx 運賃試算 API 呼び出し (preferredCurrency: 'JPY' で円建て強制取得)
 */
export async function calculateFedexRates(destination: string, postalCode: string | undefined, weightKg: number, credentials?: FedexCredentials) {
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

    // [UPDATED] 実際の注文で誤った概算送料を返さないよう、郵便番号未設定の場合は明確にエラーを返す
    if (!postalCode || postalCode.trim() === '') {
        return {
            rates: [],
            error: '郵便番号が未設定のため、FedExの正確な送料を計算できません。（ユーザー情報をご確認ください）'
        };
    }

    try {
        const token = await getFedexAccessToken(apiKey, secretKey, isSandbox);

        const shipDate = new Date();
        shipDate.setDate(shipDate.getDate() + 1);
        const formattedShipDate = shipDate.toISOString().split('T')[0];

        const payload: any = {
            requestedShipment: {
                shipper: {
                    address: {
                        streetLines: ['1-1-1 Chiyoda'],
                        city: 'Chiyoda-ku',
                        postalCode: '1000001',
                        countryCode: 'JP'
                    }
                },
                recipient: {
                    address: {
                        countryCode: destination,
                        postalCode: postalCode.trim()
                    }
                },
                shipTimestamp: formattedShipDate,
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                rateRequestType: ['ACCOUNT', 'LIST'],
                preferredCurrency: 'JPY',
                requestedPackageLineItems: [
                    {
                        groupPackageCount: 1,
                        weight: {
                            units: 'KG',
                            value: Number(weightKg.toFixed(2))
                        },
                        dimensions: {
                            length: 20,
                            width: 20,
                            height: 20,
                            units: 'CM'
                        }
                    }
                ]
            }
        };

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
            console.error('FedEx Quote API Error Details:', JSON.stringify(errData));
            
            return {
                rates: [],
                error: `API通信エラー: ${msg}`
            };
        }

        const data = await res.json();
        const rateReplyDetails = data?.output?.rateReplyDetails || [];

        const rates = rateReplyDetails.map((detail: any) => {
            const serviceName = detail.serviceName || detail.serviceType || 'FedEx Express';
            const shipmentDetail = detail.ratedShipmentDetails?.[0] || {};
            const netAmount = shipmentDetail.totalNetCharge || 0;
            const transitTime = detail.commit?.customTransitTime || detail.commit?.derivedTransitTime || '2-5 日';

            return {
                serviceName: `FedEx ${serviceName}`,
                total: Math.ceil(netAmount),
                deliveryDays: typeof transitTime === 'string' ? transitTime : '2-5 日'
            };
        });

        if (rates.length === 0) {
            return {
                rates: [],
                error: '利用可能な配送プランが見つかりませんでした。'
            };
        }

        return { rates, error: null };
    } catch (err: any) {
        console.error('FedEx Rate Error:', err);
        return {
            rates: [],
            error: `API通信エラー (${err.message})`
        };
    }
}

/**
 * 画面・APIルートから一括で送料を計算する統合関数
 */
export async function calculateShippingFees(params: CalculateShippingFeesParams) {
    const { destination, postalCode, weight, fedexCredentials } = params;

    const japanPost = calculateJapanPostSeaFee(weight);
    const fedexResult = await calculateFedexRates(destination, postalCode, weight, fedexCredentials);

    return {
        japanPost,
        fedexRates: fedexResult.rates,
        fedexError: fedexResult.error,
        exchangeRateInfo: null
    };
}