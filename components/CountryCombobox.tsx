// components/CountryCombobox.tsx
// [NEW] 検索可能な国選択コンポーネント
'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { countries } from './countries'

interface Props {
    value: string
    onChange: (code: string) => void
    isEn: boolean
    className?: string
}

export default function CountryCombobox({ value, onChange, isEn, className }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)

    const filteredCountries = useMemo(() => {
        if (!query) return countries
        const lowerQuery = query.toLowerCase()
        return countries.filter(
            (c) => c.code.toLowerCase().includes(lowerQuery) || 
                   c.name.toLowerCase().includes(lowerQuery) || 
                   c.enName.toLowerCase().includes(lowerQuery)
        )
    }, [query])

    const selectedCountry = countries.find((c) => c.code === value)
    const displayValue = selectedCountry ? (isEn ? selectedCountry.enName : selectedCountry.name) : ""

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className="relative w-full" ref={containerRef}>
            <input
                type="text"
                className={className || "w-full p-2 border border-slate-300 rounded text-slate-900 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium"}
                placeholder={isEn ? "Search country (e.g. Japan, US)..." : "国名やコードで検索..."}
                value={isOpen ? query : (displayValue ? `${displayValue} (${value})` : "")}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setIsOpen(true)
                }}
                onFocus={() => {
                    setQuery("")
                    setIsOpen(true)
                }}
            />
            {isOpen && (
                <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg text-sm">
                    {filteredCountries.map((country) => (
                        <li
                            key={country.code}
                            className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-slate-900 border-b border-slate-50 last:border-0"
                            onClick={() => {
                                onChange(country.code)
                                setIsOpen(false)
                                setQuery("")
                            }}
                        >
                            {isEn ? country.enName : country.name} ({country.code})
                        </li>
                    ))}
                    {filteredCountries.length === 0 && (
                        <li className="px-3 py-2 text-slate-500 text-center">
                            {isEn ? "No results found" : "見つかりませんでした"}
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}