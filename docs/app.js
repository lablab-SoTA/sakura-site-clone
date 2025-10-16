document.querySelectorAll("[data-carousel]").forEach((section) => {
  const track = section.querySelector("[data-track]");
  if (!track) {
    return;
  }

  const prev = section.querySelector('[data-direction="prev"]');
  const next = section.querySelector('[data-direction="next"]');
  const buttons = [prev, next].filter(Boolean);

  const getScrollMetrics = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    return {
      maxScroll: Math.max(0, maxScroll),
      position: track.scrollLeft,
    };
  };

  const updateButtons = () => {
    const { maxScroll, position } = getScrollMetrics();
    const tolerance = 4;

    if (prev) {
      const disabled = position <= tolerance;
      prev.disabled = disabled;
      prev.setAttribute("aria-disabled", String(disabled));
    }

    if (next) {
      const disabled = position >= maxScroll - tolerance;
      next.disabled = disabled;
      next.setAttribute("aria-disabled", String(disabled));
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.direction === "next" ? 1 : -1;
      const distance = track.clientWidth * 0.9 * direction;
      track.scrollBy({ left: distance, behavior: "smooth" });
    });
  });

  let rafId = null;
  const scheduleUpdate = () => {
    if (rafId !== null) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateButtons();
    });
  };

  track.addEventListener("scroll", scheduleUpdate, { passive: true });

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(track);
  } else {
    window.addEventListener("resize", scheduleUpdate);
  }

  updateButtons();
});

(() => {
  const topNav = document.querySelector(".top-nav");
  const menuButton = topNav?.querySelector(".top-nav__menu");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  if (!topNav || !menuButton || !mobileNav) {
    return;
  }

  const closeButton = mobileNav.querySelector("[data-nav-close]");
  const focusableSelector =
    'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])';
  let lastFocused = null;

  const setExpandedState = (expanded) => {
    menuButton.setAttribute("aria-expanded", String(expanded));
    menuButton.setAttribute("aria-label", expanded ? "メニューを閉じる" : "メニューを開く");
    mobileNav.setAttribute("aria-hidden", expanded ? "false" : "true");
    document.body.classList.toggle("is-nav-locked", expanded);
    mobileNav.classList.toggle("is-active", expanded);
  };

  const focusFirstItem = () => {
    const target = mobileNav.querySelector(focusableSelector);
    if (target instanceof HTMLElement) {
      target.focus();
    }
  };

  const openNav = () => {
    if (mobileNav.classList.contains("is-active")) {
      return;
    }

    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setExpandedState(true);
    window.requestAnimationFrame(focusFirstItem);
  };

  const closeNav = (restoreFocus = true) => {
    if (!mobileNav.classList.contains("is-active")) {
      return;
    }

    setExpandedState(false);
    if (restoreFocus && lastFocused instanceof HTMLElement) {
      lastFocused.focus();
    }
  };

  menuButton.addEventListener("click", () => {
    const shouldOpen = !mobileNav.classList.contains("is-active");
    if (shouldOpen) {
      openNav();
    } else {
      closeNav();
    }
  });

  closeButton?.addEventListener("click", () => closeNav());

  mobileNav.addEventListener("click", (event) => {
    if (event.target === mobileNav) {
      closeNav();
    }
  });

  mobileNav.querySelectorAll(focusableSelector).forEach((element) => {
    element.addEventListener("click", () => closeNav());
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  const mediaQuery = window.matchMedia("(min-width: 961px)");
  const handleBreakpointChange = () => {
    if (mediaQuery.matches) {
      closeNav(false);
    }
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleBreakpointChange);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(handleBreakpointChange);
  }
})();
