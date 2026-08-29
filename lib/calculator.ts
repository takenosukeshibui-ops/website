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
    isEstimate?: boolean;
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
 * FedEx 運賃試算 API 呼び出し
 */
export async function calculateFedexRates(
    destination: string, 
    postalCode: string | undefined, 
    weightKg: number, 
    isEstimate: boolean, 
    credentials?: FedexCredentials
) {
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

    // [UPDATED] 郵便番号の補完ロジックを確実に実行するよう修正
    let effectivePostalCode = postalCode?.trim();

    if (!effectivePostalCode) {
        if (isEstimate) {
            // シミュレーターおよびダッシュボード試算時用マッピング
            const defaultPostalCodes: Record<string, string> = {
                'JP': '100-0001', 'US': '90210', 'KR': '04524', 'CN': '100000', 'TW': '10491',
                'HK': '00000', 'MO': '00000', 'SG': '018956', 'TH': '10110', 'MY': '50000',
                'PH': '1000', 'VN': '100000', 'ID': '10110', 'IN': '110001', 'BN': 'BS8671',
                'KH': '12000', 'LA': '01000', 'CA': 'M4B 1B3', 'MX': '06000', 'BR': '01000-000',
                'AR': 'C1000', 'CL': '8320000', 'CO': '11001', 'PE': '15001', 'AU': '2000',
                'NZ': '1010', 'GB': 'W1A 1AA', 'DE': '10115', 'FR': '75001', 'IT': '00118',
                'ES': '28001', 'NL': '1011AB', 'BE': '1000', 'CH': '8000', 'SE': '11120',
                'NO': '0010', 'FI': '00100', 'DK': '1000', 'AT': '1010', 'PL': '00-001',
                'IE': 'D01V9V0', 'PT': '1000-001', 'GR': '10564', 'CZ': '11000', 'HU': '1011',
                'RO': '010011', 'SK': '81101', 'BG': '1000', 'HR': '10000', 'SI': '1000',
                'EE': '10111', 'LV': 'LV-1050', 'LT': '01100', 'LU': '1000', 'AE': '00000',
                'SA': '11564', 'IL': '91000', 'TR': '06000', 'QA': '00000', 'KW': '13001',
                'BH': '305', 'OM': '111', 'ZA': '0001', 'EG': '11511', 'MA': '10000',
                'KE': '00100', 'NG': '900001'
            };
            effectivePostalCode = defaultPostalCodes[destination] || '90210';
        } else {
            const fallbackFee = Math.max(3500, Math.ceil(weightKg * 1800 + 3000));
            return {
                rates: [
                    {
                        serviceName: 'FedEx International Priority (概算)',
                        total: fallbackFee,
                        deliveryDays: '2-5 日'
                    }
                ],
                error: '郵便番号が未設定のため、FedExの正確な送料を計算できません。（ユーザー情報をご確認ください）'
            };
        }
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
                        postalCode: '100-0001',
                        countryCode: 'JP'
                    }
                },
                recipient: {
                    address: {
                        countryCode: destination,
                        postalCode: effectivePostalCode
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
            
            const fallbackFee = Math.max(3500, Math.ceil(weightKg * 1800 + 3000));
            return {
                rates: [
                    {
                        serviceName: 'FedEx International Priority (概算)',
                        total: fallbackFee,
                        deliveryDays: '2-5 日'
                    }
                ],
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
            const fallbackFee = Math.max(3500, Math.ceil(weightKg * 1800 + 3000));
            return {
                rates: [
                    {
                        serviceName: 'FedEx International Priority (概算)',
                        total: fallbackFee,
                        deliveryDays: '2-5 日'
                    }
                ],
                error: '利用可能な配送プランが見つかりませんでした。'
            };
        }

        return { rates, error: null };
    } catch (err: any) {
        console.error('FedEx Rate Error:', err);
        const fallbackFee = Math.max(3500, Math.ceil(weightKg * 1800 + 3000));
        return {
            rates: [
                {
                    serviceName: 'FedEx International Priority (概算試算)',
                    total: fallbackFee,
                    deliveryDays: '2-5 日'
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
    const { destination, postalCode, weight, isEstimate = false, fedexCredentials } = params;

    const japanPost = calculateJapanPostSeaFee(weight);
    const fedexResult = await calculateFedexRates(destination, postalCode, weight, isEstimate, fedexCredentials);

    return {
        japanPost,
        fedexRates: fedexResult.rates,
        fedexError: fedexResult.error,
        exchangeRateInfo: null
    };
}