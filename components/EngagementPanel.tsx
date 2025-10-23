"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const numberFormatter = new Intl.NumberFormat("ja-JP");

type EngagementPanelProps = {
  slug: string;
  episodeId: string;
  initialViews: number;
  initialLikes: number;
};

export default function EngagementPanel({ slug, episodeId, initialViews, initialLikes }: EngagementPanelProps) {
  const [viewDelta, setViewDelta] = useState(0);
  const [likeDelta, setLikeDelta] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const viewKey = `xanime_views_${slug}_${episodeId}`;
    const stored = Number(window.localStorage.getItem(viewKey) ?? "0");
    const next = stored + 1;
    window.localStorage.setItem(viewKey, String(next));
    setViewDelta(next);
  }, [episodeId, slug]);

  useEffect(() => {
    const likeFlagKey = `xanime_like_flag_${slug}_${episodeId}`;
    const likeDeltaKey = `xanime_like_delta_${slug}_${episodeId}`;
    const storedFlag = window.localStorage.getItem(likeFlagKey) === "1";
    const storedDelta = Number(window.localStorage.getItem(likeDeltaKey) ?? "0");
    setLiked(storedFlag);
    setLikeDelta(storedDelta);
  }, [episodeId, slug]);

  const toggleLike = useCallback(() => {
    const likeFlagKey = `xanime_like_flag_${slug}_${episodeId}`;
    const likeDeltaKey = `xanime_like_delta_${slug}_${episodeId}`;
    const nextLiked = !liked;
    let nextDelta = likeDelta;

    if (nextLiked) {
      nextDelta = likeDelta + 1;
    } else {
      nextDelta = Math.max(0, likeDelta - 1);
    }

    window.localStorage.setItem(likeFlagKey, nextLiked ? "1" : "0");
    window.localStorage.setItem(likeDeltaKey, String(nextDelta));
    setLiked(nextLiked);
    setLikeDelta(nextDelta);
  }, [episodeId, likeDelta, liked, slug]);

  const totalViews = useMemo(() => initialViews + viewDelta, [initialViews, viewDelta]);
  const totalLikes = useMemo(() => initialLikes + likeDelta, [initialLikes, likeDelta]);

  return (
    <div className="detail__engagement">
      <div className="detail__stats" aria-live="polite">
        <span className="detail__stat" aria-label={`視聴回数 ${totalViews} 回`}>
          ▶ {numberFormatter.format(totalViews)}回視聴
        </span>
        <span className="detail__stat" aria-label={`いいね ${totalLikes} 件`}>
          ♥ {numberFormatter.format(totalLikes)}いいね
        </span>
      </div>
      <button
        type="button"
        className={`like-button${liked ? " is-active" : ""}`}
        onClick={toggleLike}
        aria-pressed={liked}
      >
        {liked ? "いいね済み" : "いいね"}
      </button>
    </div>
  );
}
