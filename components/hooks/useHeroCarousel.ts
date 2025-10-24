"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { CarouselController } from "@/lib/ux-carousel";
import { initCarousel } from "@/lib/ux-carousel";

type UseHeroCarouselOptions = {
  slideCount: number;
  trackKey: string;
};

type UseHeroCarouselResult = {
  rootRef: RefObject<HTMLElement | null>;
  activeIndex: number;
  goTo: (index: number) => void;
};

export function useHeroCarousel({ slideCount, trackKey }: UseHeroCarouselOptions): UseHeroCarouselResult {
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
  }, [loopEnabled, slideCount, trackKey]);

  const goTo = useCallback((index: number) => {
    controllerRef.current?.goTo(index);
  }, []);

  return useMemo(
    () => ({
      rootRef,
      activeIndex,
      goTo,
    }),
    [activeIndex, goTo],
  );
}
