export type CarouselOptions = {
  autoplay?: boolean;
  intervalMs?: number;
  snapThresholdRatio?: number;
  onChange?: (index: number) => void;
};

export type CarouselController = {
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  destroy: () => void;
  readonly index: number;
};

const CAROUSEL_SYMBOL = Symbol("ux-carousel");

export function initCarousel(root: HTMLElement, opts: CarouselOptions = {}): CarouselController | null {
  if (typeof window === "undefined") {
    return null;
  }

  const viewport = root.querySelector<HTMLElement>(".ux-carousel__viewport");
  const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));

  if (!viewport || slides.length === 0) {
    return null;
  }

  if (root[CAROUSEL_SYMBOL]) {
    return root[CAROUSEL_SYMBOL] as CarouselController;
  }

  const options = {
    autoplay: false,
    intervalMs: 5000,
    snapThresholdRatio: 1.2,
    ...opts,
  };

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const toIndex = (index: number) => clamp(index, 0, slides.length - 1);

  let current = toIndex(0);
  let autoplayTimer: number | null = null;
  let scrollTimer: number | null = null;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.setAttribute("role", "region");
  root.setAttribute("aria-roledescription", "carousel");
  if (!root.getAttribute("aria-label")) {
    root.setAttribute("aria-label", "Hero carousel");
  }
  root.setAttribute("aria-live", options.autoplay ? "off" : "polite");

  const goTo = (index: number) => {
    current = toIndex(index);
    const target = slides[current];
    const offset = target.offsetLeft - viewport.offsetLeft;
    viewport.scrollTo({
      left: offset,
      behavior: reducedMotion ? "auto" : "smooth",
    });
    options.onChange?.(current);
  };

  const next = () => {
    goTo(current + 1);
  };

  const prev = () => {
    goTo(current - 1);
  };

  const onKey = (event: KeyboardEvent) => {
    const { key } = event;
    const activeEl = document.activeElement;
    const focusWithinCarousel = !!activeEl && (viewport.contains(activeEl) || root.contains(activeEl));
    if (!focusWithinCarousel) {
      return;
    }
    if (key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      prev();
    } else if (key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (key === "End") {
      event.preventDefault();
      goTo(slides.length - 1);
    }
  };

  const onWheel = (event: WheelEvent) => {
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    const threshold = options.snapThresholdRatio ?? 1.2;
    const mostlyHorizontal = absX > absY * threshold;

    const atStart = viewport.scrollLeft <= 0;
    const atEnd = Math.ceil(viewport.scrollLeft + viewport.clientWidth) >= viewport.scrollWidth;

    if (!mostlyHorizontal) {
      return;
    }

    const delta = absX >= absY ? event.deltaX : event.deltaY;
    const goingLeft = delta < 0;
    const goingRight = delta > 0;

    if ((goingLeft && atStart) || (goingRight && atEnd)) {
      return;
    }

    event.preventDefault();
    viewport.scrollLeft += delta;
  };

  const onScroll = () => {
    if (scrollTimer) {
      window.clearTimeout(scrollTimer);
    }
    scrollTimer = window.setTimeout(() => {
      const width = viewport.clientWidth || 1;
      const index = toIndex(Math.round(viewport.scrollLeft / width));
      if (index !== current) {
        current = index;
        options.onChange?.(current);
      }
    }, 100);
  };

  const startAutoplay = () => {
    if (!options.autoplay || reducedMotion) {
      return;
    }
    stopAutoplay();
    autoplayTimer = window.setInterval(() => {
      const atLast = current >= slides.length - 1;
      goTo(atLast ? 0 : current + 1);
    }, options.intervalMs);
  };

  const stopAutoplay = () => {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };

  const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handleMotionChange = () => {
    reducedMotion = motionMedia.matches;
    if (reducedMotion) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  };

  const wheelListener = onWheel as EventListener;

  const destroy = () => {
    window.removeEventListener("keydown", onKey);
    motionMedia.removeEventListener?.("change", handleMotionChange);
    viewport.removeEventListener("wheel", wheelListener);
    viewport.removeEventListener("scroll", onScroll);
    viewport.removeEventListener("pointerdown", stopAutoplay);
    viewport.removeEventListener("mouseenter", stopAutoplay);
    viewport.removeEventListener("mouseleave", startAutoplay);
    if (scrollTimer) {
      window.clearTimeout(scrollTimer);
      scrollTimer = null;
    }
    stopAutoplay();
    if (root[CAROUSEL_SYMBOL]) {
      delete root[CAROUSEL_SYMBOL];
    }
  };

  window.addEventListener("keydown", onKey, { passive: false });
  viewport.addEventListener("wheel", wheelListener, { passive: false });
  viewport.addEventListener("scroll", onScroll, { passive: true });
  viewport.addEventListener("pointerdown", stopAutoplay, { passive: true });
  viewport.addEventListener("mouseenter", stopAutoplay, { passive: true });
  viewport.addEventListener("mouseleave", startAutoplay, { passive: true });
  motionMedia.addEventListener?.("change", handleMotionChange);

  startAutoplay();
  options.onChange?.(current);

  const controller: CarouselController = {
    goTo,
    next,
    prev,
    destroy,
    get index() {
      return current;
    },
  };

  root[CAROUSEL_SYMBOL] = controller;

  return controller;
}

export function bindHorizontalIntentScroll(container: HTMLElement, thresholdRatio = 1.2) {
  if (typeof window === "undefined") {
    return;
  }
  const onWheel = (event: WheelEvent) => {
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    const mostlyHorizontal = absX > absY * thresholdRatio;

    const atStart = container.scrollLeft <= 0;
    const atEnd = Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth;

    if (!mostlyHorizontal) {
      return;
    }

    const delta = absX >= absY ? event.deltaX : event.deltaY;
    const goingLeft = delta < 0;
    const goingRight = delta > 0;

    if ((goingLeft && atStart) || (goingRight && atEnd)) {
      return;
    }

    event.preventDefault();
    container.scrollLeft += delta;
  };

  container.addEventListener("wheel", onWheel as EventListener, { passive: false });
}

declare global {
  interface HTMLElement {
    [CAROUSEL_SYMBOL]?: CarouselController;
  }
}
