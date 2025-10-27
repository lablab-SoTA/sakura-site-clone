import { fetchAnimeList } from "@/lib/anime";
import VideoCard from "@/components/VideoCard";
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
  const remainingEpisodes = sortedEpisodes.slice(heroEpisodes.length + railEpisodes.length);

  return (
    <div className="home episodes-home">
      <MainSection heroSlides={heroEpisodes} featuredEpisodes={railEpisodes} />
      {remainingEpisodes.length > 0 && (
        <section className="episodes-section" id="featured-episodes">
          <div className="episodes-section__heading">
            <h2 className="page-title">その他のエピソード</h2>
            <p className="page-lede">さらに多くのエピソードからお気に入りを見つけてください。</p>
          </div>
          <div className="episode-grid">
            {remainingEpisodes.map((item) => (
              <VideoCard
                key={`${item.anime.slug}-${item.episode.id}`}
                anime={item.anime}
                episode={item.episode}
              />
            ))}
          </div>
        </section>
      )}
      {remainingEpisodes.length === 0 && (
        <section className="episodes-empty">
          <p className="page-lede">公開中のエピソードが不足しています。アップロードするとここに表示されます。</p>
        </section>
      )}
    </div>
  );
}
