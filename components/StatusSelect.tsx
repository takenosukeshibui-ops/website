'use client'

// 変更点1：updateOrder ではなく、admin.ts に実在する updateItemStatus を読み込みます
import { updateItemStatus } from '@/app/actions/admin'

export default function StatusSelect({ item }: { item: { id: string; status: string; admin_note?: string } }) {
    const handleSubmit = async (formData: FormData) => {
        try {
            // 変更点2：読み込んだ updateItemStatus を使って更新します（// も外しました）
            await updateItemStatus(item.id, formData.get('status') as string)
            
            // 画面上でわかりやすいように成功メッセージを出します
            alert('ステータスの更新に成功しました！')
        } catch (e: unknown) {
            console.error(e)
            alert('更新失敗: ' + (e instanceof Error ? e.message : 'Unknown error'))
        }
    }

    return (
        <form action={handleSubmit}>
            <select name="status" defaultValue={item.status} className="bg-white text-slate-900 border border-slate-300 p-1 rounded">
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
            <button type="submit" className="ml-2 bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700">更新</button>
        </form>
    )
}