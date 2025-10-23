import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EngagementPanel from "@/components/EngagementPanel";
import Player from "@/components/Player";
import { fetchAnimeBySlug } from "@/lib/anime";

type WatchPageParams = {
  slug: string;
};

type WatchPageProps = {
  params: Promise<WatchPageParams>;
};

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const anime = await fetchAnimeBySlug(slug);

  if (!anime) {
    return {
      title: "作品が見つかりませんでした | xanime",
    };
  }

  return {
    title: `${anime.title} | xanime`,
    description: anime.synopsis,
    keywords: [...anime.genres, "アニメ", "無料動画", "個人制作"],
    openGraph: {
      title: `${anime.title} | xanime`,
      description: anime.synopsis,
      type: "video.movie",
      images: anime.thumbnail ? [
        {
          url: anime.thumbnail,
          width: 1200,
          height: 630,
          alt: anime.title,
        }
      ] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${anime.title} | xanime`,
      description: anime.synopsis,
      images: anime.thumbnail ? [anime.thumbnail] : undefined,
    },
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { slug } = await params;
  const anime = await fetchAnimeBySlug(slug);

  if (!anime) {
    notFound();
  }

  const playerPoster = anime.video.poster ?? anime.thumbnail;

  return (
    <div className="watch-page">
      <div className="player-wrapper">
        <Player
          src={anime.video.src}
          poster={playerPoster}
          title={anime.title}
          autoPlay
          showControls
        />
      </div>
      <section className="detail">
        <div>
          <span className="tag">xanime Originals</span>
          <h1 className="hero__title watch-title">
            {anime.title}
          </h1>
        </div>
        <div className="detail__meta">
          <span>{anime.year}年</span>
          <span>{anime.rating}</span>
          <span>{Math.round(anime.duration / 60)}分</span>
          <span>{anime.genres.join(" / ")}</span>
        </div>
        <p>{anime.synopsis}</p>
        {anime.creator && (
          <div className="detail__meta">
            <span>クリエイター: {anime.creator}</span>
          </div>
        )}
        <EngagementPanel
          slug={anime.slug}
          initialViews={anime.metrics?.views ?? 0}
          initialLikes={anime.metrics?.likes ?? 0}
        />
        <div className="detail__actions">
          <Link href="/" className="button button--ghost">
            作品一覧へ戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
