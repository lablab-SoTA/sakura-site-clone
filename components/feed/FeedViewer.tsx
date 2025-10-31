"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

import { formatNumberJP } from "@/lib/intl";

import styles from "./FeedViewer.module.css";

export type FeedViewerItem = {
  id: string;
  title: string;
  description: string;
  src: string;
  poster: string;
  creatorName: string;
  creatorId: string | null;
  creatorAvatar: string | null;
  views: number;
  likes: number;
  createdAt: string | null;
  score: number;
};

type FeedViewerProps = {
  items: FeedViewerItem[];
  initialId: string | null;
};

function formatDaysAgo(dateString: string | null): string {
  if (!dateString) {
    return "投稿日不明";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "投稿日不明";
  }
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return "今日";
  }
  return `${diffDays}日前`;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "？";
  }
  const first = trimmed.charAt(0);
  const second = trimmed.charAt(1);
  return (first + (second ?? "")).toUpperCase();
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      <span className={styles.avatar}>
        <Image src={src} alt="" fill sizes="44px" />
      </span>
    );
  }
  return (
    <span className={styles.avatar}>
      <span>{getInitials(name)}</span>
    </span>
  );
}

export default function FeedViewer({ items, initialId }: FeedViewerProps) {
  const initialIndex = useMemo(() => {
    if (!initialId) {
      return 0;
    }
    const foundIndex = items.findIndex((item) => item.id === initialId);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [initialId, items]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const currentItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex((index) => {
      if (index === initialIndex) {
        return index;
      }
      return initialIndex;
    });
  }, [initialIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentItem) {
      return () => {};
    }

    video.pause();
    video.currentTime = 0;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = currentItem.src.endsWith(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(currentItem.src);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = currentItem.src;
    } else {
      video.src = currentItem.src;
    }

    video.poster = currentItem.poster;
    video.load();

    const play = async () => {
      try {
        await video.play();
      } catch {
        // 自動再生がブロックされる可能性があるため、例外は無視します。
      }
    };

    play();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentItem]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = isMuted;
  }, [isMuted, currentItem]);

  const handleAdvance = useCallback(
    (step: number) => {
      setCurrentIndex((index) => {
        const next = (index + step + items.length) % items.length;
        return next;
      });
    },
    [items.length],
  );

  const handleEnded = useCallback(() => {
    handleAdvance(1);
  }, [handleAdvance]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return () => {};
    }
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, [handleEnded, currentItem]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (targetIndex: number) => {
      setCurrentIndex(targetIndex);
    },
    [],
  );

  if (!currentItem) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.viewer}>
        <div className={styles.playerShell}>
          <video
            key={currentItem.id}
            ref={videoRef}
            className={styles.video}
            playsInline
            muted={isMuted}
            controls={false}
            preload="auto"
            poster={currentItem.poster}
          >
            {!currentItem.src.endsWith(".m3u8") && <source src={currentItem.src} />}
            ブラウザが動画の再生に対応していません。
          </video>
          <div className={styles.playerOverlay}>
            <div className={styles.creatorBadge}>
              <Avatar name={currentItem.creatorName} src={currentItem.creatorAvatar} />
              <div className={styles.creatorText}>
                <div className={styles.creatorNameRow}>
                  {currentItem.creatorId ? (
                    <Link href={`/u/${currentItem.creatorId}`} className={styles.creatorName}>
                      {currentItem.creatorName}
                    </Link>
                  ) : (
                    <span className={styles.creatorName}>{currentItem.creatorName}</span>
                  )}
                </div>
                <span className={styles.creatorMeta}>
                  {formatDaysAgo(currentItem.createdAt)}・{formatNumberJP(currentItem.views)}回再生
                </span>
              </div>
            </div>
            <button
              type="button"
              className={styles.muteButton}
              onClick={toggleMute}
              aria-pressed={!isMuted}
            >
              {isMuted ? "音声オン" : "ミュート"}
            </button>
          </div>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navPrev}`}
            onClick={() => handleAdvance(-1)}
            aria-label="前のフィードを表示"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navNext}`}
            onClick={() => handleAdvance(1)}
            aria-label="次のフィードを表示"
          >
            ›
          </button>
        </div>
        <div className={styles.details}>
          <h1 className={styles.title}>{currentItem.title}</h1>
          {currentItem.description && (
            <p className={styles.description}>{currentItem.description}</p>
          )}
        </div>
      </div>
      <section className={styles.upNext} aria-label="次のおすすめ">
        <h2 className={styles.upNextHeading}>次のおすすめ</h2>
        <div className={styles.upNextRail}>
          {items.map((item, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.upNextCard}${isActive ? ` ${styles.upNextCardActive}` : ""}`}
                onClick={() => handleSelect(index)}
                disabled={isActive}
                aria-pressed={isActive}
              >
                <div className={styles.upNextThumb}>
                  <Image
                    src={item.poster}
                    alt={`${item.title}のサムネイル`}
                    fill
                    className={styles.upNextPoster}
                    sizes="(max-width: 640px) 88vw, 120px"
                  />
                </div>
                <div className={styles.upNextBody}>
                  <span className={styles.upNextTitle}>{item.title}</span>
                  <span className={styles.upNextCreator}>{item.creatorName}</span>
                  <span className={styles.upNextMeta}>
                    {formatNumberJP(item.views)}回・{formatDaysAgo(item.createdAt)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
