import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface EbayRegionConfig {
  id: string
  region: string
  rateClass: 'H' | 'A' | 'F' | 'D' | 'M'
  countryCode: string
  postalCode?: string
}

const EBAY_SHIPPING_REGIONS: EbayRegionConfig[] = [
  { id: 'europe', region: 'Europe', rateClass: 'H', countryCode: 'DE', postalCode: '10115' },
  { id: 'asia', region: 'Asia', rateClass: 'A', countryCode: 'SG', postalCode: '018956' },
  { id: 'canada', region: 'Canada', rateClass: 'F', countryCode: 'CA', postalCode: 'M5V2T6' },
  { id: 'australia', region: 'Australia', rateClass: 'D', countryCode: 'AU', postalCode: '2000' },
  { id: 'us', region: 'United State', rateClass: 'F', countryCode: 'US', postalCode: '10001' },
  { id: 'uk', region: 'United Kingdom', rateClass: 'M', countryCode: 'GB', postalCode: 'EC1A1BB' },
]

const TARGET_SERVICE_TYPE = 'FEDEX_INTERNATIONAL_CONNECT_PLUS'

async function getFedexAccessToken(apiKey: string, secretKey: string, isSandbox: boolean): Promise<string> {
  const baseUrl = isSandbox ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com'
  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: secretKey,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`FedEx認証エラー (${res.status}): ${errText}`)
  }

  const data = await res.json()
  if (!data.access_token) {
    throw new Error('FedExアクセストークンが取得できませんでした')
  }
  return data.access_token
}

async function fetchConnectPlusRateJpy(
  token: string,
  accountNumber: string,
  isSandbox: boolean,
  regionConfig: EbayRegionConfig,
  weightKg: number,
  usdToJpyRate: number
): Promise<{ feeJpy: number; serviceType: string; rateDetails: any[] }> {
  const baseUrl = isSandbox ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com'

  const payload = {
    accountNumber: { value: accountNumber },
    requestedShipment: {
      shipper: {
        address: {
          postalCode: '1040061',
          countryCode: 'JP',
        },
      },
      recipient: {
        address: {
          postalCode: regionConfig.postalCode || '10001',
          countryCode: regionConfig.countryCode,
          residential: false,
        },
      },
      pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
      serviceType: TARGET_SERVICE_TYPE,
      packagingType: 'YOUR_PACKAGING',
      rateRequestType: ['LIST', 'ACCOUNT'],
      requestedPackageLineItems: [
        {
          weight: {
            units: 'KG',
            value: Number(weightKg.toFixed(2)),
          },
        },
      ],
    },
  }

  const res = await fetch(`${baseUrl}/rate/v1/rates/quotes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`FedExレート取得失敗 (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const rateReplyDetail = data?.output?.rateReplyDetails?.[0]
  const returnedServiceType: string = rateReplyDetail?.serviceType || TARGET_SERVICE_TYPE
  const ratedShipmentDetails = Array.isArray(rateReplyDetail?.ratedShipmentDetails)
    ? rateReplyDetail.ratedShipmentDetails
    : []
  const rateDetail = ratedShipmentDetails[0]

  const formattedRateDetails = ratedShipmentDetails.map((d: any) => ({
    rateType: d?.rateType ?? null,
    currency: d?.currency ?? d?.shipmentRateDetail?.currency ?? null,
    totalNetCharge: d?.totalNetCharge ?? null,
    totalNetChargeWithDutiesAndTaxes: d?.totalNetChargeWithDutiesAndTaxes ?? null,
    totalBaseCharge: d?.shipmentRateDetail?.totalBaseCharge ?? null,
    totalFreightDiscounts: d?.shipmentRateDetail?.totalFreightDiscounts ?? null,
    totalSurcharges: d?.shipmentRateDetail?.totalSurcharges ?? null,
    surCharges: d?.shipmentRateDetail?.surCharges ?? [],
    shipmentRateDetail: d?.shipmentRateDetail ?? null,
  }))

  const totalCharge =
    rateDetail?.totalNetChargeWithDutiesAndTaxes ??
    rateDetail?.totalNetCharge ??
    rateDetail?.shipmentRateDetail?.totalNetCharge

  const amount = Number(totalCharge)
  const currency: string =
    rateDetail?.currency ||
    rateDetail?.shipmentRateDetail?.currency ||
    'JPY'

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('FedExレスポンスに有効な運賃が含まれていません')
  }

  if (currency.toUpperCase() === 'JPY') {
    return {
      feeJpy: Math.ceil(amount),
      serviceType: returnedServiceType,
      rateDetails: formattedRateDetails,
    }
  }

  if (!Number.isFinite(usdToJpyRate) || usdToJpyRate <= 0) {
    throw new Error('為替レートが取得できないため円換算できません')
  }

  return {
    feeJpy: Math.ceil(amount * usdToJpyRate),
    serviceType: returnedServiceType,
    rateDetails: formattedRateDetails,
  }
}

async function getUsdToJpyRate(): Promise<number | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=JPY', {
      cache: 'no-store',
    })
    if (res.ok) {
      const json = await res.json()
      const rate = Number(json?.rates?.JPY)
      if (Number.isFinite(rate) && rate > 50) {
        return rate
      }
    }
  } catch {
    // 取得失敗時は null
  }
  return null
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const weightKg = Number(body?.weightKg)

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return NextResponse.json({ error: '重量(kg)は0より大きい数値を指定してください。' }, { status: 400 })
    }

    const usdToJpyRate = await getUsdToJpyRate()

    const apiKey = process.env.FEDEX_API_KEY
    const secretKey = process.env.FEDEX_SECRET_KEY
    const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER
    const isSandbox = process.env.FEDEX_USE_SANDBOX === 'true'

    if (!apiKey || !secretKey || !accountNumber) {
      return NextResponse.json({
        success: false,
        error: 'FedEx APIの環境変数（FEDEX_API_KEY / FEDEX_SECRET_KEY / FEDEX_ACCOUNT_NUMBER）が未設定のため、実際のレートを取得できません。',
        serviceType: TARGET_SERVICE_TYPE,
        weightKg,
        usdToJpyRate,
        rates: EBAY_SHIPPING_REGIONS.map((cfg) => ({
          id: cfg.id,
          region: cfg.region,
          rateClass: cfg.rateClass,
          countryCode: cfg.countryCode,
          serviceType: TARGET_SERVICE_TYPE,
          fedexFeeJpy: null,
          status: 'error' as const,
          errorMessage: 'FedEx API設定不足',
          rateDetails: [],
        })),
      })
    }

    let token: string
    try {
      token = await getFedexAccessToken(apiKey, secretKey, isSandbox)
    } catch (authErr: any) {
      const msg = authErr?.message || 'FedEx認証に失敗しました'
      return NextResponse.json({
        success: false,
        error: msg,
        serviceType: TARGET_SERVICE_TYPE,
        weightKg,
        usdToJpyRate,
        rates: EBAY_SHIPPING_REGIONS.map((cfg) => ({
          id: cfg.id,
          region: cfg.region,
          rateClass: cfg.rateClass,
          countryCode: cfg.countryCode,
          serviceType: TARGET_SERVICE_TYPE,
          fedexFeeJpy: null,
          status: 'error' as const,
          errorMessage: msg,
          rateDetails: [],
        })),
      })
    }

    const results = await Promise.all(
      EBAY_SHIPPING_REGIONS.map(async (cfg) => {
        try {
          const rateRes = await fetchConnectPlusRateJpy(
            token,
            accountNumber,
            isSandbox,
            cfg,
            weightKg,
            usdToJpyRate ?? 0
          )
          return {
            id: cfg.id,
            region: cfg.region,
            rateClass: cfg.rateClass,
            countryCode: cfg.countryCode,
            serviceType: rateRes.serviceType,
            fedexFeeJpy: rateRes.feeJpy,
            status: 'ok' as const,
            errorMessage: null,
            rateDetails: rateRes.rateDetails,
          }
        } catch (err: any) {
          return {
            id: cfg.id,
            region: cfg.region,
            rateClass: cfg.rateClass,
            countryCode: cfg.countryCode,
            serviceType: TARGET_SERVICE_TYPE,
            fedexFeeJpy: null,
            status: 'error' as const,
            errorMessage: err?.message || 'レート取得エラー',
            rateDetails: [],
          }
        }
      })
    )

    const hasAnyError = results.some((r) => r.status === 'error')

    return NextResponse.json({
      success: !hasAnyError,
      error: hasAnyError ? '一部の地域で実際のFedExレートを取得できませんでした。' : null,
      serviceType: TARGET_SERVICE_TYPE,
      weightKg,
      usdToJpyRate,
      rates: results,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || '送料取得中にエラーが発生しました。' },
      { status: 500 }
    )
  }
}