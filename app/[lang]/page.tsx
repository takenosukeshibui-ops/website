// app/[lang]/page.tsx
// [UPDATED] 在庫リストページへのアクセスボタンを追加
import Link from "next/link";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Welcome to our Service</h1>
      <p className="text-xl mb-8">Providing efficient management tools.</p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href={`/${lang}/login`} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors">
          Login
        </Link>
        <Link href={`/${lang}/signup`} className="px-6 py-2 bg-gray-200 text-black rounded font-bold hover:bg-gray-300 transition-colors">
          Sign Up
        </Link>
        <Link href={`/${lang}/calculator`} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors">
          Shipping Calculator
        </Link>
        {/* [NEW] 当社在庫リストへのリンクボタン */}
        <Link href={`/${lang}/inventory`} className="px-6 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 transition-colors">
          📦 当社在庫リスト (Inventory)
        </Link>
      </div>
    </main>
  );
}