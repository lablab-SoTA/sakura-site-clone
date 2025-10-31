"use client";

import dynamic from "next/dynamic";

const TouchNavBar = dynamic(() => import("@/components/TouchNavBar"), {
  ssr: false,
  loading: () => (
    <div className="touch-nav touch-nav--footer" aria-hidden="true">
      <span>ホーム</span>
      <span>フィード</span>
      <span aria-hidden="true">＋</span>
      <span>検索</span>
      <span>ログイン</span>
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
