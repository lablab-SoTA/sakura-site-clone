"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Hls from "hls.js";

import { formatNumberJP } from "@/lib/intl";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

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
  accessToken: string | null;
  isAuthenticated: boolean;
  initialLiked: boolean;
  onLikeStateChange: (videoId: string, liked: boolean, nextCount: number) => void;
};

function FeedVideo({
  item,
  isActive,
  isMuted,
  onToggleMute,
  onEnded,
  accessToken,
  isAuthenticated,
  initialLiked,
  onLikeStateChange,
}: FeedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const userPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState<number>(() => item.likes);
  const [isMutatingLike, setIsMutatingLike] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    setIsLiked(false);
    setLikeCount(item.likes);
    userPausedRef.current = false;
  }, [item]);

  useEffect(() => {
    setIsLiked(initialLiked);
  }, [initialLiked]);

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

    const handlePlayEvent = () => {
      setIsPaused(false);
    };
    const handlePauseEvent = () => {
      setIsPaused(true);
    };

    handlePauseEvent();

    video.addEventListener("play", handlePlayEvent);
    video.addEventListener("pause", handlePauseEvent);

    return () => {
      video.removeEventListener("play", handlePlayEvent);
      video.removeEventListener("pause", handlePauseEvent);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (isActive) {
      if (userPausedRef.current) {
        return;
      }
      const play = async () => {
        try {
          await video.play();
        } catch {
          // 自動再生がブロックされる可能性があるため、例外は無視します。
          setIsPaused(true);
          userPausedRef.current = true;
        }
      };
      play();
    } else {
      userPausedRef.current = false;
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ロード前の場合は currentTime にアクセスできないことがあるため無視します。
      }
      setIsPaused(true);
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

  const handleTogglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      userPausedRef.current = false;
      void video.play().catch(() => {
        setIsPaused(true);
        userPausedRef.current = true;
      });
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  }, []);

  const handleContainerClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("button")) {
        return;
      }
      handleTogglePlayback();
    },
    [handleTogglePlayback],
  );

  const persistLikeState = useCallback(async () => {
    const response = await fetch(`/api/videos/${item.id}/like`, {
      method: "POST",
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "いいねの更新に失敗しました。");
    }

    const payload = (await response.json()) as { liked: boolean; likeCount: number };
    setIsLiked(payload.liked);
    setLikeCount(payload.likeCount);
    onLikeStateChange(item.id, payload.liked, payload.likeCount);
    return payload;
  }, [accessToken, item.id, onLikeStateChange]);

  const handleToggleLike = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setFeedback("いいねするにはログインが必要です。");
      return;
    }
    if (isMutatingLike) {
      return;
    }

    setFeedback(null);
    setIsMutatingLike(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;

    try {
      // 楽観的更新
      const optimisticLiked = !previousLiked;
      setIsLiked(optimisticLiked);
      setLikeCount((current) => Math.max(0, current + (optimisticLiked ? 1 : -1)));
      const { liked, likeCount: nextCount } = await persistLikeState();
      setIsLiked(liked);
      setLikeCount(nextCount);
    } catch (unknownError) {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      const fallback =
        unknownError instanceof Error ? unknownError.message : "いいねの更新に失敗しました。";
      setFeedback(fallback);
    } finally {
      setIsMutatingLike(false);
    }
  }, [accessToken, isAuthenticated, isLiked, isMutatingLike, likeCount, persistLikeState]);

  return (
    <div
      className={styles.videoContainer}
      onClick={handleContainerClick}
      role="button"
      aria-label={isPaused ? "動画を再生" : "動画を一時停止"}
    >
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
      <div className={styles.overlayTop} onClick={(event) => event.stopPropagation()}>
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
      <div className={styles.overlayBottom} onClick={(event) => event.stopPropagation()}>
        <h1 className={styles.title}>{item.title}</h1>
        {item.description && <p className={styles.description}>{item.description}</p>}
        <div className={styles.socialRow}>
          <button
            type="button"
            className={styles.likeButton}
            aria-pressed={isLiked}
            onClick={(event) => {
              event.stopPropagation();
              void handleToggleLike();
            }}
            aria-label={isLiked ? "いいねを取り消す" : "いいねする"}
            disabled={isMutatingLike}
          >
            <span className={styles.likeIcon} aria-hidden="true">
              {isLiked ? "♥" : "♡"}
            </span>
            <span className={styles.likeCount}>{formatNumberJP(likeCount)}</span>
          </button>
        </div>
        {feedback && <p className={styles.feedback}>{feedback}</p>}
      </div>
    </div>
  );
}

type FeedVerticalViewerProps = {
  items: FeedViewerItem[];
  initialId: string | null;
};

export default function FeedVerticalViewer({ items, initialId }: FeedVerticalViewerProps) {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      const session = data.session;
      if (!session) {
        setAccessToken(null);
        setUserId(null);
        setLikedMap({});
        return;
      }
      setAccessToken(session.access_token);
      setUserId(session.user.id);
    };

    void fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      if (!session) {
        setAccessToken(null);
        setUserId(null);
        setLikedMap({});
        return;
      }
      setAccessToken(session.access_token);
      setUserId(session.user.id);
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let isActive = true;

    const loadLikedStates = async () => {
      if (!userId) {
        if (isActive) {
          setLikedMap({});
        }
        return;
      }
      const targetIds = items.map((item) => item.id);
      if (targetIds.length === 0) {
        if (isActive) {
          setLikedMap({});
        }
        return;
      }
      const { data, error } = await supabase
        .from("likes")
        .select("video_id")
        .eq("user_id", userId)
        .in("video_id", targetIds);
      if (!isActive) {
        return;
      }
      if (error) {
        console.error("いいね状態の取得に失敗しました:", error);
        return;
      }
      const nextMap: Record<string, boolean> = {};
      data?.forEach((row) => {
        nextMap[row.video_id] = true;
      });
      setLikedMap(nextMap);
    };

    void loadLikedStates();

    return () => {
      isActive = false;
    };
  }, [items, supabase, userId]);

  const handleLikeStateChange = useCallback(
    (videoId: string, liked: boolean, _nextCount: number) => {
      setLikedMap((prev) => {
        if (prev[videoId] === liked) {
          return prev;
        }
        return { ...prev, [videoId]: liked };
      });
    },
    [],
  );

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
              accessToken={accessToken}
              isAuthenticated={Boolean(userId)}
              initialLiked={likedMap[item.id] ?? false}
              onLikeStateChange={handleLikeStateChange}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
