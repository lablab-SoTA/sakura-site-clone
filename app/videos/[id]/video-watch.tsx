"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type VideoWatchProps = {
  videoId: string;
  src: string;
  title: string;
  description: string | null;
  initialLikeCount: number;
  initialViewCount: number;
  ownerId: string;
  width: number | null;
  height: number | null;
  tags: string[];
  episodeNumber?: number;
  episodeCount?: number;
  seriesId?: string | null;
  seriesSlug?: string | null;
  firstEpisodeId?: string | null;
};

type LikeState = "liked" | "unliked" | "unknown";

type LikeResponse = {
  liked: boolean;
  likeCount: number;
};

type ViewResponse = {
  viewCount: number;
};

export default function VideoWatch({
  videoId,
  src,
  title,
  description,
  initialLikeCount,
  initialViewCount,
  ownerId,
  width,
  height,
  tags,
  episodeNumber,
  episodeCount,
  seriesId,
  seriesSlug,
  firstEpisodeId,
}: VideoWatchProps) {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [likeState, setLikeState] = useState<LikeState>("unknown");
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [message, setMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideControlsTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimerRef.current !== null) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  }, []);

  const hideControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(false);
  }, [clearHideTimer]);

  const showControlsTemporarily = useCallback(
    (durationMs = 3000) => {
      setControlsVisible(true);
      clearHideTimer();
      if (durationMs > 0) {
        hideControlsTimerRef.current = window.setTimeout(() => {
          setControlsVisible(false);
          hideControlsTimerRef.current = null;
        }, durationMs);
      }
    },
    [clearHideTimer],
  );

  const showControlsIndefinitely = useCallback(() => {
    showControlsTemporarily(0);
  }, [showControlsTemporarily]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    const resolveSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setAccessToken(data.session.access_token);
        setIsOwner(data.session.user.id === ownerId);
        const { data: liked } = await supabase
          .from("likes")
          .select("video_id")
          .eq("video_id", videoId)
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        setLikeState(liked ? "liked" : "unliked");
      } else {
        setAccessToken(null);
        setLikeState("unliked");
        setIsOwner(false);
      }
    };

    resolveSession();
  }, [ownerId, supabase, videoId]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    element.controls = controlsVisible;
  }, [controlsVisible]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    const tryPlay = () => {
      element.muted = false;
      const playPromise = element.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {
          // 自動再生がブロックされた場合はメッセージを表示するだけに留める
          setMessage((prev) => prev ?? "自動再生がブロックされた場合は再生ボタンを押してください。");
        });
      }
    };

    tryPlay();
    element.addEventListener("loadeddata", tryPlay, { once: true });

    return () => {
      element.removeEventListener("loadeddata", tryPlay);
    };
  }, [src]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    const showByInteraction = () => {
      if (element.paused || element.ended) {
        showControlsIndefinitely();
      } else {
        showControlsTemporarily();
      }
    };

    const revealIndefinitely = () => showControlsIndefinitely();
    const handleLeave = () => {
      if (!element.paused && !element.ended) {
        hideControls();
      }
    };

    element.addEventListener("pointermove", showByInteraction);
    element.addEventListener("pointerdown", showByInteraction);
    element.addEventListener("touchstart", showByInteraction, { passive: true });
    element.addEventListener("touchmove", showByInteraction, { passive: true });
    element.addEventListener("pause", revealIndefinitely);
    element.addEventListener("ended", revealIndefinitely);
    element.addEventListener("mouseenter", showByInteraction);
    element.addEventListener("mouseleave", handleLeave);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!element) return;
      const target = event.target as Node | null;
      if (target && target !== element && !element.contains(target)) {
        return;
      }
      showByInteraction();
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      element.removeEventListener("pointermove", showByInteraction);
      element.removeEventListener("pointerdown", showByInteraction);
      element.removeEventListener("touchstart", showByInteraction);
      element.removeEventListener("touchmove", showByInteraction);
      element.removeEventListener("pause", revealIndefinitely);
      element.removeEventListener("ended", revealIndefinitely);
      element.removeEventListener("mouseenter", showByInteraction);
      element.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [hideControls, showControlsIndefinitely, showControlsTemporarily]);

  const handleToggleLike = useCallback(async () => {
    if (!accessToken) {
      setMessage("いいねするにはログインが必要です。");
      return;
    }

    if (likeState === "unknown" || isTogglingLike) {
      return;
    }

    const currentState = likeState;
    const currentCount = likeCount;
    const nextState = likeState === "liked" ? "unliked" : "liked";
    const delta = nextState === "liked" ? 1 : -1;

    setIsTogglingLike(true);
    try {
      // レスポンスを待つ間も操作感を損ねないように楽観的に更新する
      setLikeState(nextState);
      setLikeCount((prev) => Math.max(0, prev + delta));
      setMessage(null);

      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("failed");
      }

      const payload = (await response.json()) as LikeResponse;
      setLikeCount(payload.likeCount);
      setLikeState(payload.liked ? "liked" : "unliked");
      setMessage(null);
    } catch {
      setLikeState(currentState);
      setLikeCount(currentCount);
      setMessage("いいねの切り替えに失敗しました。");
    } finally {
      setIsTogglingLike(false);
    }
  }, [accessToken, isTogglingLike, likeCount, likeState, videoId]);

  const handlePlay = useCallback(async () => {
    hideControls();

    const storageKey = `xanime_view_${videoId}`;
    if (typeof window !== "undefined") {
      const alreadyCounted = localStorage.getItem(storageKey);
      if (alreadyCounted) {
        return;
      }
    }

    const response = await fetch(`/api/videos/${videoId}/view`, {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as ViewResponse;
    setViewCount((prev) => payload.viewCount ?? prev + 1);

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "1");
    }
  }, [hideControls, videoId]);

  const likeLabel = useMemo(() => (likeState === "liked" ? "いいね済み" : "いいね"), [likeState]);
  const deleteLabel = isDeleting ? "削除中..." : "動画を削除";
  const videoStyle = useMemo(() => {
    if (width && height && width > 0 && height > 0) {
      return {
        aspectRatio: `${width} / ${height}`,
      } as const;
    }
    return undefined;
  }, [height, width]);
  const episodeLabel = useMemo(() => {
    if (typeof episodeNumber !== "number") {
      return null;
    }
    const formatter = new Intl.NumberFormat("ja-JP");
    const numberText = formatter.format(episodeNumber);
    const totalText =
      typeof episodeCount === "number" && episodeCount > 0
        ? ` / 全${formatter.format(episodeCount)}話`
        : "";
    return `第${numberText}話${totalText}`;
  }, [episodeCount, episodeNumber]);

  const handleDelete = useCallback(async () => {
    if (!accessToken) {
      setMessage("動画を削除するにはログインが必要です。");
      return;
    }

    const confirmed =
      typeof window === "undefined" ? true : window.confirm("この動画を削除しますか？この操作は元に戻せません。");

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    const response = await fetch(`/api/videos/${videoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    setIsDeleting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "動画の削除に失敗しました。時間をおいて再試行してください。");
      return;
    }

    setMessage("動画を削除しました。マイページへ移動します。");
    router.replace("/settings/profile");
  }, [accessToken, router, videoId]);

  return (
    <div className="video-watch">
      <div className="video-watch__media">
        <video
          ref={videoRef}
          controls={controlsVisible}
          autoPlay
          playsInline
          preload="auto"
          src={src}
          onPlay={handlePlay}
          style={videoStyle}
          controlsList="nodownload noplaybackrate"
        />
      </div>
      <div className="video-watch__body">
        <div>
          {episodeLabel && <p className="video-watch__episode-label">{episodeLabel}</p>}
          {firstEpisodeId ? (
            <h1 className="video-watch__title">
              <Link href={`/videos/${firstEpisodeId}`} className="video-watch__title-link">
                {title}
              </Link>
            </h1>
          ) : (
            <h1 className="video-watch__title">{title}</h1>
          )}
          <p className="video-watch__stats">
            <span>{viewCount.toLocaleString()} 再生</span>
            <span>{likeCount.toLocaleString()} いいね</span>
          </p>
        </div>
        <div className="video-watch__actions">
          <div className="video-watch__action-group">
            <button
              type="button"
              className={`video-watch__like button ${likeState === "liked" ? "video-watch__like--active" : ""}`}
              onClick={handleToggleLike}
              disabled={likeState === "unknown" || isTogglingLike}
            >
              {likeLabel}
            </button>
            <a href={`/report/${videoId}`} className="video-watch__report">
              通報する
            </a>
          </div>
          {isOwner && (
            <button
              type="button"
              className="video-watch__delete button button--ghost"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {deleteLabel}
            </button>
          )}
        </div>
        {description && <p className="video-watch__description">{description}</p>}
        {tags.length > 0 && (
          <ul className="video-watch__tags">
            {tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        )}
        {message && <p className="video-watch__message">{message}</p>}
      </div>
    </div>
  );
}
