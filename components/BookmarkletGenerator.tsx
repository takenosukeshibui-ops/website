'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface BookmarkletGeneratorProps {
    dict: any;
}

export default function BookmarkletGenerator({ dict }: BookmarkletGeneratorProps) {
    const router = useRouter()
    const [bookmarkletCode, setBookmarkletCode] = useState<string>('')

    useEffect(() => {
        // 現在のオリジンを取得して、動的にブックマークレットコードを生成
        const origin = window.location.origin
        // ※ 実際のエンドポイントやパラメータに合わせてコードを調整してください
        const code = `javascript:(function(){
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            const targetUrl = '${origin}/api/bookmarklet/add?url=' + url + '&title=' + title;
            window.open(targetUrl, '_blank', 'width=500,height=600');
        })();`
        
        // コード内の余分な空白などを取り除く
        setBookmarkletCode(code.replace(/\s+/g, ' ').trim());

        // [UPDATED] BroadcastChannel で別タブ・別ウィンドウからの追加完了通知を受信し、自動ロードを実行
        const channel = new BroadcastChannel('bookmarklet_channel')
        channel.onmessage = (event) => {
            if (event.data === 'item_added') {
                router.refresh() // [NEW] 自動更新実行
            }
        }
        
        return () => {
            channel.close()
        }
    }, [router])

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-2">
                {dict?.dashboard?.bookmarklet?.title || 'ブックマークレット'}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
                {dict?.dashboard?.bookmarklet?.description || '画像の手順に従って、以下のボタンをお気に入りバーに追加してください。'}
            </p>
            
            {/* ▼ 追加：使い方ガイドの画像 ▼ */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <Image 
                    src="/Gemini_Generated_Image_avtulhavtulhavtu.jpg" 
                    alt="ブックマークレットの使い方" 
                    width={800} 
                    height={450} 
                    className="mx-auto rounded-lg shadow-sm border border-gray-200 w-full max-w-2xl"
                    priority
                />
            </div>
            
            {/* ▼ ドラッグ＆ドロップ用のブックマークレットボタン ▼ */}
            <div className="flex flex-col items-center justify-center">
                <a
                    href={bookmarkletCode}
                    onClick={(e) => e.preventDefault()} // クリックではなくドラッグしてもらうため、クリック挙動を防止
                    className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-full shadow-md hover:bg-blue-700 transition cursor-grab active:cursor-grabbing"
                    title="ドラッグ＆ドロップでお気に入りバーに追加してください"
                >
                    {dict?.dashboard?.bookmarklet?.addButton || '依頼に追加'}
                </a>
                
                <p className="text-xs text-gray-400 mt-4">
                    ※このボタンはクリックせず、ブラウザのブックマーク（お気に入り）バーにドラッグ＆ドロップしてください。
                </p>
            </div>
        </div>
    )
}