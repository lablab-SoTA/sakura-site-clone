import type { CSSProperties } from "react";

import Link from "next/link";

import VideoCard from "@/components/VideoCard";
import { fetchAnimeList } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

export default async function HomePage() {
  const animeList = await fetchAnimeList();
  const [featured, ...rest] = animeList;

  return (
    <div className="home">
      {featured && (
        <section
          className="hero"
          style={
            {
              "--hero-image": `url(${featured.thumbnail || featured.video.poster || XANIME_THUMB_PLACEHOLDER})`,
            } as CSSProperties
          }
        >
          <div className="hero__content">
            <span className="tag">人気コンテンツ</span>
            <h1 className="hero__title">{featured.title}</h1>
            <p className="hero__meta">
              {featured.year}年・{featured.genres.join(" / ")}・{Math.round(featured.duration / 60)}分
            </p>
            <p>{featured.synopsis}</p>
            <div className="hero__actions">
              <Link href={`/watch/${featured.slug}`} className="button">
                再生する
              </Link>
              <a href="#featured-grid" className="button button--ghost">
                作品一覧
              </a>
            </div>
          </div>
        </section>
      )}
      <section id="featured-grid">
        <h2 className="page-title">注目のアニメ</h2>
        <p className="page-lede">クリエイターが届ける最新の個人制作アニメをチェックしましょう。</p>
        <div className="grid">
          {animeList.map((anime) => (
            <VideoCard key={anime.slug} anime={anime} />
          ))}
        </div>
      </section>
      {rest.length === 0 && (
        <section>
          <p className="page-lede">
            現在はサンプル作品のみ公開中です。今後 R2 ストレージにアップロードした作品を自動で連携する予定です。
          </p>
        </section>
      )}
    </div>
  );
}
