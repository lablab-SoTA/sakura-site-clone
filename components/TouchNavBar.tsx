"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

type TouchNavBarProps = {
  variant: "header" | "footer";
};

type NavKey = "home" | "upload" | "account";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  match: (path: string) => boolean;
};

type Rect = {
  width: number;
  height: number;
  left: number;
  top: number;
};

const BASE_NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    key: "home",
    label: "ホーム",
    href: "/",
    match: (path) => path === "/" || path.startsWith("/videos") || path.startsWith("/watch"),
  },
  {
    key: "upload",
    label: "追加",
    href: "/upload",
    match: (path) => path.startsWith("/upload"),
  },
  {
    key: "account",
    label: "アカウント",
    href: "/settings/profile",
    match: (path) =>
      path.startsWith("/settings") || path.startsWith("/auth") || path.startsWith("/u/"),
  },
];

export default function TouchNavBar({ variant }: TouchNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const ignoreClickRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      void import("@/lib/supabase/client")
        .then(({ getBrowserSupabaseClient }) => {
          if (!isActive) {
            return;
          }
          setSupabase(getBrowserSupabaseClient());
        })
        .catch((error) => {
          console.error("Supabase クライアントの読み込みに失敗しました", error);
        });
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let isMounted = true;

    const resolveSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      setIsAuthenticated(Boolean(data.session));
    };

    resolveSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const navItems = useMemo<NavItem[]>(() => {
    return BASE_NAV_ITEMS.map((item) => {
      if (item.key === "upload") {
        if (isAuthenticated === false) {
          return {
            ...item,
            href: `/auth/login?redirectTo=${encodeURIComponent("/upload")}`,
          };
        }
        return { ...item };
      }

      if (item.key === "account") {
        if (isAuthenticated) {
          return {
            ...item,
            label: "マイページ",
            href: "/settings/profile",
          };
        }

        if (isAuthenticated === false) {
          return {
            ...item,
            label: "ログイン",
            href: `/auth/login?redirectTo=${encodeURIComponent("/settings/profile")}`,
          };
        }
        return { ...item };
      }

      return { ...item };
    });
  }, [isAuthenticated]);

  const activeIndex = useMemo(() => {
    const foundIndex = navItems.findIndex((item) => item.match(pathname));
    return foundIndex === -1 ? 0 : foundIndex;
  }, [navItems, pathname]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pressRect, setPressRect] = useState<Rect | null>(null);
  const [activeRect, setActiveRect] = useState<Rect | null>(null);
  const [pointerId, setPointerId] = useState<number | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const getRectForIndex = useCallback((index: number) => {
    if (!navRef.current) {
      return null;
    }
    const target = navRef.current.querySelector<HTMLElement>(`[data-nav-index="${index}"]`);
    if (!target) {
      return null;
    }
    const containerRect = navRef.current.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    return {
      width: targetRect.width,
      height: targetRect.height,
      left: targetRect.left - containerRect.left,
      top: targetRect.top - containerRect.top,
    };
  }, []);

  const resolveIndexFromClientX = useCallback((clientX: number) => {
    if (!navRef.current) {
      return null;
    }
    const nodes = Array.from(
      navRef.current.querySelectorAll<HTMLElement>("[data-nav-index]"),
    ).sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      return rectA.left - rectB.left;
    });

    if (nodes.length === 0) {
      return null;
    }

    const containerRect = navRef.current.getBoundingClientRect();

    if (clientX <= containerRect.left) {
      return Number(nodes[0].dataset.navIndex);
    }

    if (clientX >= containerRect.right) {
      return Number(nodes[nodes.length - 1].dataset.navIndex);
    }

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return Number(node.dataset.navIndex);
      }
    }

    return null;
  }, []);

  useEffect(() => {
    if (isPressing) {
      return;
    }
    const rect = getRectForIndex(activeIndex);
    setActiveRect(rect);
  }, [activeIndex, getRectForIndex, isPressing, navItems, pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (isPressing) {
        return;
      }
      const rect = getRectForIndex(activeIndex);
      setActiveRect(rect);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, getRectForIndex, isPressing, navItems]);

  const completeNavigation = useCallback(
    (index: number) => {
      const target = navItems[index];
      if (!target) {
        return;
      }
      router.push(target.href);
    },
    [navItems, router],
  );

  const resetInteraction = useCallback(() => {
    setIsPressing(false);
    setPressRect(null);
    setDragIndex(null);
    setPointerId(null);
    window.setTimeout(() => {
      ignoreClickRef.current = false;
    }, 0);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    ignoreClickRef.current = true;
    setPointerId(event.pointerId);
    setIsPressing(true);
    setDragIndex(index);
    setPressRect(getRectForIndex(index));
    navRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPressing || pointerId === null || event.pointerId !== pointerId) {
      return;
    }
    const nextIndex = resolveIndexFromClientX(event.clientX);
    if (nextIndex === null) {
      return;
    }
    setDragIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    setPressRect(getRectForIndex(nextIndex));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPressing || pointerId === null || event.pointerId !== pointerId) {
      return;
    }
    navRef.current?.releasePointerCapture(event.pointerId);
    const targetIndex = dragIndex ?? activeIndex;
    resetInteraction();
    completeNavigation(targetIndex);
  };

  const handlePointerCancel = () => {
    resetInteraction();
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (ignoreClickRef.current) {
      event.preventDefault();
      if (pointerId !== null) {
        try {
          navRef.current?.releasePointerCapture(pointerId);
        } catch {
          /* noop: pointer capture may already be released */
        }
      }
      const targetIndex = dragIndex ?? index;
      resetInteraction();
      completeNavigation(targetIndex);
      return;
    }
    completeNavigation(index);
  };

  const visualIndex = isPressing ? dragIndex ?? activeIndex : activeIndex;

  return (
    <div
      ref={navRef}
      className={`touch-nav touch-nav--${variant}${isPressing ? " touch-nav--pressing" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
      role="navigation"
      aria-label={variant === "header" ? "主要ナビゲーション" : "フッターナビゲーション"}
    >
      {activeRect && (
        <div
          className="touch-nav__highlight"
          style={{
            width: `${activeRect.width}px`,
            height: `${activeRect.height}px`,
            transform: `translate3d(${activeRect.left}px, ${activeRect.top}px, 0)`,
          }}
          aria-hidden="true"
        />
      )}
      {isPressing && pressRect && (
        <div
          className="touch-nav__glass"
          style={{
            width: `${pressRect.width}px`,
            height: `${pressRect.height}px`,
            transform: `translate3d(${pressRect.left}px, ${pressRect.top}px, 0)`,
          }}
          aria-hidden="true"
        />
      )}

      {navItems.map((item, index) => {
        const isActive = activeIndex === index;
        const isPreview = visualIndex === index && isPressing;
        return (
          <button
            key={item.key}
            type="button"
            className={`touch-nav__btn${isActive ? " touch-nav__btn--active" : ""}${
              isPreview ? " touch-nav__btn--preview" : ""
            }`}
            data-nav-index={index}
            onPointerDown={(event) => handlePointerDown(event, index)}
            onClick={(event) => handleClick(event, index)}
          >
            <span className="touch-nav__icon" aria-hidden="true">
              {item.key === "home" && <HomeIcon />}
              {item.key === "upload" && <PlusSquareIcon />}
              {item.key === "account" && <AccountIcon />}
            </span>
            <span className="touch-nav__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" className="touch-nav__svg">
      <path
        d="M5 9.55 12 4l7 5.55V19a1 1 0 0 1-1 1h-4.5a.5.5 0 0 1-.5-.5V15h-2v4.5a.5.5 0 0 1-.5.5H6a1 1 0 0 1-1-1z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" className="touch-nav__svg">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        ry="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" className="touch-nav__svg">
      <circle cx="12" cy="8.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 18.25c0-2.45 2.69-4.25 6-4.25s6 1.8 6 4.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
