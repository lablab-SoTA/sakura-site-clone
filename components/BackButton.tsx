"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  if (pathname === "/" || pathname?.startsWith("/feed")) {
    return null;
  }

  return (
    <button
      type="button"
      className="back-button"
      onClick={handleClick}
      aria-label="前のページへ戻る"
    >
      ← 戻る
    </button>
  );
}
