"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { CarouselController } from "@/lib/ux-carousel";
import { initCarousel } from "@/lib/ux-carousel";

type UseHeroCarouselOptions = {
  slideCount: number;
  trackKey: string;
  autoplay?: boolean;
  intervalMs?: number;
};

type UseHeroCarouselResult = {
  rootRef: RefObject<HTMLElement | null>;
  activeIndex: number;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
};

export function useHeroCarousel({ slideCount, trackKey, autoplay, intervalMs }: UseHeroCarouselOptions): UseHeroCarouselResult {
  const rootRef = useRef<HTMLElement | null>(null);
  const controllerRef = useRef<CarouselController | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const loopEnabled = slideCount > 1;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const controller = initCarousel(root, {
      loop: loopEnabled,
      autoplay: autoplay && loopEnabled,
      intervalMs,
      onChange: (index) => setActiveIndex(index),
    });

    if (!controller) {
      setActiveIndex(0);
      controllerRef.current = null;
      return;
    }

    controllerRef.current = controller;
    setActiveIndex(controller.index);

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [autoplay, intervalMs, loopEnabled, slideCount, trackKey]);

  const goTo = useCallback((index: number) => {
    controllerRef.current?.goTo(index);
  }, []);

  const next = useCallback(() => {
    controllerRef.current?.next();
  }, []);

  const prev = useCallback(() => {
    controllerRef.current?.prev();
  }, []);

  return useMemo(
    () => ({
      rootRef,
      activeIndex,
      goTo,
      next,
      prev,
    }),
    [activeIndex, goTo, next, prev],
  );
}
