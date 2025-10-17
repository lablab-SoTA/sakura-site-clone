import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import AgeGateQueryReset from "@/components/AgeGateQueryReset";

import "./globals.css";

export const metadata: Metadata = {
  title: "SAKURA｜インディーアニメの配信ポータル",
  description: "クリエイターによる個人制作アニメを無料で楽しめる SAKURA ポータルサイト。",
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
            <Link href="/" className="brand">
              SAKURA
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
            <p>© {new Date().getFullYear()} SAKURA Studio. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
