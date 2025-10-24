"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { Anime, AnimeEpisode } from "@/lib/anime";
import { initCarousel, type CarouselController } from "@/lib/ux-carousel";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type HeroSlide = {
  anime: Anime;
  episode: AnimeEpisode;
};

type HeroCarouselProps = {
  slides: HeroSlide[];
};

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const slideCount = slides.length;
  const slideKey = useMemo(
    () => slides.map((item) => `${item.anime.slug}-${item.episode.id}`).join("|"),
    [slides],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const controllerRef = useRef<CarouselController | null>(null);

  const extendedSlides = useMemo(() => {
    if (slideCount === 0) {
      return [];
    }
    const base = slides.map((item, index) => ({
      anime: item.anime,
      episode: item.episode,
      originalIndex: index,
      clone: undefined as "head" | "tail" | undefined,
    }));
    if (slideCount === 1) {
      return base;
    }
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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
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

  if (slideCount === 0) {
    return null;
  }

  return (
    <section
      ref={rootRef}
      className="hero-carousel"
      data-carousel="hero"
      role="region"
      aria-roledescription="carousel"
      aria-label="人気のコンテンツ"
      aria-live="polite"
      data-carousel-length={slideCount}
      data-carousel-loop={slideCount > 1 ? "true" : "false"}
    >
      <div className="hero-carousel__viewport ux-carousel__viewport" tabIndex={0} aria-label="人気のコンテンツ">
        {extendedSlides.map(({ anime, episode, originalIndex, clone }, positionIndex) => {
          const slideId = `${anime.slug}-${episode.id}`;
          const isClone = clone != null;
          const isActive = originalIndex === activeIndex;
          const HeadingTag = originalIndex === 0 && !isClone ? "h1" : "h2";
          const posterSrc = episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
          const pointerInteractive = !isClone && isActive;
          const keySuffix = isClone ? `clone-${clone}` : "base";
          const elementId = isClone ? `hero-slide-${originalIndex}-clone-${clone}` : `hero-slide-${originalIndex}`;
          const creatorLabel = anime.creator ?? "クリエイター非公開";
          return (
            <Link
              key={`${slideId}-${keySuffix}-${positionIndex}`}
              href={`/watch/${anime.slug}?episode=${episode.id}`}
              className="episode-hero hero-carousel__slide"
              data-slide
              data-slide-index={String(originalIndex)}
              data-slide-clone={isClone ? clone : undefined}
              style={
                {
                  "--hero-slide-active": isActive ? "1" : "0",
                  pointerEvents: pointerInteractive ? "auto" : "none",
                } as CSSProperties
              }
              aria-hidden={isClone ? true : !isActive}
              id={elementId}
              tabIndex={pointerInteractive ? 0 : -1}
              data-active={isActive ? "true" : "false"}
            >
              <Image
                src={posterSrc}
                alt=""
                fill
                priority={!isClone && originalIndex === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1080px"
                className="episode-hero__background"
              />
              <div className="episode-hero__content">
                <span className="episode-hero__tag">人気のコンテンツ</span>
                <div className="episode-hero__title-row">
                  <HeadingTag className="episode-hero__title">{episode.title}</HeadingTag>
                  <p className="episode-hero__series">
                    <span>{anime.title}</span>
                    <span aria-hidden="true">・</span>
                    <span>{creatorLabel}</span>
                  </p>
                </div>
                <p className="episode-hero__meta">
                  ▶ {episode.metrics?.views?.toLocaleString("ja-JP") ?? "0"} ／ ♥{" "}
                  {episode.metrics?.likes?.toLocaleString("ja-JP") ?? "0"} ／{" "}
                  {formatDurationMinutes(episode.duration)}
                </p>
                <p className="episode-hero__synopsis">{episode.synopsis}</p>
                <div className="episode-hero__actions">
                  <span className="episode-hero__cta">再生する</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="hero-carousel__dots" role="group" aria-label="スライド選択">
        {slides.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={`hero-dot-${index}`}
              type="button"
              className="hero-carousel__dot"
              aria-label={`スライド${index + 1}`}
              aria-pressed={isActive}
              data-active={isActive ? "true" : "false"}
              aria-controls={`hero-slide-${index}`}
              onClick={() => handleDotClick(index)}
            />
          );
        })}
      </div>
    </section>
  );
}

function formatDurationMinutes(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) {
    return "長さ不明";
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes}分`;
}
