"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

import { formatNumberJP } from "@/lib/intl";

import type { FeedViewerItem } from "./FeedViewer";
import styles from "./FeedVerticalViewer.module.css";

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
        <Image src={src} alt="" fill sizes="48px" />
      </span>
    );
  }
  return (
    <span className={styles.avatar}>
      <span>{getInitials(name)}</span>
    </span>
  );
}

type FeedVideoProps = {
  item: FeedViewerItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onEnded: () => void;
};

function FeedVideo({ item, isActive, isMuted, onToggleMute, onEnded }: FeedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const isHls = item.src.endsWith(".m3u8");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(item.src);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = item.src;
      } else {
        video.src = item.src;
      }
    } else {
      video.src = item.src;
    }

    video.load();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [item.src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (isActive) {
      const play = async () => {
        try {
          await video.play();
        } catch {
          // 自動再生がブロックされる可能性があるため、例外は無視します。
        }
      };
      play();
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ロード前の場合は currentTime にアクセスできないことがあるため無視します。
      }
    }
  }, [isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const handleVideoEnded = () => {
      onEnded();
    };
    video.addEventListener("ended", handleVideoEnded);
    return () => {
      video.removeEventListener("ended", handleVideoEnded);
    };
  }, [onEnded]);

  return (
    <div className={styles.videoContainer}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        muted={isMuted}
        controls={false}
        preload="auto"
        poster={item.poster}
      >
        ブラウザが動画の再生に対応していません。
      </video>
      <div className={styles.overlayTop}>
        <div className={styles.creatorBadge}>
          <Avatar name={item.creatorName} src={item.creatorAvatar} />
          <div className={styles.creatorText}>
            <div className={styles.creatorNameRow}>
              {item.creatorId ? (
                <Link href={`/u/${item.creatorId}`} className={styles.creatorName}>
                  {item.creatorName}
                </Link>
              ) : (
                <span className={styles.creatorName}>{item.creatorName}</span>
              )}
            </div>
            <span className={styles.creatorMeta}>
              {formatDaysAgo(item.createdAt)}・{formatNumberJP(item.views)}回再生
            </span>
          </div>
        </div>
        <button
          type="button"
          className={styles.muteButton}
          onClick={onToggleMute}
          aria-pressed={!isMuted}
        >
          {isMuted ? "音声オン" : "ミュート"}
        </button>
      </div>
      <div className={styles.overlayBottom}>
        <h1 className={styles.title}>{item.title}</h1>
        {item.description && <p className={styles.description}>{item.description}</p>}
      </div>
    </div>
  );
}

type FeedVerticalViewerProps = {
  items: FeedViewerItem[];
  initialId: string | null;
};

export default function FeedVerticalViewer({ items, initialId }: FeedVerticalViewerProps) {
  const initialIndex = useMemo(() => {
    if (!initialId) {
      return 0;
    }
    const foundIndex = items.findIndex((item) => item.id === initialId);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [initialId, items]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const activeIndexRef = useRef(initialIndex);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    setActiveIndex(initialIndex);
    activeIndexRef.current = initialIndex;
  }, [initialIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // 表示領域を最も占めているセクションをアクティブ扱いにする。
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visibleEntry) {
          return;
        }
        const target = visibleEntry.target as HTMLElement;
        const indexAttr = target.dataset.index;
        if (!indexAttr) {
          return;
        }
        const nextIndex = Number(indexAttr);
        if (Number.isNaN(nextIndex)) {
          return;
        }
        if (nextIndex !== activeIndexRef.current) {
          setActiveIndex(nextIndex);
        }
      },
      {
        root: container,
        threshold: [0.55, 0.75],
      },
    );

    itemRefs.current.forEach((node) => {
      if (node) {
        observer.observe(node);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    const container = containerRef.current;
    const target = itemRefs.current[initialIndex];
    if (!container || !target) {
      return;
    }
    container.scrollTo({ top: target.offsetTop, behavior: "auto" });
  }, [initialIndex]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleAdvance = useCallback(
    (step: number) => {
      // 動画再生終了時などに次のセクションへスクロールする。
      const nextIndex = (activeIndexRef.current + step + items.length) % items.length;
      const container = containerRef.current;
      const target = itemRefs.current[nextIndex];
      if (!container || !target) {
        return;
      }
      container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    },
    [items.length],
  );

  const handleNext = useCallback(() => {
    handleAdvance(1);
  }, [handleAdvance]);

  if (items.length === 0) {
    return null;
  }

  itemRefs.current.length = items.length;

  return (
    <div className={styles.root}>
      <div className={styles.scroller} ref={containerRef}>
        {items.map((item, index) => (
          <section
            key={item.id}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            data-index={index}
            className={styles.panel}
          >
            <FeedVideo
              item={item}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onEnded={handleNext}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
