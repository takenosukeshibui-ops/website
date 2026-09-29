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

// 国コード(ISO 2文字)から日本郵便の地帯(1〜5)を取得するヘルパー関数
export function getJapanPostZone(countryCode?: string): number {
    if (!countryCode) return 4; // 未指定時はデフォルトで第4地帯(米国)
    const code = countryCode.toUpperCase();
    
    // 第1地帯（中国・韓国・台湾）
    if (['CN', 'KR', 'TW'].includes(code)) return 1;
    // 第4地帯（米国・米領）
    if (['US', 'GU', 'MP', 'PR', 'VI', 'AS'].includes(code)) return 4;
    // 第2地帯（アジア全般）
    if (['IN', 'ID', 'KH', 'SG', 'LK', 'TH', 'NP', 'PK', 'BD', 'PH', 'BT', 'BN', 'VN', 'HK', 'MO', 'MY', 'MM', 'MV', 'MN', 'LA', 'TL'].includes(code)) return 2;
    // 第5地帯（中南米・アフリカ）
    if (['AR', 'UY', 'EC', 'SV', 'GP', 'CU', 'CR', 'CO', 'JM', 'CL', 'TT', 'PA', 'PY', 'BB', 'GF', 'BR', 'VE', 'PE', 'HN', 'MQ', 'DZ', 'UG', 'EG', 'ET', 'GH', 'GA', 'KE', 'CI', 'SL', 'DJ', 'ZW', 'SD', 'SN', 'TZ', 'TN', 'TG', 'NG', 'BW', 'MG', 'ZA', 'MU', 'MA', 'RW', 'RE'].includes(code)) return 5;
    
    // 第3地帯（オセアニア・カナダ・中近東・欧州など）
    return 3;
}

/**
 * 配送方法と重量から概算送料を算出する共通関数
 */
export function calculateShippingFeeByMethod(shippingMethod: string, weightKg: number, zone: number = 4): number {
    if (!weightKg || weightKg <= 0) return 0;

    if (shippingMethod === '船便') {
        const billedWeight = Math.ceil(weightKg);
        let fee = 0;

        switch (zone) {
            case 1: // 第1地帯
                fee = 1800 + (billedWeight - 1) * 400;
                break;
            case 2: // 第2地帯
                fee = billedWeight <= 10 
                    ? 2100 + (billedWeight - 1) * 500 
                    : 2100 + (9 * 500) + (billedWeight - 10) * 400;
                break;
            case 3: // 第3地帯
                fee = billedWeight <= 10 
                    ? 2500 + (billedWeight - 1) * 600 
                    : 2500 + (9 * 600) + (billedWeight - 10) * 400;
                break;
            case 4: // 第4地帯
                fee = billedWeight <= 10 
                    ? 2600 + (billedWeight - 1) * 700 
                    : 2600 + (9 * 700) + (billedWeight - 10) * 600;
                break;
            case 5: // 第5地帯
                fee = billedWeight <= 10 
                    ? 2700 + (billedWeight - 1) * 700 
                    : 2700 + (9 * 700) + (billedWeight - 10) * 600;
                break;
            default:
                fee = billedWeight <= 10 
                    ? 2600 + (billedWeight - 1) * 700 
                    : 2600 + (9 * 700) + (billedWeight - 10) * 600;
                break;
        }

        // 基本料金＋追加重量分＋書留料金(460円)
        return fee + 460;
    } else {
        return Math.max(3500, Math.ceil(weightKg * 1800 + 3000));
    }
}

/**
 * 日本郵便（船便・APIなしのため固定概算テーブル計算）
 */
export function calculateJapanPostSeaFee(weightKg: number, destination?: string) {
    if (!weightKg || weightKg <= 0) {
        return { total: null, serviceName: '日本郵便 (船便)', deliveryDaysJa: '約1〜3ヶ月', deliveryDaysEn: 'Approx 1-3 months', error: '重量が無効です' };
    }

    const zone = getJapanPostZone(destination);
    const baseFee = calculateShippingFeeByMethod('船便', weightKg, zone);

    return {
        total: baseFee,
        serviceName: '日本郵便 (船便)',
        deliveryDaysJa: '約1〜3ヶ月',
        deliveryDaysEn: 'Approx 1-3 months',
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

    let effectivePostalCode = postalCode?.trim();

    if (!effectivePostalCode) {
        if (isEstimate) {
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
                        deliveryDaysJa: '1-3 日',
                        deliveryDaysEn: '1-3 Days'
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
                        deliveryDaysJa: '1-3 日',
                        deliveryDaysEn: '1-3 Days'
                    }
                ],
                error: `API通信エラー: ${msg}`
            };
        }

        const data = await res.json();
        const rateReplyDetails = data?.output?.rateReplyDetails || [];

        const rates = rateReplyDetails.map((detail: any) => {
            const serviceName = detail.serviceName || detail.serviceType || 'FedEx Express';
            
            const ratedDetails = detail.ratedShipmentDetails || [];
            const accountRate = ratedDetails.find((r: any) => 
                r.rateType?.includes('ACCOUNT')
            ) || ratedDetails[0] || {};

            const netAmount = accountRate.totalNetCharge || 0;

            // 🌟 プラン毎の標準配達日数を設定
            let deliveryDaysJa = '2-5 日';
            let deliveryDaysEn = '2-5 Days';
            
            // 🌟 First も Priority と同じ 1-3日に設定
            if (serviceName.includes('First')) {
                deliveryDaysJa = '1-3 日';
                deliveryDaysEn = '1-3 Days';
            } else if (serviceName.includes('Priority')) {
                deliveryDaysJa = '1-3 日';
                deliveryDaysEn = '1-3 Days';
            } else if (serviceName.includes('Economy')) {
                deliveryDaysJa = '4-6 日';
                deliveryDaysEn = '4-6 Days';
            } else if (serviceName.includes('Connect Plus')) {
                deliveryDaysJa = '2-5 日';
                deliveryDaysEn = '2-5 Days';
            }

            const packageRateDetail = accountRate.ratedPackages?.[0]?.packageRateDetail || {};
            const netFreight = Number(packageRateDetail.netFreight || 0);

            const rateDetails = accountRate.shipmentRateDetail || {};
            const detailedSurcharges: { nameJa: string; nameEn: string; amount: number }[] = [];

            if (Array.isArray(rateDetails.surCharges)) {
                rateDetails.surCharges.forEach((sc: any) => {
                    const type = sc.type || sc.surchargeType || '';
                    const amount = Number(sc.amount || 0);
                    
                    if (amount > 0) {
                        let jpName = type;
                        let enName = type;

                        if (type.includes('FUEL')) {
                            jpName = '燃料割増金';
                            enName = 'Fuel Surcharge';
                        } else if (type.includes('PEAK') || type.includes('DEMAND')) {
                            jpName = '混雑時割増金';
                            enName = 'Demand Surcharge';
                        } else if (type.includes('CLEARANCE') || type.includes('BROKERAGE') || type.includes('ANCILLARY')) {
                            jpName = '輸入手続き手数料';
                            enName = 'Inbound Processing Fee';
                        } else if (type.includes('RESIDENTIAL')) {
                            jpName = '個人宅宛て配達手数料';
                            enName = 'Residential Delivery Fee';
                        } else if (type.includes('OUT_OF_DELIVERY_AREA')) {
                            jpName = '配達地域外割増金';
                            enName = 'Out of Delivery Area Surcharge';
                        }
                        
                        detailedSurcharges.push({ nameJa: jpName, nameEn: enName, amount: Math.ceil(amount) });
                    }
                });
            }

            return {
                serviceName: `FedEx ${serviceName}`,
                total: Math.ceil(netAmount),
                baseCharge: Math.ceil(netFreight),
                discount: 0, 
                surcharges: detailedSurcharges,
                deliveryDaysJa,
                deliveryDaysEn
            };
        }).sort((a: any, b: any) => a.total - b.total);

        if (rates.length === 0) {
            const fallbackFee = Math.max(3500, Math.ceil(weightKg * 1800 + 3000));
            return {
                rates: [
                    {
                        serviceName: 'FedEx International Priority (概算)',
                        total: fallbackFee,
                        deliveryDaysJa: '1-3 日',
                        deliveryDaysEn: '1-3 Days'
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
                    deliveryDaysJa: '1-3 日',
                    deliveryDaysEn: '1-3 Days'
                }
            ],
            error: `API通信エラー (${err.message})`
        };
    }
}

export async function calculateShippingFees(params: CalculateShippingFeesParams) {
    const { destination, postalCode, weight, isEstimate = false, fedexCredentials } = params;

    const japanPost = calculateJapanPostSeaFee(weight, destination);
    const fedexResult = await calculateFedexRates(destination, postalCode, weight, isEstimate, fedexCredentials);

    return {
        japanPost,
        fedexRates: fedexResult.rates,
        fedexError: fedexResult.error,
        exchangeRateInfo: null
    };
}