import type { CSSProperties } from "react";

import Link from "next/link";

import VideoCard from "@/components/VideoCard";
import { fetchAnimeList } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

export default async function HomePage() {
  const animeList = await fetchAnimeList();
  const episodes = animeList.flatMap((anime) =>
    anime.episodes.map((episode) => ({
      anime,
      episode,
    })),
  );
  const sortedEpisodes = episodes.sort(
    (a, b) => (b.episode.metrics?.views ?? 0) - (a.episode.metrics?.views ?? 0),
  );
  const [featured, ...rest] = sortedEpisodes;

  return (
    <div className="home episodes-home">
      {featured && (
        <Link
          href={`/watch/${featured.anime.slug}?episode=${featured.episode.id}`}
          className="episode-hero"
          style={{
            "--episode-hero-image": `url(${featured.episode.video.poster || featured.anime.thumbnail || XANIME_THUMB_PLACEHOLDER})`,
          } as CSSProperties}
        >
          <span className="episode-hero__tag">注目のエピソード</span>
          <h1 className="episode-hero__title">{featured.episode.title}</h1>
          <p className="episode-hero__series">
            {featured.anime.title}・{featured.anime.creator ?? "クリエイター非公開"}
          </p>
          <p className="episode-hero__meta">
            👁 {featured.episode.metrics?.views?.toLocaleString("ja-JP") ?? "0"} ／ ♥{" "}
            {featured.episode.metrics?.likes?.toLocaleString("ja-JP") ?? "0"} ／{" "}
            {Math.round(featured.episode.duration / 60)}分
          </p>
          <p className="episode-hero__synopsis">{featured.episode.synopsis}</p>
          <span className="episode-hero__cta">▶ 再生する</span>
        </Link>
      )}
      <section className="episodes-section" id="featured-episodes">
        <div className="episodes-section__heading">
          <h2 className="page-title">注目のエピソード</h2>
          <p className="page-lede">再生回数の多い人気エピソードをピックアップしました。</p>
        </div>
        <div className="episode-grid">
          {rest.map((item, index) => (
            <VideoCard
              key={`${item.anime.slug}-${item.episode.id}`}
              anime={item.anime}
              episode={item.episode}
              rank={index + 1}
            />
          ))}
        </div>
      </section>
      {rest.length === 0 && (
        <section className="episodes-empty">
          <p className="page-lede">公開中のエピソードが不足しています。アップロードするとここに表示されます。</p>
        </section>
      )}
    </div>
  );
}
