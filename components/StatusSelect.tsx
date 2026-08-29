'use client'

import { updateOrder } from '@/app/actions/admin'

export default function StatusSelect({ item }: { item: { id: string; status: string; admin_note?: string } }) {
    const handleSubmit = async (formData: FormData) => {
        try {
            await updateOrder(item.id, formData.get('status') as string)
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
