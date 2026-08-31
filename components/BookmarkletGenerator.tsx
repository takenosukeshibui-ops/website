// components/BookmarkletGenerator.tsx
// [UPDATED] window直接参照によるハイドレーションエラー(#418)を防止し、postMessage受信時の自動更新(router.refresh)を正常化
'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function BookmarkletGenerator({ dict }: { dict?: any }) {
    const linkRef = useRef<HTMLAnchorElement>(null)
    const [baseUrl, setBaseUrl] = useState('')
    const [mounted, setMounted] = useState(false) // [NEW] マウント状態管理を追加してハイドレーションエラーを回避
    const router = useRouter()
    const pathname = usePathname()

    // [NEW] マウント後に言語判定を行う（windowの初期SSR直接参照を回避）
    const isEn = mounted 
        ? pathname.startsWith('/en') || dict?.dashboard?.bookmarklet?.title === 'Bookmarklet'
        : dict?.dashboard?.bookmarklet?.title === 'Bookmarklet'

    // [NEW] クライアント側でのマウント完了通知とBaseURL取得
    useEffect(() => {
        setMounted(true)
        setBaseUrl(window.location.origin)
    }, [])

    // [NEW] ブックマークレットからの追加完了メッセージを受信して画面を自動更新するイベントリスナー
    useEffect(() => {
        if (!mounted) return

        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'BOOKMARKLET_ITEM_ADDED') {
                router.refresh() // [NEW] キャッシュ・状態の自動再取得
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [mounted, router])

    useEffect(() => {
        if (linkRef.current && baseUrl) {
            const tTitle = isEn ? 'Add to Cart' : 'カートに追加'
            const tPrice = isEn ? 'Desired Price (optional)' : '希望価格 (任意)'
            const tQty = isEn ? 'Quantity' : '数量'
            const tRemarks = isEn ? 'Remarks (Size, Color, etc.)' : '備考 (サイズ・カラー等)'
            const tCancel = isEn ? 'Cancel' : 'キャンセル'
            const tSubmit = isEn ? 'Add' : '追加する'

            const code = `javascript:(function(){if(document.getElementById('__bm_modal'))return;var d=document.createElement('div');d.id='__bm_modal';d.style.cssText='position:fixed;top:20px;right:20px;background:#fff;border:1px solid #ccc;padding:15px;z-index:999999;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-radius:8px;font-family:sans-serif;color:#333;width:300px;text-align:left;';d.innerHTML='<h3 style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#111;">${tTitle}</h3><label style="display:block;font-size:11px;margin-bottom:2px;font-weight:bold;">${tPrice}</label><input type="number" id="__bm_price" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;color:#000;" /><label style="display:block;font-size:11px;margin-bottom:2px;font-weight:bold;">${tQty}</label><input type="number" id="__bm_qty" value="1" min="1" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;color:#000;" /><label style="display:block;font-size:11px;margin-bottom:2px;font-weight:bold;">${tRemarks}</label><input type="text" id="__bm_remarks" style="width:100%;box-sizing:border-box;margin-bottom:12px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;color:#000;" /><div style="display:flex;justify-content:flex-end;gap:8px;"><button id="__bm_cancel" style="padding:6px 12px;cursor:pointer;border:none;background:#e5e7eb;border-radius:4px;color:#374151;font-size:12px;font-weight:bold;">${tCancel}</button><button id="__bm_submit" style="padding:6px 12px;cursor:pointer;border:none;background:#2563eb;color:#fff;border-radius:4px;font-size:12px;font-weight:bold;">${tSubmit}</button></div>';document.body.appendChild(d);document.getElementById('__bm_cancel').onclick=function(){d.remove();};document.getElementById('__bm_submit').onclick=function(){var p=document.getElementById('__bm_price').value;var q=document.getElementById('__bm_qty').value;var r=document.getElementById('__bm_remarks').value;var url="${baseUrl}/api/bookmarklet/add?url="+encodeURIComponent(window.location.href)+"&title="+encodeURIComponent(document.title)+"&desiredPrice="+encodeURIComponent(p)+"&quantity="+encodeURIComponent(q)+"&remarks="+encodeURIComponent(r);window.open(url,"_bm_add","width=400,height=300,left=200,top=200");d.remove();};})();`
            linkRef.current.href = code
        }
    }, [baseUrl, isEn])

    const title = dict?.dashboard?.bookmarklet?.title || 'ブックマークレット'
    const description = dict?.dashboard?.bookmarklet?.description || '以下のボタンをブラウザのお気に入りバー（ブックマークバー）にドラッグ＆ドロップしてください。'
    const addButton = dict?.dashboard?.bookmarklet?.addButton || '依頼に追加'

    return (
        <div className="mt-8 p-4 bg-yellow-50 border rounded">
            <h2 className="font-bold">{title}</h2>
            <p className="text-sm mb-2">{description}</p>
            <a 
                ref={linkRef}
                onClick={(e) => {
                    e.preventDefault()
                    alert(isEn ? 'Please drag and drop this button to your bookmarks bar instead of clicking it.' : 'このボタンはクリックせず、ブックマークバーへドラッグ＆ドロップしてください。')
                }}
                className="inline-block bg-yellow-500 text-white px-4 py-2 rounded font-bold cursor-pointer hover:bg-yellow-600 transition-colors"
            >
                {addButton}
            </a>
        </div>
    )
}