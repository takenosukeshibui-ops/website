// components/BookmarkletGenerator.tsx
'use client'

import { useEffect, useRef } from 'react'

export default function BookmarkletGenerator() {
    const linkRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
        if (linkRef.current) {
            // [UPDATED] Reactのセキュリティ制限（href="javascript:..." のブロック）を回避するため、useEffect内でDOMに直接URLをセットします。
            const code = `javascript:(function(){if(document.getElementById('__bm_modal'))return;var d=document.createElement('div');d.id='__bm_modal';d.style.cssText='position:fixed;top:20px;right:20px;background:#fff;border:1px solid #ccc;padding:15px;z-index:999999;box-shadow:0 4px 6px rgba(0,0,0,0.1);border-radius:8px;font-family:sans-serif;color:#333;width:300px;text-align:left;';d.innerHTML='<h3 style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#111;">カートに追加</h3><label style="display:block;font-size:11px;margin-bottom:2px;font-weight:bold;">希望価格 (任意)</label><input type="number" id="__bm_price" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;color:#000;" /><label style="display:block;font-size:11px;margin-bottom:2px;font-weight:bold;">数量</label><input type="number" id="__bm_qty" value="1" min="1" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;color:#000;" /><label style="display:block;font-size:11px;margin-bottom:2px;font-weight:bold;">備考 (サイズ・カラー等)</label><input type="text" id="__bm_remarks" style="width:100%;box-sizing:border-box;margin-bottom:12px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:12px;color:#000;" /><div style="display:flex;justify-content:flex-end;gap:8px;"><button id="__bm_cancel" style="padding:6px 12px;cursor:pointer;border:none;background:#e5e7eb;border-radius:4px;color:#374151;font-size:12px;font-weight:bold;">キャンセル</button><button id="__bm_submit" style="padding:6px 12px;cursor:pointer;border:none;background:#2563eb;color:#fff;border-radius:4px;font-size:12px;font-weight:bold;">追加ページを開く</button></div>';document.body.appendChild(d);document.getElementById('__bm_cancel').onclick=function(){d.remove();};document.getElementById('__bm_submit').onclick=function(){var p=document.getElementById('__bm_price').value;var q=document.getElementById('__bm_qty').value;var r=document.getElementById('__bm_remarks').value;var url="https://ver2-murex.vercel.app/dashboard?url="+encodeURIComponent(window.location.href)+"&title="+encodeURIComponent(document.title)+"&desiredPrice="+encodeURIComponent(p)+"&quantity="+encodeURIComponent(q)+"&remarks="+encodeURIComponent(r);window.open(url,"_blank");d.remove();};})();`;
            linkRef.current.href = code;
        }
    }, [])

    return (
        <div className="mt-8 p-4 bg-yellow-50 border rounded">
            <h2 className="font-bold">ブックマークレット</h2>
            <p className="text-sm mb-2">以下のボタンをブラウザのお気に入りバー（ブックマークバー）にドラッグ＆ドロップしてください。</p>
            <a 
                ref={linkRef}
                onClick={(e) => {
                    e.preventDefault(); 
                    alert('このボタンはクリックせず、ブックマークバーへドラッグ＆ドロップしてください。');
                }}
                className="inline-block bg-yellow-500 text-white px-4 py-2 rounded font-bold cursor-pointer hover:bg-yellow-600 transition-colors"
            >
                依頼に追加
            </a>
        </div>
    )
}