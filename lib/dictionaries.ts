// lib/dictionaries.ts
// [NEW] 辞書ファイルを非同期で読み込むユーティリティ

const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  ja: () => import('@/dictionaries/ja.json').then((module) => module.default),
}

export const getDictionary = async (locale: 'en' | 'ja') => {
  // 指定された言語がない場合は英語をフォールバックとして使用
  const load = dictionaries[locale] || dictionaries.en
  return load()
}