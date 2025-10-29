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
      {!hasEpisodes && (
        <section className="episodes-empty">
          <p className="page-lede">公開中のエピソードが不足しています。アップロードするとここに表示されます。</p>
        </section>
      )}
    </div>
  );
}
