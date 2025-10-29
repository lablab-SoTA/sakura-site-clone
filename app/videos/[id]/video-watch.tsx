"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type VideoWatchProps = {
  videoId: string;
  src: string;
  title: string;
  description: string | null;
  initialLikeCount: number;
  initialViewCount: number;
  tags: string[];
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
  tags,
}: VideoWatchProps) {
  const supabase = getBrowserSupabaseClient();
  const [likeState, setLikeState] = useState<LikeState>("unknown");
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [message, setMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const resolveSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setAccessToken(data.session.access_token);
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
      }
    };

    resolveSession();
  }, [supabase, videoId]);

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

  return (
    <div className="video-watch">
      <div className="video-watch__media">
        <video controls playsInline preload="metadata" src={src} onPlay={handlePlay} />
      </div>
      <div className="video-watch__body">
        <div>
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
