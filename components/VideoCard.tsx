import Link from "next/link";

import type { Anime } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type VideoCardProps = {
  anime: Anime;
};

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  return `${mins}分`;
}

const numberFormatter = new Intl.NumberFormat("ja-JP");

export default function VideoCard({ anime }: VideoCardProps) {
  const thumbSrc = anime.thumbnail || anime.video.poster || XANIME_THUMB_PLACEHOLDER;
  const views = anime.metrics?.views ?? 0;
  const likes = anime.metrics?.likes ?? 0;

  return (
    <Link href={`/watch/${anime.slug}`} className="card">
      <img
        src={thumbSrc}
        alt={`${anime.title}のサムネイル`}
        className="card__thumb"
        loading="lazy"
      />
      <div className="card__content">
        <h3 className="card__title">{anime.title}</h3>
        <div className="card__meta">
          <span>{anime.year}</span>
          <span>{formatDuration(anime.duration)}</span>
          <span>{anime.rating}</span>
        </div>
        <div className="card__meta">
          {anime.genres.map((genre) => (
            <span key={genre} className="tag">
              {genre}
            </span>
          ))}
        </div>
        <div className="card__stats">
          <span className="card__stat" aria-label={`視聴回数 ${views} 回`}>
            👁 {numberFormatter.format(views)}回
          </span>
          <span className="card__stat" aria-label={`いいね ${likes} 件`}>
            ♥ {numberFormatter.format(likes)}
          </span>
          {anime.creator && <span className="card__stat">制作: {anime.creator}</span>}
        </div>
      </div>
    </Link>
  );
}
