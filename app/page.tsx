import { fetchAnimeList } from "@/lib/anime";
import MainSection from "@/components/feature/MainSection";

export const revalidate = 60;

export default async function HomePage() {
  const animeList = await fetchAnimeList();
  const episodeHighlights = animeList.flatMap((anime) =>
    anime.episodes.map((episode) => ({
      anime,
      episode,
    })),
  );

  const sortedEpisodes = episodeHighlights.sort(
    (a, b) => (b.episode.metrics?.views ?? 0) - (a.episode.metrics?.views ?? 0),
  );

  const heroEpisodes = sortedEpisodes.slice(0, 3);
  const popularEpisodes = sortedEpisodes.slice(0, 12);

  const seriesHighlights = animeList
    .filter((anime) => anime.slug.startsWith("series-"))
    .map((anime) => ({
      anime,
      primaryEpisode:
        anime.episodes.find((episode) => (episode.episodeNumber ?? 0) === 1) ?? anime.episodes[0],
      totalViews: anime.metrics?.views ?? 0,
    }))
    .sort((a, b) => b.totalViews - a.totalViews);

  const popularSeries = seriesHighlights.slice(0, 8);
  const hasContent = episodeHighlights.length > 0;

  return (
    <div className="home episodes-home">
      <MainSection
        heroSlides={heroEpisodes}
        popularSeries={popularSeries}
        popularEpisodes={popularEpisodes}
        allContent={episodeHighlights}
      />
      {!hasContent && (
        <section className="episodes-empty">
          <p className="page-lede">公開中のエピソードが不足しています。アップロードするとここに表示されます。</p>
        </section>
      )}
    </div>
  );
}
