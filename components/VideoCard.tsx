import Link from "next/link";

import type { Anime, AnimeEpisode } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type EpisodeCardProps = {
  anime: Anime;
  episode: AnimeEpisode;
  rank?: number;
};

const numberFormatter = new Intl.NumberFormat("ja-JP");

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const mins = Math.round(seconds / 60);
  return `${mins}分`;
}

export default function VideoCard({ anime, episode, rank }: EpisodeCardProps) {
  const thumbSrc = episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
  const views = episode.metrics?.views ?? 0;
  const likes = episode.metrics?.likes ?? 0;

  return (
    <Link href={`/watch/${anime.slug}?episode=${episode.id}`} className="episode-card">
      <div className="episode-card__thumb-wrapper">
        <img
          src={thumbSrc}
          alt={`${episode.title}のサムネイル`}
          className="episode-card__thumb"
          loading="lazy"
        />
        {typeof rank === "number" && (
          <span className="episode-card__badge">#{rank + 1}</span>
        )}
      </div>
      <div className="episode-card__body">
        <h3 className="episode-card__title">{episode.title}</h3>
        <p className="episode-card__series">{anime.title}・{anime.creator ?? "クリエイター非公開"}</p>
        <div className="episode-card__meta">
          <span>{formatDuration(episode.duration)}</span>
          <span>👁 {numberFormatter.format(views)}</span>
          <span>♥ {numberFormatter.format(likes)}</span>
        </div>
        <p className="episode-card__synopsis">{episode.synopsis}</p>
        <div className="episode-card__tags">
          {anime.genres.map((genre) => (
            <span key={genre} className="episode-card__tag">
              {genre}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
