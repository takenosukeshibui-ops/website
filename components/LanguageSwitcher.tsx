'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();

    const toggleLanguage = () => {
        const segments = pathname.split('/');
        const currentLang = segments[1];
        const newLang = currentLang === 'en' ? 'ja' : 'en';

        if (currentLang === 'en' || currentLang === 'ja') {
            segments[1] = newLang;
            router.push(segments.join('/'));
        } else {
            router.push(`/${newLang}${pathname}`);
        }
    };

    return (
        <button onClick={toggleLanguage} className="p-2 border rounded">
            Toggle Language
        </button>
    );
}
