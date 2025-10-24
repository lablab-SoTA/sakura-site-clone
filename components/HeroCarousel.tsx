"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";

import type { Anime, AnimeEpisode } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type HeroSlide = {
  anime: Anime;
  episode: AnimeEpisode;
};

type HeroCarouselProps = {
  slides: HeroSlide[];
};

const SWIPE_THRESHOLD = 32;

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const slideCount = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffsetPercent, setDragOffsetPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(0);
    setDragOffsetPercent(0);
    setIsDragging(false);
  }, [slideCount]);

  const clampIndex = useCallback(
    (index: number) => {
      if (slideCount === 0) return 0;
      const result = ((index % slideCount) + slideCount) % slideCount;
      return result;
    },
    [slideCount],
  );

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(clampIndex(index));
    },
    [clampIndex],
  );

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  const pointerStartXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    pointerIdRef.current = event.pointerId;
    pointerStartXRef.current = event.clientX;
    setIsDragging(true);
    setDragOffsetPercent(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    const startX = pointerStartXRef.current;
    if (startX == null) {
      return;
    }
    const viewportWidth = viewportRef.current?.offsetWidth ?? 0;
    if (viewportWidth <= 0) {
      return;
    }
    const delta = event.clientX - startX;
    const offsetPercent = (delta / viewportWidth) * 100;
    const clampedOffset = Math.max(-100, Math.min(100, offsetPercent));
    setDragOffsetPercent(clampedOffset);
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }
      const startX = pointerStartXRef.current;
      pointerIdRef.current = null;
      pointerStartXRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setIsDragging(false);
      setDragOffsetPercent(0);

      if (startX == null) {
        return;
      }

      const delta = event.clientX - startX;
      if (delta <= -SWIPE_THRESHOLD) {
        goNext();
      } else if (delta >= SWIPE_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current === event.pointerId) {
      pointerIdRef.current = null;
      pointerStartXRef.current = null;
      setIsDragging(false);
      setDragOffsetPercent(0);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  const trackStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {
      transform: `translate3d(calc(-${activeIndex * 100}% + ${dragOffsetPercent}%), 0, 0)`,
    };
    if (isDragging) {
      style.transition = "none";
    }
    return style;
  }, [activeIndex, dragOffsetPercent, isDragging]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <section className="hero-carousel" aria-label="人気のコンテンツ">
      <div
        className="hero-carousel__viewport"
        ref={viewportRef}
        role="group"
        aria-roledescription="スライダー"
        aria-label="人気のコンテンツ"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        <div className="hero-carousel__track" style={trackStyle}>
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
              onClick={() => goTo(index)}
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
