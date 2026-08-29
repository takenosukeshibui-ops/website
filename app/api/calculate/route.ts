// app/api/calculate/route.ts
import { NextResponse } from 'next/server';

const cleanEnv = (val?: string) => (val || '').replace(/^["']|["']$/g, '').trim();

const getSamplePostalCode = (countryCode: string): string => {
    const postalMap: Record<string, string> = {
        US: '90210',
        CA: 'K1A0B1',
        GB: 'SW1A1AA',
        NL: '1000',
        DE: '10115',
        FR: '75001',
        AU: '2000',
        CN: '100000',
        KR: '03051',
        TW: '100'
    };
    return postalMap[countryCode] || '10000';
};

const countryZoneMap: Record<string, number> = {
    CN: 1, KR: 1, TW: 1, HK: 1, MO: 1,
    TH: 2, SG: 2, MY: 2, PH: 2, VN: 2, ID: 2, IN: 2, PK: 2, BD: 2,
    GB: 3, DE: 3, FR: 3, IT: 3, ES: 3, NL: 3, BE: 3, CH: 3, SE: 3, NO: 3, FI: 3, DK: 3, AT: 3, PL: 3, IE: 3, PT: 3, GR: 3, CZ: 3, HU: 3, RO: 3, AU: 3, NZ: 3, AE: 3, SA: 3, IL: 3, TR: 3,
    US: 4, CA: 4, MX: 4,
    BR: 5, AR: 5, CL: 5, CO: 5, PE: 5, ZA: 5, EG: 5, MA: 5, KE: 5
};

function calculateJapanPostSurfaceRate(countryCode: string, weightKg: number): { total: number | null, note: string | null, error: string | null } {
    const zone = countryZoneMap[countryCode];
    if (!zone) {
        return { total: null, note: null, error: "※選択された国への船便は対応していません" };
    }

    const zoneConfig: Record<number, { base1kg: number; stepRate: number }> = {
        1: { base1kg: 1800, stepRate: 400 },
        2: { base1kg: 2100, stepRate: 490 },
        3: { base1kg: 2700, stepRate: 580 },
        4: { base1kg: 3000, stepRate: 650 },
        5: { base1kg: 3200, stepRate: 630 }
    };

    const config = zoneConfig[zone];

    const calcSingleBox = (w: number) => {
        const ceilWeight = Math.ceil(w);
        const rate = config.base1kg + (ceilWeight - 1) * config.stepRate;
        return Math.round(rate / 100) * 100;
    };

    if (weightKg <= 30) {
        return { total: calcSingleBox(weightKg), note: null, error: null };
    }

    const maxBoxWeight = 30;
    const fullBoxes = Math.floor(weightKg / maxBoxWeight);
    const remainderWeight = weightKg % maxBoxWeight;

    const fullBoxRate = calcSingleBox(maxBoxWeight);
    let grandTotal = fullBoxes * fullBoxRate;

    const boxBreakdown: string[] = [];
    if (fullBoxes > 0) {
        boxBreakdown.push(`30kg × ${fullBoxes}箱`);
    }

    if (remainderWeight > 0) {
        const remainderRate = calcSingleBox(remainderWeight);
        grandTotal += remainderRate;
        boxBreakdown.push(`${remainderWeight.toFixed(1)}kg × 1箱`);
    }

    const totalBoxes = fullBoxes + (remainderWeight > 0 ? 1 : 0);
    const note = `（${boxBreakdown.join(' + ')} 計${totalBoxes}箱で試算）`;

    return { total: grandTotal, note, error: null };
}

function formatFedExServiceName(serviceType: string, serviceName?: string): string {
    if (serviceName) return serviceName;
    if (serviceType.includes('INTERNATIONAL_PRIORITY_FREIGHT')) return 'FedEx International Priority Freight (68kg超大型貨物)';
    if (serviceType.includes('INTERNATIONAL_ECONOMY_FREIGHT')) return 'FedEx International Economy Freight (68kg超大型貨物)';
    if (serviceType.includes('CONNECT_PLUS')) return 'FedEx International Connect Plus';
    if (serviceType.includes('PRIORITY')) return 'FedEx International Priority';
    if (serviceType.includes('ECONOMY')) return 'FedEx International Economy';
    if (serviceType.includes('FIRST')) return 'FedEx International First';
    return `FedEx (${serviceType})`;
}

function parseFedExDeliveryDays(detail: any): string {
    try {
        const commit = detail?.commit || detail?.operationalDetail;

        const rawDate = 
            commit?.derivedEstimatedDeliveryDate ||
            commit?.dateDetail?.dayOfWeek ||
            commit?.dateDetail?.deadline ||
            commit?.commitDate ||
            detail?.operationalDetail?.deliveryDate;

        if (rawDate) {
            const targetDate = new Date(rawDate);
            const now = new Date();
            const diffTime = targetDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0 && diffDays <= 30) {
                return `${diffDays}営業日`;
            }
        }

        const transitTime = commit?.transitTime || detail?.operationalDetail?.transitTime;
        if (transitTime) {
            const timeMap: Record<string, string> = {
                ONE_DAY: '1営業日',
                TWO_DAYS: '2営業日',
                THREE_DAYS: '3営業日',
                FOUR_DAYS: '4営業日',
                FIVE_DAYS: '5営業日',
                SIX_DAYS: '6営業日',
                SEVEN_DAYS: '7営業日',
                EIGHT_DAYS: '8営業日',
            };
            if (timeMap[transitTime]) {
                return timeMap[transitTime];
            }
        }

        const serviceType = String(detail?.serviceType || '');
        if (serviceType.includes('FREIGHT')) {
            return '3〜7営業日';
        }
        if (serviceType.includes('PRIORITY') || serviceType.includes('FIRST')) {
            return '1〜3営業日';
        }
        if (serviceType.includes('CONNECT_PLUS')) {
            return '2〜4営業日';
        }
        if (serviceType.includes('ECONOMY')) {
            return '4〜6営業日';
        }
    } catch (e) {
        console.warn("Delivery days parse error:", e);
    }

    return '2〜5営業日';
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({})); // [UPDATED] JSONパース時のエラーガード
        const { destination = 'US', weight = 1, length, width, height, targetCurrency = 'JPY' } = body;
        const country = (destination || 'US').toUpperCase();

        const jpResult = calculateJapanPostSurfaceRate(country, weight);

        let rates: Record<string, number> = {};
        try {
            const fxRes = await fetch('https://api.frankfurter.app/latest?from=USD');
            if (fxRes.ok) { // [NEW] OK判定を追加
                const fxData = await fxRes.json();
                if (fxData?.rates) rates = fxData.rates;
            }
        } catch (err) {
            console.warn("FX API Error:", err);
        }

        const getRate = (from: string, to: string): number => {
            if (from === to) return 1;
            const fallbackRates: Record<string, number> = { JPY: 153.5, EUR: 0.92, GBP: 0.78, CAD: 1.36, AUD: 1.52, SGD: 1.34, HKD: 7.82, CHF: 0.88, CNY: 7.23, TWD: 32.1, KRW: 1380, NZD: 1.65, THB: 36.5, PHP: 58.2, MXN: 18.2 };
            const usdToFrom = from === 'USD' ? 1 : (rates[from] || fallbackRates[from] || 1);
            const usdToTo = to === 'USD' ? 1 : (rates[to] || fallbackRates[to] || 1);
            return usdToTo / usdToFrom;
        };

        const rateJpyToTarget = getRate('JPY', targetCurrency);

        const formatPrice = (amount: number, currency: string) =>
            (currency === 'JPY' || currency === 'KRW') ? Math.round(amount) : Math.round(amount * 100) / 100;

        let fedexRates = [];
        let fedexError: string | null = null;
        try {
            const fedexUrl = cleanEnv(process.env.FEDEX_API_URL) || 'https://apis-sandbox.fedex.com';
            const fedexKey = cleanEnv(process.env.FEDEX_API_KEY);
            const fedexSecret = cleanEnv(process.env.FEDEX_SECRET_KEY);

            if (fedexKey && fedexSecret) {
                const params = new URLSearchParams();
                params.append('grant_type', 'client_credentials');
                params.append('client_id', fedexKey);
                params.append('client_secret', fedexSecret);

                const tokenRes = await fetch(`${fedexUrl}/oauth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString(),
                });

                if (tokenRes.ok) {
                    const authData = await tokenRes.json();

                    if (authData.access_token) {
                        const packageItem: any = { weight: { units: 'KG', value: weight } };
                        if (length && width && height) {
                            packageItem.dimensions = { length, width, height, units: 'CM' };
                        }
                        const rawAccount = process.env.FEDEX_ACCOUNT_NUMBER || '';
                        const accountNumber = rawAccount.trim().replace(/[- \r\n]/g, '');

                        const ratePayload = {
                            accountNumber: { value: accountNumber },
                            requestedShipment: {
                                shipper: { address: { postalCode: '1000001', countryCode: 'JP' } },
                                recipient: { address: { postalCode: getSamplePostalCode(country), countryCode: country } },
                                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                                rateRequestType: ['ACCOUNT', 'PREFERRED'],
                                requestedPackageLineItems: [packageItem]
                            }
                        };

                        const fedexRes = await fetch(`${fedexUrl}/rate/v1/rates/quotes`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${authData.access_token}`,
                                'Content-Type': 'application/json',
                                'X-locale': 'en_US',
                                'X-customer-transaction-id': 'shipping_calculator_v1'
                            },
                            body: JSON.stringify(ratePayload),
                        });

                        if (fedexRes.ok) {
                            const fedexData = await fedexRes.json();
                            const rateReplyDetails = fedexData?.output?.rateReplyDetails || [];

                            for (const detail of rateReplyDetails) {
                                const ratedDetails = detail?.ratedShipmentDetails || [];
                                const accountRate = ratedDetails.find((r: any) =>
                                    r.rateType === 'PAYOR_ACCOUNT_PACKAGE' || r.rateType === 'ACCOUNT'
                                );

                                const shipmentDetail = accountRate || ratedDetails[0];
                                const rawAmount = shipmentDetail?.totalNetCharge || 0;
                                const origCurrency = shipmentDetail?.currency || 'USD';

                                const calculatedDeliveryDays = parseFedExDeliveryDays(detail);

                                if (rawAmount > 0) {
                                    const rateOrigToTarget = getRate(origCurrency, targetCurrency);
                                    const convertedTotal = rawAmount * rateOrigToTarget;

                                    const serviceTypeRaw = detail.serviceType || 'FedEx';
                                    const serviceNameRaw = detail.serviceName;

                                    fedexRates.push({
                                        serviceType: serviceTypeRaw,
                                        serviceName: formatFedExServiceName(serviceTypeRaw, serviceNameRaw),
                                        total: formatPrice(convertedTotal, targetCurrency),
                                        currency: targetCurrency,
                                        originalAmount: `${rawAmount} ${origCurrency}`,
                                        deliveryDays: calculatedDeliveryDays
                                    });
                                }
                            }

                            fedexRates.sort((a, b) => a.total - b.total);

                            if (fedexRates.length === 0) {
                                fedexError = "利用可能なFedExプランが見つかりませんでした";
                            }
                        } else {
                            const errorJson = await fedexRes.json().catch(() => ({}));
                            console.error("FedEx Rates Quotes Error Response:", errorJson);
                            fedexError = `FedEx運賃取得失敗 (${fedexRes.status})`;
                        }
                    }
                } else {
                    const tokenErrorJson = await tokenRes.json().catch(() => ({}));
                    console.error("FedEx Token Auth Error Response:", tokenErrorJson);
                    fedexError = "FedEx認証失敗（API Keyを確認してください）";
                }
            } else {
                fedexError = "FedEx APIキーが未設定です";
            }
        } catch (err: any) {
            console.error("FedEx API Processing Error:", err);
            fedexError = "FedEx運賃取得エラー";
        }

        const exchangeRateInfo = {
            base: 'JPY',
            target: targetCurrency,
            rate: rateJpyToTarget
        };

        // [UPDATED] 必ず JSON 形式を保証して返却
        return NextResponse.json({
            success: true,
            targetCurrency,
            exchangeRateInfo,
            japanPost: {
                serviceType: '船便',
                serviceName: '日本郵便 (船便)',
                total: jpResult.total !== null ? formatPrice(jpResult.total * rateJpyToTarget, targetCurrency) : null,
                deliveryDays: '1〜3か月',
                note: jpResult.note,
                error: jpResult.error
            },
            fedexRates,
            fedexError
        });
    } catch (error: any) {
        // [UPDATED] 例外発生時も必ず JSON レスポンスを返す
        return NextResponse.json({ success: false, error: error.message || "計算エラー" }, { status: 500 });
    }
}