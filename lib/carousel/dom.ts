import type { CarouselConfig, LoopCloneKind } from "./types";

export const CAROUSEL_SYMBOL = Symbol("ux-carousel");

const CLONE_SELECTOR = "[data-slide-clone]";

export type CarouselElements = {
  root: HTMLElement;
  viewport: HTMLElement;
  slides: HTMLElement[];
  clones: Partial<Record<LoopCloneKind, HTMLElement>>;
};

export function queryCarouselElements(root: HTMLElement): CarouselElements | null {
  const viewport = root.querySelector<HTMLElement>(".ux-carousel__viewport");
  const rawSlides = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
  if (!viewport || rawSlides.length === 0) {
    return null;
  }

  const slides = rawSlides.filter((slide) => !slide.matches(CLONE_SELECTOR));
  return {
    root,
    viewport,
    slides,
    clones: {},
  };
}

export function ensureLoopClones(
  elements: CarouselElements,
  config: CarouselConfig,
): Partial<Record<LoopCloneKind, HTMLElement>> {
  if (!config.loop || elements.slides.length <= 1) {
    return {};
  }

  const [first, last] = [elements.slides[0], elements.slides[elements.slides.length - 1]];
  if (!first || !last) {
    return {};
  }

  const headClone = cloneSlide(last, "head");
  const tailClone = cloneSlide(first, "tail");

  elements.viewport.insertBefore(headClone, elements.viewport.firstChild);
  elements.viewport.appendChild(tailClone);

  return { head: headClone, tail: tailClone };
}

export function cleanupLoopClones(clones: Partial<Record<LoopCloneKind, HTMLElement>>) {
  Object.values(clones).forEach((clone) => {
    clone?.remove();
  });
}

function cloneSlide(source: HTMLElement, kind: LoopCloneKind) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.dataset.slideClone = kind;
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("tabindex", "-1");
  clone.removeAttribute("id");
  clone.removeAttribute("data-active");

  disableInteractiveChildren(clone);

  return clone;
}

function disableInteractiveChildren(element: HTMLElement) {
  const interactiveSelectors =
    "a,button,input,select,textarea,[tabindex]:not([tabindex=\"-1\"])";
  element.querySelectorAll<HTMLElement>(interactiveSelectors).forEach((node) => {
    node.setAttribute("tabindex", "-1");
    node.setAttribute("aria-hidden", "true");
  });
}
