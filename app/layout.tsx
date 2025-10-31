import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";

import AgeGateQueryReset from "@/components/AgeGateQueryReset";
import LayoutHeader from "@/components/LayoutHeader";
import FooterNav from "@/components/FooterNav";
import BackButton from "@/components/BackButton";

import "./globals.css";

// 実際のサイトURLとOGP画像URL
const SITE_URL = "https://xanime.net";
const OG_IMAGE = `${SITE_URL}/images/title.jpg`;
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "xanime",
  url: SITE_URL,
  description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
  publisher: {
    "@type": "Organization",
    name: "xanime Studio",
    logo: {
      "@type": "ImageObject",
      url: OG_IMAGE,
    },
  },
  inLanguage: "ja-JP",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "ja-JP": "/",
    },
  },
  title: "xanime｜インディーアニメの配信ポータル",
  description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
  keywords: ["アニメ", "インディーアニメ", "ヘンタイ", "無料動画", "成人向け"],
  applicationName: "xanime",
  authors: [{ name: "xanime Studio" }],
  creator: "xanime Studio",
  publisher: "xanime Studio",
  category: "Entertainment",
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
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: ["/favicon.svg"],
    apple: ["/favicon.svg"],
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
        <Script
          id="xanime-structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* 検索エンジン向けのクエリリセットを先に評価 */}
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
