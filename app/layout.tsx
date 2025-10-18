import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import AgeGateQueryReset from "@/components/AgeGateQueryReset";

import "./globals.css";

export const metadata: Metadata = {
  title: "xanime｜インディーアニメの配信ポータル",
  description: "クリエイターによる個人制作アニメを無料で楽しめる xanime ポータルサイト。",
};

const primaryNav = [
  { href: "/", label: "人気" },
  { href: "/?tab=trending", label: "急上昇" },
  { href: "/?tab=new", label: "新着" },
  { href: "/?tab=library", label: "動画" },
];

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
            <nav className="layout__nav">
              {primaryNav.map((item) => (
                <Link key={item.label} href={item.href} className="layout__nav-item">
                  {item.label}
                </Link>
              ))}
            </nav>
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
