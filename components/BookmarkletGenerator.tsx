'use client'

import { useEffect, useRef, useState } from 'react'

export default function BookmarkletGenerator({ dict }: { dict: any }) {
    const linkRef = useRef<HTMLAnchorElement>(null)
    const [baseUrl, setBaseUrl] = useState('')

    useEffect(() => {
        setBaseUrl(window.location.origin)
    }, [])

    useEffect(() => {
        if (linkRef.current && baseUrl) {
            const code = `javascript:(function(){/* ... 辞書データはJS文字列内に埋め込むか、API経由にする必要あり ... */})();`
            linkRef.current.href = code;
        }
    }, [baseUrl])

    return (
        <div className="mt-8 p-4 bg-yellow-50 border rounded">
            <h2 className="font-bold">{dict.bookmarklet.title}</h2>
            <p className="text-sm mb-2">{dict.bookmarklet.description}</p>
            <a
                ref={linkRef}
                onClick={(e) => {
                    e.preventDefault();
                    alert('このボタンはクリックせず、ブックマークバーへドラッグ＆ドロップしてください。');
                }}
                className="inline-block bg-yellow-500 text-white px-4 py-2 rounded font-bold cursor-pointer hover:bg-yellow-600 transition-colors"
            >
                {dict.bookmarklet.addButton}
            </a>
        </div>
    )
}