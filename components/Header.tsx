"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

type HeaderProps = {
  primaryNav: NavItem[];
};

export default function Header({ primaryNav }: HeaderProps) {
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const shouldCompact = window.scrollY > 40;
      setIsCompact((prev) => (prev === shouldCompact ? prev : shouldCompact));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const hasPrimaryNav = primaryNav.length > 0;

  if (!hasPrimaryNav) {
    return (
      <header className={`layout__header${isCompact ? " layout__header--compact" : ""}`}>
        <div className="layout__header-inner">
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
        </div>
      </header>
    );
  }

  return (
    <header className={`layout__header${isCompact ? " layout__header--compact" : ""}`}>
      <div className="layout__header-inner">
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
        <nav className="layout__nav" aria-label="サイト内ナビゲーション">
          <div className="layout__nav-group" role="list">
            {primaryNav.map((item) => (
              <Link key={item.label} href={item.href} className="layout__nav-item" role="listitem">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
