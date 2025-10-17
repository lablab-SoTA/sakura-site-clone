import Link from "next/link";

import type { Anime } from "@/lib/anime";

type VideoCardProps = {
  anime: Anime;
};

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  return `${mins}分`;
}

export default function VideoCard({ anime }: VideoCardProps) {
  return (
    <Link href={`/watch/${anime.slug}`} className="card">
      <img
        src={anime.thumbnail}
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
      </div>
    </Link>
  );
}
