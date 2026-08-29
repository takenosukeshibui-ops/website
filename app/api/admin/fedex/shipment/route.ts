// app/api/admin/fedex/shipment/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// FedEx OAuth2 Token 取得ヘルパー
async function getFedExAccessToken() {
    const baseUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com'
    const apiKey = process.env.FEDEX_API_KEY
    const secretKey = process.env.FEDEX_SECRET_KEY

    if (!apiKey || !secretKey) {
        throw new Error('FEDEX_API_KEY または FEDEX_SECRET_KEY が環境変数に設定されていません。')
    }

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
    })

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`FedEx OAuth Token 取得エラー (${res.status}): ${errorText}`)
    }

    const data = await res.json()
    return data.access_token
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1. 管理者権限チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: '認証エラーが発生しました。' }, { status: 401 })
        }

        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (adminProfile?.role !== 'admin') {
            return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 })
        }

        // 2. リクエスト解析
        const { orderId } = await req.json()
        if (!orderId) {
            return NextResponse.json({ error: 'Order ID は必須です。' }, { status: 400 })
        }

        const myFedExAccount = process.env.FEDEX_ACCOUNT_NUMBER ? String(process.env.FEDEX_ACCOUNT_NUMBER).trim() : ''
        if (!myFedExAccount) {
            return NextResponse.json({ error: '.env.local に FEDEX_ACCOUNT_NUMBER が設定されていません。' }, { status: 400 })
        }

        // 3. 注文情報とユーザープロフィールの取得
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                profiles:user_id (*),
                order_items (
                    items (*)
                )
            `)
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            return NextResponse.json({ error: '注文情報の取得に失敗しました。' }, { status: 404 })
        }

        const profile = order.profiles || {}
        const recipientCountry = order.shipping_country || profile.country || 'US'
        const isUS = recipientCountry === 'US'

        const userFedExAccount = profile.fedex_account_number ? String(profile.fedex_account_number).trim() : ''

        // 4. FedEx OAuth トークン取得
        const accessToken = await getFedExAccessToken()
        const baseUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com'

        // 5. 請求種別の判定
        const paymentType = (isUS && userFedExAccount) ? 'RECIPIENT' : 'SENDER'
        const payorAccount = (paymentType === 'RECIPIENT' && userFedExAccount) ? userFedExAccount : myFedExAccount

        // 重量（デフォルト 1.0kg）
        const totalWeight = order.shipping_fee ? 1.0 : 1.0

        // [UPDATED] FedEx API で受容される標準通貨コード (USD) を定義
        const currencyCode = 'USD'

        // 注文商品からの Commercial Invoice 用 Commodities リスト作成
        const commodities = (order.order_items || []).map((oi: any, index: number) => {
            const item = Array.isArray(oi.items) ? oi.items[0] : oi.items
            // JPYからUSD換算（単価が円ベースの場合の簡易換算値：デフォルト10 USD）
            const priceInJpy = item?.price || item?.desired_price || 1000
            const priceInUsd = Math.max(1, Math.round(priceInJpy / 150)) // [UPDATED] USD通貨換算
            const quantity = item?.admin_quantity || item?.quantity || 1

            return {
                numberOfPieces: 1,
                description: item?.title ? item.title.substring(0, 45) : `Merchandise Item ${index + 1}`,
                countryOfManufacture: 'JP',
                weight: {
                    units: 'KG',
                    value: Number((totalWeight / Math.max(1, order.order_items.length)).toFixed(2)) || 0.5,
                },
                quantity: quantity,
                quantityUnits: 'PCS',
                unitPrice: {
                    currency: currencyCode, // [UPDATED] USD に設定
                    amount: priceInUsd,
                },
                customsValue: {
                    currency: currencyCode, // [UPDATED] USD に設定
                    amount: priceInUsd * quantity,
                },
            }
        })

        if (commodities.length === 0) {
            commodities.push({
                numberOfPieces: 1,
                description: 'General Merchandise',
                countryOfManufacture: 'JP',
                weight: { units: 'KG', value: totalWeight },
                quantity: 1,
                quantityUnits: 'PCS',
                unitPrice: { currency: currencyCode, amount: 10 }, // [UPDATED] USD
                customsValue: { currency: currencyCode, amount: 10 }, // [UPDATED] USD
            })
        }

        const totalCustomsValue = commodities.reduce((sum: number, c: any) => sum + c.customsValue.amount, 0)

        // 6. FedEx Ship API (Shipment) リクエスト構築
        const shipPayload = {
            labelResponseOptions: 'LABEL',
            requestedShipment: {
                shipper: {
                    contact: {
                        personName: 'Warehouse Admin',
                        companyName: 'Logistics Service',
                        phoneNumber: '0312345678',
                    },
                    address: {
                        streetLines: ['1-1 Chiyoda'],
                        city: 'Chiyoda-ku',
                        stateOrProvinceCode: 'Tokyo',
                        postalCode: '100-0001',
                        countryCode: 'JP',
                    },
                },
                recipients: [
                    {
                        contact: {
                            personName: profile.full_name || 'Customer Name',
                            companyName: profile.company_name || '',
                            phoneNumber: profile.phone || '0000000000',
                            emailAddress: profile.contact_email || profile.email || '',
                        },
                        address: {
                            streetLines: [
                                order.shipping_address_line1 || profile.address_line1 || 'Address Line 1',
                                order.shipping_address_line2 || profile.address_line2 || '',
                            ].filter(Boolean),
                            city: order.shipping_city || profile.city || 'City',
                            stateOrProvinceCode: order.shipping_state_province || profile.state_province || '',
                            postalCode: order.shipping_zip_code || profile.zip_code || '00000',
                            countryCode: recipientCountry,
                            residential: (order.shipping_is_residential ?? profile.is_residential) ?? true,
                        },
                    },
                ],
                shipDatestamp: new Date().toISOString().split('T')[0],
                serviceType: 'INTERNATIONAL_PRIORITY',
                packagingType: 'YOUR_PACKAGING',
                pickupType: 'USE_SCHEDULED_PICKUP',
                blockInsightVisibility: false,
                shippingChargesPayment: {
                    paymentType: paymentType,
                    payor: {
                        responsibleParty: {
                            accountNumber: {
                                value: payorAccount,
                            },
                        },
                    },
                },
                customsClearanceDetail: {
                    dutiesPayment: {
                        paymentType: 'SENDER',
                        payor: {
                            responsibleParty: {
                                accountNumber: {
                                    value: myFedExAccount,
                                },
                            },
                        },
                    },
                    commodities: commodities,
                    totalCustomsValue: {
                        currency: currencyCode, // [UPDATED] USD に設定
                        amount: totalCustomsValue,
                    },
                },
                labelSpecification: {
                    imageType: 'PDF',
                    labelStockType: 'PAPER_4X6',
                },
                requestedPackageLineItems: [
                    {
                        weight: {
                            units: 'KG',
                            value: totalWeight,
                        },
                    },
                ],
            },
            accountNumber: {
                value: myFedExAccount,
            },
        }

        // 7. FedEx Ship API 送信
        const shipRes = await fetch(`${baseUrl}/ship/v1/shipments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(shipPayload),
        })

        const shipData = await shipRes.json()

        if (!shipRes.ok) {
            console.error('FedEx Ship API エラー詳細:', JSON.stringify(shipData, null, 2))
            const firstError = shipData.errors?.[0]
            let errorMsg = firstError?.message || 'FedEx APIからのラベル発行に失敗しました。'
            return NextResponse.json({ error: errorMsg, details: shipData }, { status: 400 })
        }

        // 8. レスポンスから追跡番号とラベルPDF情報を取得
        const completedShipment = shipData.output?.transactionShipments?.[0]
        const trackingNumber = completedShipment?.masterTrackingNumber
        const labelEncoded = completedShipment?.pieceResponses?.[0]?.packageDocuments?.[0]?.encodedLabel

        // 9. 追跡番号を DB に自動更新
        if (trackingNumber) {
            await supabase
                .from('orders')
                .update({ tracking_number: trackingNumber })
                .eq('id', orderId)
        }

        return NextResponse.json({
            success: true,
            trackingNumber: trackingNumber,
            labelPdfBase64: labelEncoded,
        })
    } catch (err: any) {
        console.error('FedEx Label Generation Internal Error:', err)
        return NextResponse.json({ error: err.message || 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}