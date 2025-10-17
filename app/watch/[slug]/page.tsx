import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
      title: "作品が見つかりませんでした | SAKURA",
    };
  }

  return {
    title: `${anime.title} | SAKURA`,
    description: anime.synopsis,
    openGraph: {
      title: `${anime.title} | SAKURA`,
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
          controls
        />
      </div>
      <section className="detail">
        <div>
          <span className="tag">SAKURA Originals</span>
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
        {anime.credits && (
          <div className="detail__meta">
            {anime.credits.director && <span>監督: {anime.credits.director}</span>}
            {anime.credits.studio && <span>制作: {anime.credits.studio}</span>}
            {anime.credits.cast && anime.credits.cast.length > 0 && (
              <span>キャスト: {anime.credits.cast.join("、")}</span>
            )}
          </div>
        )}
        <div className="detail__actions">
          <Link href="/" className="button button--ghost">
            作品一覧へ戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
