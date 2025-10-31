import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import AgeGateQueryReset from "@/components/AgeGateQueryReset";
import LayoutHeader from "@/components/LayoutHeader";
import FooterNav from "@/components/FooterNav";
import BackButton from "@/components/BackButton";

import "./globals.css";

// 実際のサイトURLとOGP画像URL
const SITE_URL = "https://xanime.net";
const OG_IMAGE = `${SITE_URL}/images/title.jpg`;

export const metadata: Metadata = {
  title: "xanime｜インディーアニメの配信ポータル",
  description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
  keywords: ["アニメ", "インディーアニメ", "ヘンタイ", "無料動画", "成人向け"],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: "xanime",
    title: "xanime｜インディーアニメの配信ポータル",
    description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
    images: [
      {
        url: OG_IMAGE,
        width: 1929,
        height: 1092,
        alt: "xanime ロゴ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "xanime｜インディーアニメの配信ポータル",
    description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
          <LayoutHeader primaryNav={primaryNav} />
          <main className="layout__main">
            <BackButton />
            {children}
          </main>
          <footer className="layout__footer">
            <p>© {new Date().getFullYear()} xanime Studio. All rights reserved.</p>
          </footer>
        </div>
        <FooterNav />
      </body>
    </html>
  );
}
