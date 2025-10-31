"use client";

import { usePathname } from "next/navigation";

import Header from "./Header";

type LayoutHeaderProps = {
  primaryNav: Array<{ href: string; label: string }>;
};

export default function LayoutHeader({ primaryNav }: LayoutHeaderProps) {
  const pathname = usePathname();
  const hideHeader = pathname?.startsWith("/feed") ?? false;

  if (hideHeader) {
    return null;
  }

  return <Header primaryNav={primaryNav} />;
}
