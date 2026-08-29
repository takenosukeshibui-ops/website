'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ pendingText, children }: { pendingText: string, children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full md:w-auto bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-700 whitespace-nowrap disabled:opacity-50"
        >
            {pending ? pendingText : children}
        </button>
    );
}

export function OrderButton({ pendingText, children }: { pendingText: string, children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
            {pending ? pendingText : children}
        </button>
    );
}

export function DeleteButton({ onClick, pendingText, children }: { onClick?: () => void, pendingText: string, children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            onClick={onClick}
            className="text-red-600 text-sm hover:underline disabled:opacity-50"
        >
            {pending ? pendingText : children}
        </button>
    );
}
