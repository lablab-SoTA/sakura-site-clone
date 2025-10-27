"use client";

import { useMemo, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import useHeroCarousel, { type HeroSlide } from "@/components/hooks/useHeroCarousel";
import { formatNumberJP } from "@/lib/intl";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

import styles from "./HeroCarousel.module.css";

type HeroCarouselProps = {
  slides: HeroSlide[];
};

export default function HeroCarousel({ slides }: Readonly<HeroCarouselProps>) {
  const {
    trackItems,
    slideCount,
    hasLoop,
    activeIndex,
    viewportId,
    translateIndex,
    transitionDurationMs,
    handleTransitionEnd,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleFocusCapture,
    handleBlurCapture,
    isDragging,
    goTo,
    next,
    prev,
  } = useHeroCarousel(slides);

  if (slideCount === 0) {
    return null;
  }

  const trackStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate3d(-${translateIndex * 100}%, 0, 0)`,
      transitionDuration: `${transitionDurationMs}ms`,
    }),
    [translateIndex, transitionDurationMs],
  );

  return (
    <section
      className={styles.root}
      data-carousel="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="人気のコンテンツ"
      aria-live="polite"
      data-has-multiple={hasLoop ? "true" : "false"}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div className={styles.background} aria-hidden="true" />

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
        data-dragging={isDragging ? "true" : "false"}
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
                          <span>▶ {formatNumberJP(item.episode.metrics?.views ?? 0)}</span>
                          <span aria-hidden="true">／</span>
                          <span>♥ {formatNumberJP(item.episode.metrics?.likes ?? 0)}</span>
                          <span aria-hidden="true">／</span>
                          <span>{formatDurationMinutes(item.episode.duration)}</span>
                        </p>

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
                onClick={() => goTo(index)}
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

function formatDurationMinutes(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return "長さ不明";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}分`;
}
