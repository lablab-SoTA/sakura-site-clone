import Link from "next/link";

import type { Anime, AnimeEpisode } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type EpisodeCardProps = {
  anime: Anime;
  episode: AnimeEpisode;
};

const numberFormatter = new Intl.NumberFormat("ja-JP");

export default function VideoCard({ anime, episode }: EpisodeCardProps) {
  const thumbSrc = episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
  const views = episode.metrics?.views ?? 0;

  return (
    <Link href={`/watch/${anime.slug}?episode=${episode.id}`} className="episode-card">
      <div className="episode-card__thumb-wrapper">
        <img
          src={thumbSrc}
          alt={`${episode.title}のサムネイル`}
          className="episode-card__thumb"
          loading="lazy"
        />
      </div>
      <div className="episode-card__body">
        <h3 className="episode-card__title">{anime.title}</h3>
        <p className="episode-card__episode-title">{episode.title}</p>
        <p className="episode-card__views">▶ {numberFormatter.format(views)}</p>
      </div>
    </Link>
  );
}
