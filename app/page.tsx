import Link from "next/link";
import Image from "next/image";

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
  const heroEpisodes = sortedEpisodes.slice(0, 3);
  const rest = sortedEpisodes.slice(heroEpisodes.length);

  const formatDurationMinutes = (seconds?: number) => {
    if (!seconds || Number.isNaN(seconds)) {
      return "長さ不明";
    }
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes}分`;
  };

  return (
    <div className="home episodes-home">
      {heroEpisodes.length > 0 && (
        <section className="hero-carousel" aria-label="人気のコンテンツ">
          <div className="hero-carousel__inner">
            {heroEpisodes.map(({ anime, episode }, index) => {
              const posterSrc = episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
              const HeadingTag = index === 0 ? "h1" : "h2";
              return (
                <Link
                  key={`${anime.slug}-${episode.id}-hero`}
                  href={`/watch/${anime.slug}?episode=${episode.id}`}
                  className="episode-hero"
                >
                  <div className="episode-hero__art" aria-hidden="true">
                    <Image
                      src={posterSrc}
                      alt=""
                      fill
                      sizes="(max-width: 720px) 90vw, (max-width: 1200px) 60vw, 540px"
                      priority={index === 0}
                    />
                  </div>
                  <span className="episode-hero__tag">人気のコンテンツ</span>
                  <HeadingTag className="episode-hero__title">{episode.title}</HeadingTag>
                  <p className="episode-hero__series">
                    {anime.title}・{anime.creator ?? "クリエイター非公開"}
                  </p>
                  <p className="episode-hero__meta">
                    ▶ {episode.metrics?.views?.toLocaleString("ja-JP") ?? "0"} ／ ♥{" "}
                    {episode.metrics?.likes?.toLocaleString("ja-JP") ?? "0"} ／ {formatDurationMinutes(episode.duration)}
                  </p>
                  <p className="episode-hero__synopsis">{episode.synopsis}</p>
                  <span className="episode-hero__cta">再生する</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <section className="episodes-section" id="featured-episodes">
        <div className="episodes-section__heading">
          <h2 className="page-title">人気のエピソード</h2>
          <p className="page-lede">再生回数の多い人気エピソードをピックアップしました。</p>
        </div>
        <div className="episode-grid">
          {rest.map((item) => (
            <VideoCard
              key={`${item.anime.slug}-${item.episode.id}`}
              anime={item.anime}
              episode={item.episode}
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
