import React from 'react';

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: string }) {
    const className = statusColors[status] || 'bg-gray-100 text-gray-800';
    return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export function ItemStatusBadge({ status }: { status: string }) {
    const className = statusColors[status] || 'bg-gray-100 text-gray-800';
    return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
