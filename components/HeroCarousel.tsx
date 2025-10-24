"use client";

import { useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HeroCarousel.module.css";
import type { Anime, AnimeEpisode } from "@/lib/anime";
import { useHeroCarousel } from "@/components/hooks/useHeroCarousel";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type HeroSlide = { anime: Anime; episode: AnimeEpisode };
type HeroCarouselProps = { slides: HeroSlide[] };

export default function HeroCarousel({ slides }: Readonly<HeroCarouselProps>) {
  const slideCount = slides.length;
  const slideKey = useMemo(
    () => slides.map((s) => `${s.anime.slug}-${s.episode.id}`).join("|"),
    [slides],
  );
  const { rootRef, activeIndex, goTo } = useHeroCarousel({ slideCount, trackKey: slideKey });
  const handleDotClick = useCallback((index: number) => {
    goTo(index);
  }, [goTo]);

  if (slideCount === 0) return null;

  return (
    <section
      ref={rootRef}
      className={`hero ${styles.root}`}
      data-carousel="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="人気のコンテンツ"
      aria-live="polite"
      data-has-multiple={slideCount > 1 ? "true" : "false"}
    >
      <div className={`hero__bg ${styles.background}`} aria-hidden="true" />

      <div className={`ux-carousel__viewport hero__viewport ${styles.viewport}`} tabIndex={0}>
        {slides.map(({ anime, episode }, index) => {
          const isActive = index === activeIndex;
          const HeadingTag = index === 0 ? "h1" : "h2";
          const posterSrc = episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
          const slidePositionLabel = `${index + 1}枚目 / ${slideCount}枚`;

          return (
            <section
              key={`${anime.slug}-${episode.id}`}
              id={`hero-slide-${index}`}
              className={`hero__slide ${styles.slide}`}
              data-slide
              data-active={isActive ? "true" : "false"}
              aria-hidden={!isActive}
              role="group"
              aria-roledescription="slide"
              aria-label={slidePositionLabel}
            >
              <div className={`heroCard ${styles.card}`} style={{ pointerEvents: isActive ? "auto" : "none" }}>
                <div className={`heroCard__frame ${styles.frame}`}>
                  <div className={`heroCard__inner ${styles.inner}`}>
                    <Image
                      src={posterSrc}
                      alt={`${anime.title} ${episode.title}`}
                      fill
                      sizes="(min-width: 1024px) 920px, 92vw"
                      className={`heroCard__image ${styles.image}`}
                      priority={index === 0}
                    />
                    <div className={`heroCard__overlay ${styles.overlay}`} aria-hidden="true" />

                    <span className={`heroCard__badge ${styles.badge}`}>人気のコンテンツ</span>

                    <div className={`heroCard__content ${styles.content}`}>
                      <HeadingTag className={`heroCard__title ${styles.title}`}>{anime.title.toUpperCase()}</HeadingTag>

                      <p className={`heroCard__meta ${styles.meta}`}>
                        <span>▶ {toJP(episode.metrics?.views ?? 0)}</span>
                        <span aria-hidden="true">／</span>
                        <span>♥ {toJP(episode.metrics?.likes ?? 0)}</span>
                        <span aria-hidden="true">／</span>
                        <span>{formatDurationMinutes(episode.duration)}</span>
                      </p>

                      <div className={`heroCard__infoPanel ${styles.infoPanel}`}>
                        <p className={`heroCard__desc ${styles.desc}`}>{episode.synopsis}</p>

                        <Link
                          href={`/watch/${anime.slug}?episode=${episode.id}`}
                          className={`heroCard__cta ${styles.cta}`}
                          aria-label={`${anime.title} ${episode.title} を再生する`}
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

      {/* ドットナビゲーション */}
      {slides.length > 1 && (
        <div className={`hero__dots ${styles.dots}`} role="tablist" aria-label="スライド選択">
          {slides.map((_, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={`dot-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`hero-slide-${index}`}
                className={`hero__dot ${styles.dot}`}
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
