import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";
import type { Anime, AnimeEpisode } from "@/lib/anime";
import { detectVideoType } from "@/lib/anime";
import type { EpisodeWithVideoFile, SeriesWithHierarchy } from "@/lib/types/hierarchy";

/**
 * 階層データから AnimeEpisode を生成するヘルパー
 */
function createAnimeEpisodeFromHierarchy(episode: EpisodeWithVideoFile): AnimeEpisode | null {
  const videoFile = episode.video_file;

  if (!videoFile) {
    return null;
  }

  const src = videoFile.public_url ?? videoFile.file_path ?? "";
  if (!src) {
    return null;
  }

  const duration = episode.duration_sec ?? videoFile.duration_sec ?? 0;
  const synopsis = episode.description ?? "";

  return {
    id: episode.id,
    title: episode.title_clean || episode.title_raw,
    synopsis,
    duration,
    video: {
      type: detectVideoType(src),
      src,
      poster: videoFile.thumbnail_url ?? undefined,
    },
    metrics: {
      views: videoFile.view_count ?? 0,
      likes: videoFile.like_count ?? 0,
    },
    episodeNumber: episode.episode_number_int,
  };
}

/**
 * SeriesWithHierarchy から Anime 型へ変換
 */
export function convertSeriesHierarchyToAnime(series: SeriesWithHierarchy): Anime | null {
  const metadata = typeof series.metadata === "string" ? JSON.parse(series.metadata) : series.metadata ?? {};
  const seasons = series.seasons ?? [];

  const flattenedEpisodes = seasons.flatMap((season) => {
    const episodes = season.episodes ?? [];
    return episodes
      .slice()
      .sort((a, b) => a.episode_number_int - b.episode_number_int)
      .map(createAnimeEpisodeFromHierarchy)
      .filter((episode): episode is AnimeEpisode => episode !== null);
  });

  if (flattenedEpisodes.length === 0) {
    return null;
  }

  const totalViews = flattenedEpisodes.reduce((sum, episode) => sum + (episode.metrics?.views ?? 0), 0);
  const totalLikes = flattenedEpisodes.reduce((sum, episode) => sum + (episode.metrics?.likes ?? 0), 0);
  const totalDuration = flattenedEpisodes.reduce((sum, episode) => sum + (episode.duration ?? 0), 0);
  const primaryEpisode = flattenedEpisodes[0];

  const firstPoster = primaryEpisode.video.poster;
  const genres = Array.isArray(metadata.genres) ? metadata.genres : [];
  const rating = typeof metadata.rating === "string" ? metadata.rating : "G";
  const year =
    typeof metadata.year === "number"
      ? metadata.year
      : Number.isFinite(new Date(series.created_at).getFullYear())
        ? new Date(series.created_at).getFullYear()
        : new Date().getFullYear();

  return {
    slug: series.slug || `series-${series.id}`,
    title: series.title_clean || series.title_raw,
    synopsis: series.description ?? primaryEpisode.synopsis ?? "",
    thumbnail: series.cover_url ?? firstPoster ?? XANIME_THUMB_PLACEHOLDER,
    year,
    rating,
    genres,
    duration: totalDuration,
    metrics: {
      views: totalViews,
      likes: totalLikes,
    },
    episodes: flattenedEpisodes.map((episode, index) => ({
      ...episode,
      episodeNumber: episode.episodeNumber ?? index + 1,
    })),
  };
}

/**
 * SeriesWithHierarchy 配列から Anime 配列を生成
 */
export function convertSeriesHierarchyListToAnime(list: SeriesWithHierarchy[]): Anime[] {
  return list
    .map(convertSeriesHierarchyToAnime)
    .filter((anime): anime is Anime => anime !== null)
    .sort((a, b) => {
      const aViews = a.metrics?.views ?? 0;
      const bViews = b.metrics?.views ?? 0;
      return bViews - aViews;
    });
}
