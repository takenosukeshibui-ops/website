'use client'

export default function BookmarkletGenerator() {
    const bookmarkletCode = `javascript:(function(){window.open('https://ver2-murex.vercel.app/dashboard?url='+encodeURIComponent(window.location.href)+'&title='+encodeURIComponent(document.title));})();`;

    return (
        <div className="mt-8 p-4 bg-yellow-50 border rounded">
            <h2 className="font-bold">ブックマークレット</h2>
            <p className="text-sm">以下のリンクをブラウザのお気に入りバーにドラッグ＆ドロップしてください。</p>
            <span dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarkletCode}" class="inline-block mt-2 bg-yellow-500 text-white px-4 py-2 rounded font-bold cursor-pointer" onclick="event.preventDefault(); alert('このボタンはクリックせず、ブックマークバーへドラッグ＆ドロップしてください。');">依頼に追加</a>`
            }} />
        </div>
    )
}
