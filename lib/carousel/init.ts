import {
  cleanupLoopClones,
  ensureLoopClones,
  queryCarouselElements,
  CAROUSEL_SYMBOL,
  type CarouselElements,
} from "./dom";
import { createCarouselState, type CarouselState } from "./state";
import type { CarouselConfig, CarouselController, CarouselOptions, LoopCloneKind } from "./types";

const DEFAULTS: CarouselConfig = {
  autoplay: false,
  intervalMs: 5000,
  snapThresholdRatio: 1.2,
  loop: false,
};

export function initCarousel(root: HTMLElement, opts: CarouselOptions = {}): CarouselController | null {
  if (typeof window === "undefined") {
    return null;
  }
  if ((root as any)[CAROUSEL_SYMBOL]) {
    return (root as any)[CAROUSEL_SYMBOL] as CarouselController;
  }

  const elements = queryCarouselElements(root);
  if (!elements) {
    return null;
  }

  const options = { ...DEFAULTS, ...opts };
  const state = createCarouselState();
  state.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clones = ensureLoopClones(elements, options);
  const loop = createLoopController(elements, clones, options, state);

  const controller = createController(elements, options, state, loop);
  (root as any)[CAROUSEL_SYMBOL] = controller;

  return controller;
}

type LoopController = {
  enabled: boolean;
  resolveOffset: (element: HTMLElement) => number;
  prepareStep: (direction: 1 | -1) => boolean;
  maybeHandleLoop: () => boolean;
  destroy: () => void;
};

type EventTeardown = () => void;

function createController(
  elements: CarouselElements,
  options: CarouselConfig,
  state: CarouselState,
  loop: LoopController,
): CarouselController {
  const { root, viewport, slides, prevButton, nextButton } = elements;
  const resolvedSlides = slides;

  const detachments: EventTeardown[] = [];

  const syncToIndex = (index: number, behavior: ScrollBehavior = preferredBehavior(state)) => {
    state.current = clamp(index, 0, resolvedSlides.length - 1);
    const target = resolvedSlides[state.current];
    if (!target) return;
    alignViewportToElement(viewport, target, behavior, state, loop);
    options.onChange?.(state.current);
  };

  const goTo = (index: number, behavior?: ScrollBehavior) => {
    state.pendingLoop = null;
    syncToIndex(index, behavior);
  };

  const step = (direction: 1 | -1) => {
    const behavior = preferredBehavior(state);
    if (loop.prepareStep(direction)) {
      return;
    }
    syncToIndex(state.current + direction, behavior);
  };

  const next = () => step(1);
  const prev = () => step(-1);

  detachments.push(attachKeyboardControls(root, viewport, { next, prev, goTo, slides: resolvedSlides }));
  detachments.push(attachControlButton(prevButton, prev));
  detachments.push(attachControlButton(nextButton, next));
  detachments.push(attachWheelIntent(viewport, options.snapThresholdRatio));
  detachments.push(
    attachScrollObserver(viewport, state, resolvedSlides, loop, (index) => {
      if (index !== state.current) {
        state.current = index;
        options.onChange?.(state.current);
      }
    }),
  );

  const autoplay = createAutoplay(viewport, state, options, next);
  const motion = observeMotionPreference(state, autoplay);
  detachments.push(motion.dispose);

  options.onChange?.(state.current);
  autoplay.start();
  window.requestAnimationFrame(() => {
    alignViewportToElement(viewport, resolvedSlides[state.current], "auto", state, loop);
  });

  const destroy = () => {
    detachments.forEach((dispose) => dispose());
    autoplay.dispose();
    loop.destroy();
    if (state.scrollTimer) window.clearTimeout(state.scrollTimer);
    if (state.autoplayTimer) window.clearInterval(state.autoplayTimer);
    delete (root as any)[CAROUSEL_SYMBOL];
  };

  return {
    goTo,
    next,
    prev,
    destroy,
    get index() {
      return state.current;
    },
  };
}

function alignViewportToElement(
  viewport: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior,
  state: CarouselState,
  loop: LoopController,
) {
  if (!element) return;
  const left = loop.resolveOffset(element);
  if (behavior === "auto") {
    state.isJumping = true;
    viewport.scrollTo({ left, behavior: "auto" });
    window.requestAnimationFrame(() => {
      state.isJumping = false;
    });
  } else {
    viewport.scrollTo({ left, behavior });
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function preferredBehavior(state: CarouselState): ScrollBehavior {
  return state.reducedMotion ? "auto" : "smooth";
}

function createLoopController(
  elements: CarouselElements,
  clones: Partial<Record<LoopCloneKind, HTMLElement>>,
  options: CarouselConfig,
  state: CarouselState,
): LoopController {
  const { viewport, slides } = elements;
  const enabled = Boolean(options.loop && slides.length > 1 && clones.head && clones.tail);

  const resolveOffset = (element: HTMLElement) => {
    const base = element.offsetLeft - viewport.offsetLeft;
    const centerOffset = (viewport.clientWidth - element.offsetWidth) / 2;
    return base - centerOffset;
  };

  const prepareStep = (direction: 1 | -1) => {
    if (!enabled) return false;
    const head = clones.head;
    const tail = clones.tail;
    if (!head || !tail) return false;

    const behavior = preferredBehavior(state);
    if (direction === 1 && state.current >= slides.length - 1) {
      state.current = 0;
      options.onChange?.(state.current);
      state.pendingLoop = "tail";
      alignViewportToElement(viewport, tail, behavior, state, loopController);
      return true;
    }

    if (direction === -1 && state.current <= 0) {
      state.current = slides.length - 1;
      options.onChange?.(state.current);
      state.pendingLoop = "head";
      alignViewportToElement(viewport, head, behavior, state, loopController);
      return true;
    }

    return false;
  };

  const maybeHandleLoop = () => {
    if (!enabled) return false;
    const head = clones.head;
    const tail = clones.tail;
    if (!head || !tail) return false;

    const scrollLeft = viewport.scrollLeft;
    const headOffset = resolveOffset(head);
    const tailOffset = resolveOffset(tail);
    const firstOffset = resolveOffset(slides[0]);
    const lastOffset = resolveOffset(slides[slides.length - 1]);

    const near = (value: number, target: number) => Math.abs(value - target) <= 8;

    if (state.pendingLoop === "tail" && near(scrollLeft, tailOffset)) {
      state.pendingLoop = null;
      alignViewportToElement(viewport, slides[0], "auto", state, loopController);
      return true;
    }

    if (state.pendingLoop === "head" && near(scrollLeft, headOffset)) {
      state.pendingLoop = null;
      alignViewportToElement(viewport, slides[slides.length - 1], "auto", state, loopController);
      return true;
    }

    if (!state.pendingLoop) {
      if (scrollLeft <= headOffset + 8 && scrollLeft < firstOffset) {
        state.current = slides.length - 1;
        options.onChange?.(state.current);
        alignViewportToElement(viewport, slides[state.current], "auto", state, loopController);
        return true;
      }
      if (scrollLeft >= tailOffset - 8 && scrollLeft > lastOffset) {
        state.current = 0;
        options.onChange?.(state.current);
        alignViewportToElement(viewport, slides[state.current], "auto", state, loopController);
        return true;
      }
    }

    return false;
  };

  const destroy = () => {
    cleanupLoopClones(clones);
  };

  const loopController: LoopController = {
    enabled,
    resolveOffset,
    prepareStep,
    maybeHandleLoop,
    destroy,
  };

  return loopController;
}

function attachKeyboardControls(
  root: HTMLElement,
  viewport: HTMLElement,
  actions: { next: () => void; prev: () => void; goTo: (index: number) => void; slides: HTMLElement[] },
): EventTeardown {
  const onKey = (event: KeyboardEvent) => {
    const { key } = event;
    const active = document.activeElement;
    const focusWithin = !!active && (viewport.contains(active) || root.contains(active));
    if (!focusWithin) {
      return;
    }
    if (key === "ArrowRight") {
      event.preventDefault();
      actions.next();
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      actions.prev();
    } else if (key === "Home") {
      event.preventDefault();
      actions.goTo(0);
    } else if (key === "End") {
      event.preventDefault();
      actions.goTo(actions.slides.length - 1);
    }
  };

  window.addEventListener("keydown", onKey, { passive: false });
  return () => window.removeEventListener("keydown", onKey);
}

function attachWheelIntent(viewport: HTMLElement, threshold: number): EventTeardown {
  const onWheel = (event: WheelEvent) => {
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    const mostlyHorizontal = absX > absY * threshold;

    if (!mostlyHorizontal) {
      return;
    }

    const delta = absX >= absY ? event.deltaX : event.deltaY;
    const goingLeft = delta < 0;
    const goingRight = delta > 0;

    const atStart = viewport.scrollLeft <= 0;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const atEnd = viewport.scrollLeft >= maxScroll;

    if ((goingLeft && atStart) || (goingRight && atEnd)) {
      return;
    }

    event.preventDefault();
    viewport.scrollLeft += delta;
  };

  viewport.addEventListener("wheel", onWheel as EventListener, { passive: false });
  return () => viewport.removeEventListener("wheel", onWheel as EventListener);
}

function attachScrollObserver(
  viewport: HTMLElement,
  state: CarouselState,
  slides: HTMLElement[],
  loop: LoopController,
  onIndexChange: (index: number) => void,
): EventTeardown {
  const handler = () => {
    if (state.isJumping) {
      if (state.scrollTimer) {
        window.clearTimeout(state.scrollTimer);
        state.scrollTimer = null;
      }
      return;
    }
    if (state.scrollTimer) {
      window.clearTimeout(state.scrollTimer);
    }
    state.scrollTimer = window.setTimeout(() => {
      state.scrollTimer = null;
      if (loop.maybeHandleLoop()) {
        return;
      }
      const index = findNearestIndex(viewport, slides, loop.resolveOffset);
      onIndexChange(index);
    }, 100);
  };

  viewport.addEventListener("scroll", handler, { passive: true });
  return () => viewport.removeEventListener("scroll", handler);
}

function findNearestIndex(
  viewport: HTMLElement,
  slides: HTMLElement[],
  offsetResolver: (element: HTMLElement) => number,
) {
  let nearest = 0;
  let smallestDistance = Number.POSITIVE_INFINITY;
  const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
  slides.forEach((slide, index) => {
    const slideCenter = offsetResolver(slide) + slide.offsetWidth / 2;
    const distance = Math.abs(slideCenter - viewportCenter);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      nearest = index;
    }
  });
  return nearest;
}

function createAutoplay(
  viewport: HTMLElement,
  state: CarouselState,
  options: CarouselConfig,
  advance: () => void,
) {
  const start = () => {
    if (!options.autoplay || state.reducedMotion) {
      return;
    }
    stop();
    state.autoplayTimer = window.setInterval(() => {
      advance();
    }, options.intervalMs);
  };

  const stop = () => {
    if (state.autoplayTimer) {
      window.clearInterval(state.autoplayTimer);
      state.autoplayTimer = null;
    }
  };

  const pointerDown = () => stop();
  const mouseEnter = () => stop();
  const mouseLeave = () => start();

  viewport.addEventListener("pointerdown", pointerDown, { passive: true });
  viewport.addEventListener("mouseenter", mouseEnter, { passive: true });
  viewport.addEventListener("mouseleave", mouseLeave, { passive: true });

  return {
    start,
    stop,
    dispose: () => {
      stop();
      viewport.removeEventListener("pointerdown", pointerDown);
      viewport.removeEventListener("mouseenter", mouseEnter);
      viewport.removeEventListener("mouseleave", mouseLeave);
    },
  };
}

function observeMotionPreference(state: CarouselState, autoplay: { start: () => void; stop: () => void }) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");

  const listener = () => {
    state.reducedMotion = media.matches;
    if (state.reducedMotion) {
      autoplay.stop();
    } else {
      autoplay.start();
    }
  };

  media.addEventListener?.("change", listener);

  return {
    dispose: () => media.removeEventListener?.("change", listener),
  };
}

function attachControlButton(button: HTMLElement | null | undefined, handler: () => void): EventTeardown {
  if (!button) {
    return () => {};
  }
  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    handler();
  };
  button.addEventListener("click", onClick);
  return () => button.removeEventListener("click", onClick);
}
