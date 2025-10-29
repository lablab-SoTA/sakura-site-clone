"use client";

import dynamic from "next/dynamic";

const TouchNavBar = dynamic(() => import("@/components/TouchNavBar"), {
  ssr: false,
  loading: () => (
    <div className="touch-nav touch-nav--footer" aria-hidden="true">
      <span className="sr-only">ナビゲーションを読み込み中...</span>
    </div>
  ),
});

export default function FooterNav() {
  return (
    <footer className="layout__footer-nav">
      <TouchNavBar variant="footer" />
    </footer>
  );
}
