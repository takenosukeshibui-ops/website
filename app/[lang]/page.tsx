// app/[lang]/page.tsx
// [UPDATED] 辞書（Dictionaries）パターンを導入し、多言語対応
import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries"; // [NEW] 辞書取得関数をインポート

export default async function Home({
  params,
}: {
  params: Promise<{ lang: 'en' | 'ja' }>; // [UPDATED] 型を 'en' | 'ja' に厳密化
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang); // [NEW] URLパラメータから現在の言語の辞書を取得

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {/* [UPDATED] 万が一辞書が空の場合でもクラッシュしないようガード */}
      <h1 className="text-4xl font-bold mb-4">{dict?.home?.title || 'Welcome'}</h1>
      <p className="text-xl mb-8">{dict?.home?.description || 'Service Description'}</p>
      
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href={`/${lang}/login`} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors">
          {dict?.home?.login || 'Login'}
        </Link>
        <Link href={`/${lang}/signup`} className="px-6 py-2 bg-gray-200 text-black rounded font-bold hover:bg-gray-300 transition-colors">
          {dict?.home?.signup || 'Sign Up'}
        </Link>
        <Link href={`/${lang}/calculator`} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors">
          {dict?.home?.calculator || 'Calculator'}
        </Link>
        <Link href={`/${lang}/inventory`} className="px-6 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 transition-colors">
          {dict?.home?.inventory || 'Inventory'}
        </Link>
      </div>
    </main>
  );
}