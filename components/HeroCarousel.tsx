"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type TransitionEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HeroCarousel.module.css";
import type { Anime, AnimeEpisode } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type HeroSlide = { anime: Anime; episode: AnimeEpisode };
type HeroCarouselProps = { slides: HeroSlide[] };

type TrackItem = HeroSlide & {
  key: string;
  originalIndex: number;
  clone: boolean;
};

const AUTOPLAY_INTERVAL_MS = 6000;
const TRANSITION_DURATION_MS = 620;
const SWIPE_THRESHOLD_PX = 48;

export default function HeroCarousel({ slides }: Readonly<HeroCarouselProps>) {
  const slideCount = slides.length;
  const hasLoop = slideCount > 1;
  const slideKey = useMemo(
    () => slides.map((s) => `${s.anime.slug}-${s.episode.id}`).join("|"),
    [slides],
  );

  const trackItems = useMemo<TrackItem[]>(() => {
    if (slideCount === 0) {
      return [];
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

  const reducedMotion = usePrefersReducedMotion();
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

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

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
        let next = current;
        if (current === 0) {
          next = slideCount;
        } else if (current === slideCount + 1) {
          next = 1;
        }
        positionRef.current = next;
        return next;
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

  const [dragging, setDragging] = useState(false);
  const dragPointerId = useRef<number | null>(null);
  const dragStartX = useRef(0);

  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging || dragPointerId.current !== event.pointerId) {
        return;
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      const deltaX = event.clientX - dragStartX.current;
      setDragging(false);
      dragPointerId.current = null;
      setIsPaused(false);
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
    [dragging, next, prev, restartAutoplay],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }
    setIsPaused(true);
    setDragging(true);
    dragPointerId.current = event.pointerId;
    dragStartX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging || dragPointerId.current !== event.pointerId) {
        return;
      }
      event.preventDefault();
    },
    [dragging],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endDrag(event);
    },
    [endDrag],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging || dragPointerId.current !== event.pointerId) {
        return;
      }
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragging(false);
      dragPointerId.current = null;
      setIsPaused(false);
      restartAutoplay();
    },
    [dragging, restartAutoplay],
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

  const handleDotClick = useCallback((index: number) => {
    goTo(index);
  }, [goTo]);

  if (slideCount === 0) {
    return null;
  }

  const translateIndex = hasLoop ? position : position;
  const transitionDuration = !reducedMotion && transitioning ? `${TRANSITION_DURATION_MS}ms` : "0ms";
  const trackStyle: CSSProperties = {
    transform: `translate3d(-${translateIndex * 100}%, 0, 0)`,
    transitionDuration,
  };

  return (
    <section
      className={`hero ${styles.root}`}
      data-carousel="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="人気のコンテンツ"
      aria-live="polite"
      data-has-multiple={slideCount > 1 ? "true" : "false"}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div className={`hero__bg ${styles.background}`} aria-hidden="true" />

      <div
        id={viewportId}
        className={styles.viewport}
        tabIndex={0}
        role="group"
        aria-label="カルーセルスライド"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className={styles.track} style={trackStyle} onTransitionEnd={handleTransitionEnd}>
          {trackItems.map((item) => {
            const isActive = !item.clone && item.originalIndex === activeIndex;
            const HeadingTag = item.originalIndex === 0 ? "h1" : "h2";
            const posterSrc = item.episode.video.poster || item.anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
            const slidePositionLabel = `${item.originalIndex + 1}枚目 / ${slideCount}枚`;
            const ariaProps = item.clone
              ? { "aria-hidden": true as const }
              : {
                  role: "group" as const,
                  "aria-roledescription": "slide" as const,
                  "aria-label": slidePositionLabel,
                  "aria-hidden": !isActive,
                };

            return (
              <section
                key={item.key}
                id={item.clone ? undefined : `hero-slide-${item.originalIndex}`}
                className={styles.slide}
                data-active={isActive ? "true" : "false"}
                data-clone={item.clone ? "true" : "false"}
                {...ariaProps}
              >
                <div className={styles.card} style={{ pointerEvents: isActive ? "auto" : "none" }}>
                  <div className={styles.frame}>
                    <div className={styles.inner}>
                      <Image
                        src={posterSrc}
                        alt={`${item.anime.title} ${item.episode.title}`}
                        fill
                        sizes="(min-width: 1024px) 920px, 92vw"
                        className={styles.image}
                        priority={!item.clone && item.originalIndex === 0}
                      />
                      <div className={styles.overlay} aria-hidden="true" />

                      <span className={styles.badge}>人気のコンテンツ</span>

                      <div className={styles.content}>
                        <HeadingTag className={styles.title}>{item.anime.title.toUpperCase()}</HeadingTag>

                        <p className={styles.meta}>
                          <span>▶ {toJP(item.episode.metrics?.views ?? 0)}</span>
                          <span aria-hidden="true">／</span>
                          <span>♥ {toJP(item.episode.metrics?.likes ?? 0)}</span>
                          <span aria-hidden="true">／</span>
                          <span>{formatDurationMinutes(item.episode.duration)}</span>
                        </p>

                        <div className={styles.infoPanel}>
                          <p className={styles.desc}>{item.episode.synopsis}</p>

                          <Link
                            href={`/watch/${item.anime.slug}?episode=${item.episode.id}`}
                            className={styles.cta}
                            aria-label={`${item.anime.title} ${item.episode.title} を再生する`}
                            tabIndex={isActive ? 0 : -1}
                          >
                            再生する
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {slideCount > 1 && (
        <>
          <button
            type="button"
            className={styles.control}
            data-direction="prev"
            aria-label="前のスライドへ"
            aria-controls={viewportId}
            onClick={prev}
          >
            <span aria-hidden="true">&lt;</span>
          </button>
          <button
            type="button"
            className={styles.control}
            data-direction="next"
            aria-label="次のスライドへ"
            aria-controls={viewportId}
            onClick={next}
          >
            <span aria-hidden="true">&gt;</span>
          </button>
        </>
      )}

      {slideCount > 1 && (
        <div className={styles.dots} role="tablist" aria-label="スライド選択">
          {slides.map((_, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={`dot-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`hero-slide-${index}`}
                className={styles.dot}
                onClick={() => handleDotClick(index)}
              >
                <span className="sr-only">{index + 1}枚目</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function toJP(n: number) {
  return new Intl.NumberFormat("ja-JP").format(n);
}

function formatDurationMinutes(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return "長さ不明";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}分`;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return prefersReducedMotion;
}
