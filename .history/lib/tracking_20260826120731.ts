/**
 * 追跡番号から配送会社（日本郵便 / FedEx等）を判別し、適切な追跡URLを返却する
 */
export function getTrackingUrl(trackingNumber: string): string {
    if (!trackingNumber) return '#'
    
    // ハイフンやスペースを除去して英字を大文字化
    const cleanNum = trackingNumber.replace(/[\s-]/g, '').toUpperCase()

    // 1. 国際郵便 EMS / 国際書留 (例: EG123456789JP) ➔ 日本郵便
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(cleanNum)) {
        return `https://track.japanpost.jp/shipment/search/itemDetail.forItem?reqCodeNo=${cleanNum}`
    }

    // 2. 15桁の数字 ➔ FedEx (フェデックス)
    if (/^\d{15}$/.test(cleanNum)) {
        return `https://www.fedex.com/fedextrack/?trknbr=${cleanNum}`
    }

    // 3. 11桁の数字 ➔ 日本郵便 (ゆうパック / 特定記録など)
    if (/^\d{11}$/.test(cleanNum)) {
        return `https://track.japanpost.jp/shipment/search/itemDetail.forItem?reqCodeNo=${cleanNum}`
    }

    // 4. 12桁の数字 ➔ FedEx
    if (/^\d{12}$/.test(cleanNum)) {
        return `https://www.fedex.com/fedextrack/?trknbr=${cleanNum}`
    }

    // 5. 上記以外の未知の形式 ➔ 万能自動判別追跡サービス (17TRACK)
    return `https://www.17track.net/ja/track#nums=${cleanNum}`
}