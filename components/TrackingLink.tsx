// components/TrackingLink.tsx
'use client'

import React from 'react'

export function TrackingLink({ 
    trackingNumber, 
    trackingUrl 
}: { 
    trackingNumber: string
    trackingUrl: string 
}) {
    return (
        <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()} // [NEW] クライアントコンポーネント内で安全にイベントバブリングを防止
        >
            {trackingNumber}
            <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </a>
    )
}