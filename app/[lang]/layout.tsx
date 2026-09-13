// app/[lang]/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Worldwide JaPan - Package Forwarding & Proxy Shopping",
    template: "%s | Worldwide JaPan",
  },
  description: "Official Portal for Worldwide JaPan Package Forwarding and Proxy Shopping Services.",
  icons: {
    icon: "/icon.png", // 🌟 app/icon.png を指定
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="p-4 flex justify-end">
          <LanguageSwitcher />
        </header>
        {children}
      </body>
    </html>
  );
}