// Wiseの請求画面へパラメーター付きで遷移するコンポーネント
function WiseInvoiceLinkButton({ order }: { order: any }) {
    const wiseEmail = order.profiles?.wise_email || ''
    const amount = order.total_amount || 0

    // 自社のWiseビジネスハンドル名（または登録ID）を設定
    const wiseHandle = 'your_business_handle' // ★ご自身のWiseビジネス名に変更してください

    const handleOpenWise = () => {
        if (!amount || amount <= 0) {
            alert('請求金額（合計金額）を入力してください。')
            return
        }

        const params = new URLSearchParams({
            amount: String(amount),
            currency: 'JPY',
            email: wiseEmail,
            description: `注文番号 #${order.order_number ?? ''} のお支払い`
        })

        // Wiseの支払いリンク画面を別タブで開く
        const wiseUrl = `https://wise.com/pay/me/${wiseHandle}?${params.toString()}`
        window.open(wiseUrl, '_blank')
    }

    return (
        <button
            type="button"
            onClick={handleOpenWise}
            className="px-2 py-1 bg-[#00B9FF] hover:bg-[#0099D6] text-white text-xs font-bold rounded shadow-sm transition-colors whitespace-nowrap"
        >
            Wiseで請求作成 ↗
        </button>
    )
}