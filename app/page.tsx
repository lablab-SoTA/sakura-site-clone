import Link from "next/link";

import { fetchAnimeList } from "@/lib/anime";
import MainSection from "@/components/feature/MainSection";

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
  const railEpisodes = sortedEpisodes.slice(heroEpisodes.length, heroEpisodes.length + 3);
  const hasEpisodes = sortedEpisodes.length > 0;

  return (
    <div className="home episodes-home">
      <MainSection
        heroSlides={heroEpisodes}
        featuredEpisodes={railEpisodes}
        contentEpisodes={sortedEpisodes}
      />
      <section className="viewer-info" id="viewer-info">
        <div className="viewer-info__body">
          <h2 className="viewer-info__title">ログインなしで楽しめます</h2>
          <p className="viewer-info__lead">
            視聴者の方は無料で作品をストリーミング再生できます。アカウント登録やログインは不要で、気になるエピソードをすぐに視聴できます。
          </p>
          <ul className="viewer-info__list">
            <li>人気作品と新着エピソードをトップページからそのまま再生。</li>
            <li>作品ページでは関連エピソードや統計情報をチェック可能。</li>
            <li>お気に入りはブラウザのブックマークなどで管理できます。</li>
          </ul>
          <div className="viewer-info__actions">
            <Link href="/#popular-episodes-heading" className="button">
              人気作品を再生する
            </Link>
            <Link href="/creator" className="button button--ghost">
              クリエイターの方はこちら
            </Link>
          </div>
        </div>
      </section>
      {!hasEpisodes && (
        <section className="episodes-empty">
          <p className="page-lede">公開中のエピソードが不足しています。アップロードするとここに表示されます。</p>
        </section>
      )}
    </div>
  );
}
