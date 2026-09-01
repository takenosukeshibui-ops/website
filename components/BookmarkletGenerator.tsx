// components/BookmarkletGenerator.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { X, HelpCircle } from 'lucide-react'

interface BookmarkletGeneratorProps {
    dict: any;
}

export default function BookmarkletGenerator({ dict }: BookmarkletGeneratorProps) {
    const router = useRouter()
    const buttonContainerRef = useRef<HTMLDivElement>(null)
    const [showModal, setShowModal] = useState<boolean>(false)

    useEffect(() => {
        const origin = window.location.origin
        const code = `javascript:(function(){
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            const targetUrl = '${origin}/api/bookmarklet/add?url=' + url + '&title=' + title;
            window.open(targetUrl, '_blank', 'width=500,height=600');
        })();`
        
        const cleanCode = code.replace(/\s+/g, ' ').trim()
        const buttonText = dict?.dashboard?.bookmarklet?.addButton || 'カートに追加'

        // ▼ 変更: Reactのイベントシステムを完全に回避するため、生のHTMLとしてボタンを生成する
        if (buttonContainerRef.current) {
            buttonContainerRef.current.innerHTML = `
                <a
                    href="${cleanCode}"
                    class="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-full shadow-md hover:bg-blue-700 transition cursor-grab active:cursor-grabbing"
                    title="ドラッグ＆ドロップでお気に入りバーに追加するか、クリックして実行してください"
                    onclick="event.preventDefault(); const url = encodeURIComponent(window.location.href); const title = encodeURIComponent(document.title); window.open('${origin}/api/bookmarklet/add?url=' + url + '&title=' + title, '_blank', 'width=500,height=600');"
                >
                    ${buttonText}
                </a>
            `
        }

        const channel = new BroadcastChannel('bookmarklet_channel')
        channel.onmessage = (event) => {
            if (event.data === 'item_added' || event.data?.type === 'BOOKMARKLET_ITEM_ADDED') {
                router.refresh()
            }
        }
        
        return () => {
            channel.close()
        }
    }, [dict, router])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowModal(false)
        }
        if (showModal) window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showModal])

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">
                    {dict?.dashboard?.bookmarklet?.title || 'ブックマークレット'}
                </h2>
                
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"
                >
                    <HelpCircle size={16} />
                    How to use
                </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-8">
                {dict?.dashboard?.bookmarklet?.description || '以下のボタンをお気に入りバーにドラッグ＆ドロップしてください。'}
            </p>
            
            {/* ▼ 変更: 生成したボタンを表示するための空のコンテナを用意 */}
            <div className="flex flex-col items-center justify-center" ref={buttonContainerRef}>
                {/* ここに生のHTML要素（aタグ）が挿入されます */}
            </div>

            {showModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setShowModal(false)} 
                >
                    <div 
                        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors z-10 backdrop-blur-md"
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="p-6 pt-10 sm:p-10">
                            <h3 className="text-lg font-bold mb-6 text-center text-gray-800">
                                ブックマークレットの使い方
                            </h3>
                            <Image 
                                src="/Gemini_Generated_Image_avtulhavtulhavtu.jpg" 
                                alt="How to use the bookmarklet" 
                                width={1200} 
                                height={675} 
                                className="w-full h-auto rounded-lg shadow-sm border border-gray-200"
                                priority
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}