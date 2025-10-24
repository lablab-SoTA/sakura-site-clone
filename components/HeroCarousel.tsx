"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Anime, AnimeEpisode } from "@/lib/anime";
import { initCarousel, type CarouselController } from "@/lib/ux-carousel";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type HeroSlide = { anime: Anime; episode: AnimeEpisode };
type HeroCarouselProps = { slides: HeroSlide[] };

export default function HeroCarousel({ slides }: Readonly<HeroCarouselProps>) {
  const slideCount = slides.length;
  const slideKey = useMemo(
    () => slides.map((s) => `${s.anime.slug}-${s.episode.id}`).join("|"),
    [slides],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<CarouselController | null>(null);

  // ループ対応の先頭/末尾クローンを付与
  const extendedSlides = useMemo(() => {
    if (slideCount === 0) return [];
    const base = slides.map((item, index) => ({
      anime: item.anime,
      episode: item.episode,
      originalIndex: index,
      clone: undefined as "head" | "tail" | undefined,
    }));
    if (slideCount === 1) return base;
    const head = {
      anime: slides[slideCount - 1].anime,
      episode: slides[slideCount - 1].episode,
      originalIndex: slideCount - 1,
      clone: "head" as const,
    };
    const tail = {
      anime: slides[0].anime,
      episode: slides[0].episode,
      originalIndex: 0,
      clone: "tail" as const,
    };
    return [head, ...base, tail];
  }, [slides, slideCount]);

  // カルーセル初期化（既存 util を使用）
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const controller = initCarousel(root, {
      loop: slideCount > 1,
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
  }, [slideCount, slideKey]);

  const handleDotClick = useCallback((index: number) => {
    controllerRef.current?.goTo(index);
  }, []);

  if (slideCount === 0) return null;

  return (
    <section
      ref={rootRef}
      className="hero"
      data-carousel="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="人気のコンテンツ"
      aria-live="polite"
      data-has-multiple={slideCount > 1 ? "true" : "false"}
    >
      <div className="hero__bg" aria-hidden="true" />

      <div className="ux-carousel__viewport hero__viewport" tabIndex={0}>
        {extendedSlides.map(({ anime, episode, originalIndex, clone }, i) => {
          const isClone = clone != null;
          const isActive = originalIndex === activeIndex;
          const displayActive = !isClone && isActive;
          const HeadingTag = originalIndex === 0 && !isClone ? "h1" : "h2";
          const posterSrc =
            episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;

          const elementId = isClone
            ? `hero-slide-${originalIndex}-clone-${clone}`
            : `hero-slide-${originalIndex}`;

          const pointerInteractive = displayActive;
          const slidePositionLabel = `${originalIndex + 1}枚目 / ${slideCount}枚`;

          return (
            <section
              key={`${anime.slug}-${episode.id}-${isClone ? `clone-${clone}` : "base"}`}
              id={elementId}
              className="hero__slide"
              data-slide
              data-active={displayActive ? "true" : "false"}
              {...(isClone ? { "data-slide-clone": clone } : {})}
              aria-hidden={isClone || !isActive}
              role="group"
              aria-roledescription="slide"
              aria-label={slidePositionLabel}
            >
              <div className="heroCard" style={{ pointerEvents: pointerInteractive ? "auto" : "none" }}>
                <div className="heroCard__frame">
                  <div className="heroCard__inner">
                    <Image
                      src={posterSrc}
                      alt={`${anime.title} ${episode.title}`}
                      fill
                      sizes="(min-width: 1024px) 920px, 92vw"
                      className="heroCard__image"
                      priority={!isClone && originalIndex === 0}
                    />
                    <div className="heroCard__overlay" aria-hidden="true" />

                    <span className="heroCard__badge">人気のコンテンツ</span>

                    <div className="heroCard__content">
                      <HeadingTag className="heroCard__title">{anime.title.toUpperCase()}</HeadingTag>

                      <p className="heroCard__meta">
                        <span>▶ {toJP(episode.metrics?.views ?? 0)}</span>
                        <span aria-hidden="true">／</span>
                        <span>♥ {toJP(episode.metrics?.likes ?? 0)}</span>
                        <span aria-hidden="true">／</span>
                        <span>{formatDurationMinutes(episode.duration)}</span>
                      </p>

                      <div className="heroCard__infoPanel">
                        <p className="heroCard__desc">{episode.synopsis}</p>

                        <Link
                          href={`/watch/${anime.slug}?episode=${episode.id}`}
                          className="heroCard__cta"
                          aria-label={`${anime.title} ${episode.title} を再生する`}
                          tabIndex={pointerInteractive ? 0 : -1}
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
        <div className="hero__dots" role="tablist" aria-label="スライド選択">
          {slides.map((_, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={`dot-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`hero-slide-${index}`}
                className="hero__dot"
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
