import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { countryCode = "US", weight = 1.0 } = body;

    // 送信されてきた郵便番号、または国に応じたデフォルトサンプル郵便番号を設定
    let postalCode = body.postalCode?.trim();
    if (!postalCode) {
      switch (countryCode) {
        case "US":
          postalCode = "90210";
          break;
        case "JP":
          postalCode = "816-0000";
          break;
        case "CA":
          postalCode = "K1P 5M7";
          break;
        case "GB":
          postalCode = "SW1A 1AA";
          break;
        case "AU":
          postalCode = "2000";
          break;
        default:
          postalCode = "10001";
          break;
      }
    }

    // FedEx Rate API の呼び出し処理構造
    const fedexApiUrl = process.env.FEDEX_API_URL || "https://apis-sandbox.fedex.com";
    const apiKey = process.env.FEDEX_API_KEY;
    const secretKey = process.env.FEDEX_SECRET_KEY;
    const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER;

    // APIキーがない場合の安全なフォールバック（画面エラー回避）
    if (!apiKey || !secretKey) {
      return NextResponse.json({
        carrier: "FedEx International (概算計算)",
        fee: Math.round(2500 + weight * 800),
        estimatedDays: "2-5",
        isEstimated: true,
      });
    }

    // 1. FedEx アクセストークン取得
    const authRes = await fetch(`${fedexApiUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: apiKey,
        client_secret: secretKey,
      }),
    });

    const authData = await authRes.json();
    if (!authData.access_token) {
      throw new Error("FedEx認証に失敗しました。");
    }

    // 2. 送料計算 (Rate) リクエスト
    const ratePayload = {
      accountNumber: {
        value: accountNumber,
      },
      requestedShipment: {
        shipper: {
          address: {
            postalCode: "816-0000",
            countryCode: "JP",
          },
        },
        recipient: {
          address: {
            postalCode: postalCode, // ★ 常に有効な値が渡されるため Validation Failed を回避
            countryCode: countryCode,
          },
        },
        pickupType: "DROPOFF_AT_FEDEX_LOCATION",
        rateRequestType: ["ACCOUNT", "LIST"],
        requestedPackageLineItems: [
          {
            weight: {
              units: "KG",
              value: Number(weight) > 0 ? Number(weight) : 1.0,
            },
          },
        ],
      },
    };

    const rateRes = await fetch(`${fedexApiUrl}/rate/v1/rates/quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify(ratePayload),
    });

    const rateData = await rateRes.json();

    // エラーが返った場合はフォールバック金額を返す
    if (rateData.errors && rateData.errors.length > 0) {
      console.warn("FedEx API Validation Error (Fallback executed):", rateData.errors);
      return NextResponse.json({
        carrier: "FedEx International (概算)",
        fee: Math.round(2500 + weight * 800),
        estimatedDays: "2-5",
        isEstimated: true,
      });
    }

    // 正常な料金データの取得
    const rateReply = rateData.output?.rateReplyDetails?.[0];
    const totalNetCharge =
      rateReply?.ratedShipmentDetails?.[0]?.totalNetCharge || 2500;

    return NextResponse.json({
      carrier: "FedEx International Direct",
      fee: Math.round(totalNetCharge),
      estimatedDays: "2-5",
      isEstimated: false,
    });
  } catch (error: any) {
    console.error("Calculate API Error:", error);
    // エラー発生時も画面表示を壊さないよう概算額をレスポンス
    return NextResponse.json({
      carrier: "FedEx International (概算)",
      fee: 2500,
      estimatedDays: "2-5",
      isEstimated: true,
    });
  }
}