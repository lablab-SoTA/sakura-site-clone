export type CarouselOptions = {
  autoplay?: boolean;
  intervalMs?: number;
  snapThresholdRatio?: number;
  loop?: boolean;
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
  const slideElements = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
  const slides = slideElements.filter((element) => !element.dataset.slideClone);
  const loopHead = slideElements.find((element) => element.dataset.slideClone === "head") ?? null;
  const loopTail = slideElements.find((element) => element.dataset.slideClone === "tail") ?? null;

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
    loop: false,
    ...opts,
  };

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const toIndex = (index: number) => clamp(index, 0, slides.length - 1);

  let current = toIndex(0);
  let autoplayTimer: number | null = null;
  let scrollTimer: number | null = null;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let pendingLoop: "head" | "tail" | null = null;
  let isJumping = false;

  const loopEnabled = Boolean(options.loop && slides.length > 1 && loopHead && loopTail);

  root.setAttribute("role", "region");
  root.setAttribute("aria-roledescription", "carousel");
  if (!root.getAttribute("aria-label")) {
    root.setAttribute("aria-label", "Hero carousel");
  }
  root.setAttribute("aria-live", options.autoplay ? "off" : "polite");

  const defaultBehavior = () => (reducedMotion ? "auto" : "smooth");

  const setScrollPosition = (left: number, behavior: ScrollBehavior) => {
    if (behavior === "auto") {
      isJumping = true;
      viewport.scrollTo({ left, behavior: "auto" });
      window.requestAnimationFrame(() => {
        isJumping = false;
      });
    } else {
      viewport.scrollTo({ left, behavior });
    }
  };

  const getOffset = (element: HTMLElement) => element.offsetLeft - viewport.offsetLeft;

  const syncToIndex = (index: number, behavior?: ScrollBehavior, notify = true) => {
    current = toIndex(index);
    const target = slides[current];
    if (!target) {
      return;
    }
    const offset = getOffset(target);
    setScrollPosition(offset, behavior ?? defaultBehavior());
    if (notify) {
      options.onChange?.(current);
    }
  };

  const goTo = (index: number, behavior?: ScrollBehavior) => {
    pendingLoop = null;
    syncToIndex(index, behavior);
  };

  const step = (direction: 1 | -1) => {
    const behavior = defaultBehavior();
    if (!loopEnabled) {
      syncToIndex(current + direction, behavior);
      return;
    }
    if (direction === 1 && current >= slides.length - 1) {
      current = 0;
      options.onChange?.(current);
      pendingLoop = "tail";
      setScrollPosition(getOffset(loopTail as HTMLElement), behavior);
      return;
    }
    if (direction === -1 && current <= 0) {
      current = slides.length - 1;
      options.onChange?.(current);
      pendingLoop = "head";
      setScrollPosition(getOffset(loopHead as HTMLElement), behavior);
      return;
    }
    syncToIndex(current + direction, behavior);
  };

  const next = () => step(1);
  const prev = () => step(-1);

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

  const maybeHandleLoop = () => {
    if (!loopEnabled || !loopHead || !loopTail) {
      return false;
    }

    const scrollLeft = viewport.scrollLeft;
    const headOffset = getOffset(loopHead);
    const tailOffset = getOffset(loopTail);
    const firstOffset = getOffset(slides[0]);
    const lastOffset = getOffset(slides[slides.length - 1]);
    const near = (value: number, target: number) => Math.abs(value - target) <= 2;

    if (pendingLoop === "tail" && near(scrollLeft, tailOffset)) {
      pendingLoop = null;
      syncToIndex(0, "auto", false);
      return true;
    }

    if (pendingLoop === "head" && near(scrollLeft, headOffset)) {
      pendingLoop = null;
      syncToIndex(slides.length - 1, "auto", false);
      return true;
    }

    if (!pendingLoop) {
      if (scrollLeft <= headOffset + 2 && scrollLeft < firstOffset) {
        current = slides.length - 1;
        options.onChange?.(current);
        syncToIndex(current, "auto", false);
        return true;
      }
      if (scrollLeft >= tailOffset - 2 && scrollLeft > lastOffset) {
        current = 0;
        options.onChange?.(current);
        syncToIndex(current, "auto", false);
        return true;
      }
    }

    return false;
  };

  const findNearestIndex = () => {
    let nearest = current;
    let smallestDistance = Number.POSITIVE_INFINITY;
    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    slides.forEach((slide, index) => {
      const slideCenter = getOffset(slide) + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - viewportCenter);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearest = index;
      }
    });
    return nearest;
  };

  const onScroll = () => {
    if (isJumping) {
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
        scrollTimer = null;
      }
      return;
    }
    if (scrollTimer) {
      window.clearTimeout(scrollTimer);
    }
    scrollTimer = window.setTimeout(() => {
      scrollTimer = null;
      if (maybeHandleLoop()) {
        return;
      }
      const index = findNearestIndex();
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
      if (loopEnabled) {
        next();
        return;
      }
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
  if (loopEnabled) {
    window.requestAnimationFrame(() => {
      syncToIndex(current, "auto", false);
    });
  }
  options.onChange?.(current);

  const controller: CarouselController = {
    goTo: (index: number) => goTo(index),
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
