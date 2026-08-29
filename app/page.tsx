import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">サービスへようこそ</h1>
      <p className="text-xl mb-8">効率的な管理ツールを提供します。</p>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded">
          ログイン
        </Link>
        <Link href="/signup" className="px-6 py-2 bg-gray-200 text-black rounded">
          新規登録
        </Link>
        <Link href="/calculator" className="px-6 py-2 bg-green-600 text-white rounded">
          送料シミュレーター
        </Link>
      </div>
    </main>
  );
}
