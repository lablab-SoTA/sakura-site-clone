"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type NavItem = {
  href: string;
  label: string;
};

type HeaderProps = {
  primaryNav: NavItem[];
  actionNav?: NavItem[];
};

export default function Header({ primaryNav, actionNav = [] }: HeaderProps) {
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
        {(primaryNav.length > 0 || actionNav.length > 0) && (
          <nav className="layout__nav" aria-label="サイト内メインナビゲーション">
            {primaryNav.length > 0 && (
              <div className="layout__nav-group" role="list">
                {primaryNav.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="layout__nav-item"
                    role="listitem"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {actionNav.length > 0 && (
              <div className="layout__nav-actions" aria-label="クリエイター向けメニュー">
                {actionNav.map((item) => (
                  <Link key={item.label} href={item.href} className="layout__nav-action">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
