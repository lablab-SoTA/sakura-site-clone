import HomeShowcase, {
  type HomeEpisodeItem,
  type HomeFeedItem,
  type HomeSeriesItem,
} from "@/components/home/HomeShowcase";
import { fetchAnimeList, isPortraitAnime } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

export const revalidate = 60;

const FEED_LIMIT = 18;
const SERIES_LIMIT = 12;
const EPISODE_LIMIT = 18;

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function resolvePoster(poster?: string | null, fallback?: string | null): string {
  if (poster && poster.length > 0) {
    return poster;
  }
  if (fallback && fallback.length > 0) {
    return fallback;
  }
  return XANIME_THUMB_PLACEHOLDER;
}

export default async function HomePage() {
  const animeList = await fetchAnimeList();

  const feedItems: HomeFeedItem[] = animeList
    .filter((anime) => isPortraitAnime(anime))
    .flatMap((anime) => {
      const episode = anime.episodes[0];
      if (!episode) {
        return [];
      }
      const creator = anime.creatorProfile ?? episode.creatorProfile;
      return [
        {
          id: episode.id,
          href: `/feed?start=${episode.id}`,
          poster: resolvePoster(episode.video.poster, anime.thumbnail),
          creatorName: creator?.displayName ?? anime.title,
          creatorAvatar: creator?.avatarUrl ?? null,
          createdAt: episode.createdAt ?? null,
        },
      ];
    })
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, FEED_LIMIT);

  const seriesAnimes = animeList.filter((anime) => !isPortraitAnime(anime));

  const seriesItems: HomeSeriesItem[] = seriesAnimes.slice(0, SERIES_LIMIT).map((anime) => {
    const episodes = anime.episodes;
    const latestEpisode =
      [...episodes].reverse().find((episode) => episode.createdAt) ?? episodes[episodes.length - 1];
    const creator = anime.creatorProfile ?? latestEpisode?.creatorProfile;
    return {
      slug: anime.slug,
      href: `/series/${anime.slug}`,
      poster: resolvePoster(latestEpisode?.video.poster, anime.thumbnail),
      title: anime.title,
      creatorName: creator?.displayName ?? "匿名クリエイター",
      creatorAvatar: creator?.avatarUrl ?? null,
      updatedAt: latestEpisode?.createdAt ?? null,
      episodeCount: episodes.length,
      totalViews: anime.metrics?.views ?? 0,
    };
  });

  const episodeItems: HomeEpisodeItem[] = seriesAnimes
    .flatMap((anime) =>
      anime.episodes.map((episode) => ({
        anime,
        episode,
      })),
    )
    .sort((a, b) => (b.episode.metrics?.views ?? 0) - (a.episode.metrics?.views ?? 0))
    .slice(0, EPISODE_LIMIT)
    .map(({ anime, episode }) => {
      const creator = episode.creatorProfile ?? anime.creatorProfile;
      return {
        id: episode.id,
        href: `/series/${anime.slug}?episode=${episode.id}`,
        poster: resolvePoster(episode.video.poster, anime.thumbnail),
        title: episode.title,
        seriesTitle: anime.title,
        creatorName: creator?.displayName ?? "匿名クリエイター",
        creatorAvatar: creator?.avatarUrl ?? null,
        episodeNumber: episode.episodeNumber,
        views: episode.metrics?.views ?? 0,
      };
    });

  const hasContent = feedItems.length > 0 || seriesItems.length > 0 || episodeItems.length > 0;

  return (
    <div className="home-screen">
      <HomeShowcase feedItems={feedItems} seriesItems={seriesItems} episodeItems={episodeItems} />
      {!hasContent && (
        <section className="episodes-empty">
          <p className="page-lede">公開中のエピソードが不足しています。アップロードするとここに表示されます。</p>
        </section>
      )}
    </div>
  );
}
