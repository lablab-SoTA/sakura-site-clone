"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type TransitionEvent,
} from "react";

import type { Anime, AnimeEpisode } from "@/lib/anime";

import usePrefersReducedMotion from "./usePrefersReducedMotion";

const AUTOPLAY_INTERVAL_MS = 6000;
const TRANSITION_DURATION_MS = 620;
const SWIPE_THRESHOLD_PX = 48;
const AXIS_LOCK_THRESHOLD_PX = 8;

export type HeroSlide = {
  anime: Anime;
  episode: AnimeEpisode;
};

export type TrackItem = HeroSlide & {
  key: string;
  originalIndex: number;
  clone: boolean;
};

export type UseHeroCarouselResult = {
  trackItems: TrackItem[];
  slideCount: number;
  hasLoop: boolean;
  activeIndex: number;
  viewportId: string;
  translateIndex: number;
  transitionDurationMs: number;
  isDragging: boolean;
  handleTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  handleFocusCapture: () => void;
  handleBlurCapture: (event: FocusEvent<HTMLElement>) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
};

export default function useHeroCarousel(slides: ReadonlyArray<HeroSlide>): UseHeroCarouselResult {
  const slideCount = slides.length;
  const hasLoop = slideCount > 1;
  const reducedMotion = usePrefersReducedMotion();

  const slideKey = useMemo(
    () => slides.map((slide) => `${slide.anime.slug}-${slide.episode.id}`).join("|"),
    [slides],
  );

  const trackItems = useMemo(() => {
    if (slideCount === 0) {
      return [] as TrackItem[];
    }

    const base = slides.map<TrackItem>((slide, index) => ({
      ...slide,
      key: `${slide.anime.slug}-${slide.episode.id}`,
      originalIndex: index,
      clone: false,
    }));

    if (!hasLoop) {
      return base;
    }

    const headSource = base[base.length - 1];
    const tailSource = base[0];

    return [
      { ...headSource, key: `${headSource.key}-clone-head`, clone: true },
      ...base,
      { ...tailSource, key: `${tailSource.key}-clone-tail`, clone: true },
    ];
  }, [hasLoop, slideCount, slides]);

  const [position, setPosition] = useState(() => (hasLoop ? 1 : 0));
  const positionRef = useRef(position);
  const [transitioning, setTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoplayNonce, setAutoplayNonce] = useState(0);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (slideCount === 0) {
      return;
    }
    setTransitioning(false);
    const resetPosition = hasLoop ? 1 : 0;
    positionRef.current = resetPosition;
    setPosition(resetPosition);
    setAutoplayNonce((value) => value + 1);
  }, [hasLoop, slideCount, slideKey]);

  const activeIndex = useMemo(() => {
    if (slideCount === 0) {
      return 0;
    }
    if (!hasLoop) {
      return Math.min(position, slideCount - 1);
    }
    if (position === 0) {
      return slideCount - 1;
    }
    if (position === slideCount + 1) {
      return 0;
    }
    return position - 1;
  }, [hasLoop, position, slideCount]);

  const clampPosition = useCallback(
    (value: number) => {
      if (!hasLoop) {
        return Math.max(0, Math.min(slideCount - 1, value));
      }
      const max = slideCount + 1;
      if (value < 0) return 0;
      if (value > max) return max;
      return value;
    },
    [hasLoop, slideCount],
  );

  const restartAutoplay = useCallback(() => {
    if (!hasLoop) {
      return;
    }
    setAutoplayNonce((value) => value + 1);
  }, [hasLoop]);

  const step = useCallback(
    (delta: number) => {
      if (!hasLoop || slideCount === 0) {
        return;
      }
      const current = positionRef.current;
      const target = clampPosition(current + delta);
      if (target === current) {
        restartAutoplay();
        return;
      }
      if (!reducedMotion) {
        setTransitioning(true);
      }
      positionRef.current = target;
      setPosition(target);
      restartAutoplay();
    },
    [clampPosition, hasLoop, reducedMotion, restartAutoplay, slideCount],
  );

  const next = useCallback(() => {
    step(1);
  }, [step]);

  const prev = useCallback(() => {
    step(-1);
  }, [step]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= slideCount) {
        return;
      }

      if (!hasLoop) {
        positionRef.current = index;
        setPosition(index);
        return;
      }

      const target = clampPosition(index + 1);
      if (positionRef.current === target) {
        return;
      }

      if (!reducedMotion) {
        setTransitioning(true);
      }

      positionRef.current = target;
      setPosition(target);
      restartAutoplay();
    },
    [clampPosition, hasLoop, reducedMotion, restartAutoplay, slideCount],
  );

  useEffect(() => {
    if (!hasLoop || reducedMotion || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      const current = positionRef.current;
      const target = clampPosition(current + 1);
      if (target === current) {
        return;
      }
      if (!reducedMotion) {
        setTransitioning(true);
      }
      positionRef.current = target;
      setPosition(target);
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [autoplayNonce, clampPosition, hasLoop, isPaused, reducedMotion]);

  const viewportDomId = useId();
  const viewportId = useMemo(
    () => `hero-carousel-viewport-${viewportDomId.replace(/:/g, "")}`,
    [viewportDomId],
  );

  const handleTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || event.propertyName !== "transform") {
        return;
      }
      setTransitioning(false);
      if (!hasLoop) {
        return;
      }
      setPosition((current) => {
        let nextPosition = current;
        if (current === 0) {
          nextPosition = slideCount;
        } else if (current === slideCount + 1) {
          nextPosition = 1;
        }
        positionRef.current = nextPosition;
        return nextPosition;
      });
    },
    [hasLoop, slideCount],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (slideCount <= 1) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    },
    [next, prev, slideCount],
  );

  const [isDragging, setIsDragging] = useState(false);
  const dragPointerId = useRef<number | null>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragAxis = useRef<"pending" | "horizontal" | "vertical">("pending");

  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (dragPointerId.current !== event.pointerId) {
        return;
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      const deltaX = event.clientX - dragStartX.current;
      const isHorizontal = dragAxis.current === "horizontal";
      setIsDragging(false);
      dragPointerId.current = null;
      dragAxis.current = "pending";
      setIsPaused(false);
      if (!isHorizontal) {
        restartAutoplay();
        return;
      }
      if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
        if (deltaX < 0) {
          next();
        } else {
          prev();
        }
      } else {
        restartAutoplay();
      }
    },
    [next, prev, restartAutoplay],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }
    setIsPaused(true);
    setIsDragging(false);
    dragPointerId.current = event.pointerId;
    dragStartX.current = event.clientX;
    dragStartY.current = event.clientY;
    dragAxis.current = "pending";
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (dragPointerId.current !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - dragStartX.current;
      const deltaY = event.clientY - dragStartY.current;

      if (dragAxis.current === "pending") {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX >= AXIS_LOCK_THRESHOLD_PX && absX > absY) {
          dragAxis.current = "horizontal";
          setIsDragging(true);
        } else if (absY >= AXIS_LOCK_THRESHOLD_PX && absY > absX) {
          dragAxis.current = "vertical";
          event.currentTarget.releasePointerCapture(event.pointerId);
          dragPointerId.current = null;
          setIsDragging(false);
          dragAxis.current = "pending";
          setIsPaused(false);
          restartAutoplay();
          return;
        } else {
          return;
        }
      }

      if (dragAxis.current === "horizontal") {
        event.preventDefault();
      }
    },
    [restartAutoplay],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endDrag(event);
    },
    [endDrag],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (dragPointerId.current !== event.pointerId) {
        return;
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      setIsDragging(false);
      dragPointerId.current = null;
      dragAxis.current = "pending";
      setIsPaused(false);
      restartAutoplay();
    },
    [restartAutoplay],
  );

  const handleFocusCapture = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleBlurCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
        setIsPaused(false);
        restartAutoplay();
      }
    },
    [restartAutoplay],
  );

  const translateIndex = position;
  const transitionDurationMs = !reducedMotion && transitioning ? TRANSITION_DURATION_MS : 0;

  return {
    trackItems,
    slideCount,
    hasLoop,
    activeIndex,
    viewportId,
    translateIndex,
    transitionDurationMs,
    isDragging,
    handleTransitionEnd,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleFocusCapture,
    handleBlurCapture,
    goTo,
    next,
    prev,
  };
}
