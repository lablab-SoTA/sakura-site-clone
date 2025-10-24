"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const controllerRef = useRef<CarouselController | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const controller = initCarousel(root, {
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
  }, [slideCount]);

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
    >
      <div className="hero-carousel__viewport ux-carousel__viewport" tabIndex={0} aria-label="人気のコンテンツ">
        <div className="hero-carousel__track">
          {slides.map(({ anime, episode }, index) => {
            const posterSrc =
              episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
            const HeadingTag = index === 0 ? "h1" : "h2";
            const isActive = index === activeIndex;
            return (
              <Link
                key={`${anime.slug}-${episode.id}-hero`}
                href={`/watch/${anime.slug}?episode=${episode.id}`}
                className="episode-hero hero-carousel__slide"
                data-slide
                style={{
                  "--hero-slide-active": isActive ? "1" : "0",
                  pointerEvents: isActive ? "auto" : "none",
                } as CSSProperties}
                aria-hidden={!isActive}
                id={`hero-slide-${index}`}
                tabIndex={isActive ? 0 : -1}
                data-active={isActive ? "true" : "false"}
              >
                <Image
                  src={posterSrc}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1080px"
                  className="episode-hero__background"
                />
                <span className="episode-hero__tag">人気のコンテンツ</span>
                <HeadingTag className="episode-hero__title">{episode.title}</HeadingTag>
                <p className="episode-hero__series">
                  {anime.title}・{anime.creator ?? "クリエイター非公開"}
                </p>
                <p className="episode-hero__meta">
                  ▶ {episode.metrics?.views?.toLocaleString("ja-JP") ?? "0"} ／ ♥{" "}
                  {episode.metrics?.likes?.toLocaleString("ja-JP") ?? "0"} ／{" "}
                  {formatDurationMinutes(episode.duration)}
                </p>
                <p className="episode-hero__synopsis">{episode.synopsis}</p>
                <span className="episode-hero__cta">再生する</span>
              </Link>
            );
          })}
        </div>
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
