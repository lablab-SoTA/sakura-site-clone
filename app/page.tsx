import VideoCard from "@/components/VideoCard";
import HeroCarousel from "@/components/HeroCarousel";
import { fetchAnimeList } from "@/lib/anime";

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

  return (
    <div className="home episodes-home">
      {heroEpisodes.length > 0 && <HeroCarousel slides={heroEpisodes} />}
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
