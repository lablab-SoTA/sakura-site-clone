import type { LoopCloneKind } from "./types";

export type CarouselState = {
  current: number;
  reducedMotion: boolean;
  pendingLoop: LoopCloneKind | null;
  isJumping: boolean;
  scrollTimer: number | null;
  autoplayTimer: number | null;
};

export function createCarouselState(): CarouselState {
  return {
    current: 0,
    reducedMotion: false,
    pendingLoop: null,
    isJumping: false,
    scrollTimer: null,
    autoplayTimer: null,
  };
}
