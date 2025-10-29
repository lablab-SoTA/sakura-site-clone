"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
}: VideoWatchProps) {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [likeState, setLikeState] = useState<LikeState>("unknown");
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [message, setMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

    const tryPlay = () => {
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

  const handleToggleLike = useCallback(async () => {
    if (!accessToken) {
      setMessage("いいねするにはログインが必要です。");
      return;
    }

    const response = await fetch(`/api/videos/${videoId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setMessage("いいねの切り替えに失敗しました。");
      return;
    }

    const payload = (await response.json()) as LikeResponse;
    setLikeCount(payload.likeCount);
    setLikeState(payload.liked ? "liked" : "unliked");
    setMessage(null);
  }, [accessToken, videoId]);

  const handlePlay = useCallback(async () => {
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
  }, [videoId]);

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
          controls
          autoPlay
          muted
          playsInline
          preload="auto"
          src={src}
          onPlay={handlePlay}
          style={videoStyle}
        />
      </div>
      <div className="video-watch__body">
        <div>
          {episodeLabel && <p className="video-watch__episode-label">{episodeLabel}</p>}
          <h1 className="video-watch__title">{title}</h1>
          <p className="video-watch__stats">
            <span>{viewCount.toLocaleString()} 再生</span>
            <span>{likeCount.toLocaleString()} いいね</span>
          </p>
        </div>
        <div className="video-watch__actions">
          <button
            type="button"
            className={`video-watch__like button ${likeState === "liked" ? "video-watch__like--active" : ""}`}
            onClick={handleToggleLike}
          >
            {likeLabel}
          </button>
          <a href={`/report/${videoId}`} className="video-watch__report">
            通報する
          </a>
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
