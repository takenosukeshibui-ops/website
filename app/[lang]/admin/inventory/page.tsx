import { getProducts } from '@/app/actions/inventory'
import AdminInventoryClient from './AdminInventoryClient'

export default async function AdminInventoryPage() {
  // 管理者権限として全ての商品(非公開含む)を取得
  const products = await getProducts(true)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">自社取扱商品 管理 (In-house Inventory)</h1>
      <AdminInventoryClient initialProducts={products} />
    </div>
  )
}