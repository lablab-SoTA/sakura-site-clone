import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import AgeGateQueryReset from "@/components/AgeGateQueryReset";

import "./globals.css";

export const metadata: Metadata = {
  title: "xanime｜インディーアニメの配信ポータル",
  description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
  keywords: ["アニメ", "インディーアニメ", "ヘンタイ", "無料動画", "成人向け"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://xanime.example.com",
    siteName: "xanime",
    title: "xanime｜インディーアニメの配信ポータル",
    description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
    images: [
      {
        url: "/images/og-xanime-centered.svg",
        width: 1200,
        height: 630,
        alt: "xanime - 日本で最高のヘンタイアニメをお届けします",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "xanime｜インディーアニメの配信ポータル",
    description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
    images: ["/images/og-xanime-centered.svg"],
  },
};

const primaryNav: Array<{ href: string; label: string }> = [];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Suspense fallback={null}>
          <AgeGateQueryReset />
        </Suspense>
        <div className="layout">
          <header className="layout__header">
            <Link href="/" className="brand" aria-label="xanime ホーム">
              <Image
                src="/images/logo2.svg"
                alt="xanime"
                width={320}
                height={80}
                className="brand__logo"
                sizes="(max-width: 720px) 160px, 220px"
                priority
              />
            </Link>
            {primaryNav.length > 0 && (
              <nav className="layout__nav">
                {primaryNav.map((item) => (
                  <Link key={item.label} href={item.href} className="layout__nav-item">
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </header>
          <main className="layout__main">{children}</main>
          <footer className="layout__footer">
            <p>© {new Date().getFullYear()} xanime Studio. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
