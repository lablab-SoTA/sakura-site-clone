import Link from "next/link";

import VideoCard from "@/components/VideoCard";
import { fetchAnimeList } from "@/lib/anime";

export default async function HomePage() {
  const animeList = await fetchAnimeList();
  const [featured, ...rest] = animeList;

  return (
    <div className="home">
      {featured && (
        <section className="hero">
          <div className="hero__content">
            <span className="tag">SAKURA Originals</span>
            <h1 className="hero__title">{featured.title}</h1>
            <p className="hero__meta">
              {featured.year}年・{featured.genres.join(" / ")}・{Math.round(featured.duration / 60)}分
            </p>
            <p>{featured.synopsis}</p>
            <div className="hero__actions">
              <Link href={`/watch/${featured.slug}`} className="button">
                再生する
              </Link>
              <Link href="/?tab=library" className="button button--ghost">
                作品一覧
              </Link>
            </div>
          </div>
        </section>
      )}
      <section>
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
