// [UPDATED]
'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  // パスから現在の言語コードを取得 (/en/dashboard -> en)
  const currentLang = pathname.split('/')[1] || 'en'

  const handleLanguageChange = (newLang: string) => {
    if (currentLang === newLang) return

    const segments = pathname.split('/')
    
    // サポート言語がパス先頭に含まれている場合は置き換え、含まれていない場合は先頭に挿入
    if (['en', 'ja'].includes(segments[1])) {
      segments[1] = newLang
    } else {
      segments.splice(1, 0, newLang)
    }

    const newPath = segments.join('/') || `/${newLang}`
    router.push(newPath)
  }

  return (
    <div className="flex items-center gap-1 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        className={`px-2 py-1 rounded font-bold transition-colors ${
          currentLang === 'en'
            ? 'bg-blue-600 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleLanguageChange('ja')}
        className={`px-2 py-1 rounded font-bold transition-colors ${
          currentLang === 'ja'
            ? 'bg-blue-600 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        JP
      </button>
    </div>
  )
}