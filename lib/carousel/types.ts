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

export type LoopCloneKind = "head" | "tail";

export type CarouselConfig = {
  autoplay: boolean;
  intervalMs: number;
  snapThresholdRatio: number;
  loop: boolean;
  onChange?: (index: number) => void;
};
