import Link from "next/link";
import { getDictionary } from "@/lib/dictionaries";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: 'en' | 'ja' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900 p-8">
      <div className="max-w-4xl text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
          {dict?.home?.title}
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
          {dict?.home?.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href={`/${lang}/login`}
            className="px-8 py-4 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
          >
            {dict?.home?.login}
          </Link>
          <Link
            href={`/${lang}/signup`}
            className="px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-sm"
          >
            {dict?.home?.signup}
          </Link>
        </div>

        <div className="pt-16 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          <Link href={`/${lang}/calculator`} className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold mb-2">✈️ {dict?.home?.calculator}</h2>
            <p className="text-gray-500">最適な配送方法とコストを即座に計算。</p>
          </Link>
          <Link href={`/${lang}/inventory`} className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold mb-2">📦 {dict?.home?.inventory}</h2>
            <p className="text-gray-500">取り扱い製品の最新状況を一元管理。</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
