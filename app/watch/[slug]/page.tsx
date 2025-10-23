import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EngagementPanel from "@/components/EngagementPanel";
import Player from "@/components/Player";
import { fetchAnimeBySlug } from "@/lib/anime";

type WatchPageParams = {
  slug: string;
};

type WatchPageSearchParams = {
  episode?: string;
};

type WatchPageProps = {
  params: Promise<WatchPageParams>;
  searchParams: Promise<WatchPageSearchParams>;
};

function resolveEpisodeId(rawEpisode?: string | string[]) {
  if (Array.isArray(rawEpisode)) {
    return rawEpisode[0];
  }
  return rawEpisode;
}

function formatDuration(seconds: number) {
  if (!seconds) return "不明";
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  return `${Math.round(seconds / 60)}分`;
}

export async function generateMetadata({ params, searchParams }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await fetchAnimeBySlug(slug);
  if (!anime) {
    return {
      title: "作品が見つかりませんでした | xanime",
    };
  }

  const { episode: episodeRaw } = (await searchParams) ?? {};
  const episodeId = resolveEpisodeId(episodeRaw);
  const activeEpisode = anime.episodes.find((item) => item.id === episodeId) ?? anime.episodes[0];

  return {
    title: `${activeEpisode.title} | ${anime.title} | xanime`,
    description: activeEpisode.synopsis || anime.synopsis,
    keywords: [...anime.genres, "アニメ", "無料動画", "個人制作"],
    openGraph: {
      title: `${activeEpisode.title} | ${anime.title} | xanime`,
      description: activeEpisode.synopsis || anime.synopsis,
      type: "video.episode",
      images: activeEpisode.video.poster
        ? [
            {
              url: activeEpisode.video.poster,
              width: 1200,
              height: 630,
              alt: `${activeEpisode.title} - ${anime.title}`,
            },
          ]
        : anime.thumbnail
          ? [
              {
                url: anime.thumbnail,
                width: 1200,
                height: 630,
                alt: anime.title,
              },
            ]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${activeEpisode.title} | ${anime.title} | xanime`,
      description: activeEpisode.synopsis || anime.synopsis,
      images: activeEpisode.video.poster ? [activeEpisode.video.poster] : anime.thumbnail ? [anime.thumbnail] : undefined,
    },
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const anime = await fetchAnimeBySlug(slug);

  if (!anime) {
    notFound();
  }

  const { episode: episodeRaw } = (await searchParams) ?? {};
  const episodeId = resolveEpisodeId(episodeRaw);
  const activeEpisode = anime.episodes.find((item) => item.id === episodeId) ?? anime.episodes[0];
  const otherEpisodes = anime.episodes.filter((item) => item.id !== activeEpisode.id);
  const playerPoster = activeEpisode.video.poster ?? anime.thumbnail;
  const views = activeEpisode.metrics?.views ?? anime.metrics?.views ?? 0;
  const likes = activeEpisode.metrics?.likes ?? anime.metrics?.likes ?? 0;

  return (
    <div className="watch-page">
      <div className="player-wrapper">
        <Player
          src={activeEpisode.video.src}
          poster={playerPoster}
          title={`${activeEpisode.title} | ${anime.title}`}
          autoPlay
          showControls
        />
      </div>
      <section className="detail">
        <div>
          <span className="tag">xanime Originals</span>
          <h1 className="hero__title watch-title">{activeEpisode.title}</h1>
        </div>
        <div className="detail__meta">
          <span>{anime.title}</span>
          <span>{anime.creator ? `クリエイター: ${anime.creator}` : "クリエイター情報なし"}</span>
          <span>{anime.year}年</span>
          <span>{anime.rating}</span>
          <span>{formatDuration(activeEpisode.duration)}</span>
          <span>{anime.genres.join(" / ")}</span>
        </div>
        <p>{activeEpisode.synopsis || anime.synopsis}</p>
        <EngagementPanel
          slug={anime.slug}
          episodeId={activeEpisode.id}
          initialViews={views}
          initialLikes={likes}
        />
        {otherEpisodes.length > 0 && (
          <div className="episode-list">
            <h2 className="episode-list__title">他のエピソード</h2>
            <div className="episode-list__items">
              {otherEpisodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/watch/${anime.slug}?episode=${episode.id}`}
                  className="episode-list__item"
                >
                  <div className="episode-list__thumb">
                    <img
                      src={episode.video.poster ?? anime.thumbnail ?? "/images/logo.png"}
                      alt={`${episode.title}のサムネイル`}
                      loading="lazy"
                    />
                  </div>
                  <div className="episode-list__content">
                    <p className="episode-list__name">{episode.title}</p>
                    <p className="episode-list__meta">
                      ▶ {episode.metrics?.views?.toLocaleString("ja-JP") ?? "0"} ／ ♥{" "}
                      {episode.metrics?.likes?.toLocaleString("ja-JP") ?? "0"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="detail__actions">
          <Link href="/" className="button button--ghost">
            人気のコンテンツへ戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
