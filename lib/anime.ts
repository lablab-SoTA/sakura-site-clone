import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

export type AnimeVideo = {
  type: "hls" | "mp4";
  src: string;
  poster?: string;
};

export type AnimeMetrics = {
  views: number;
  likes: number;
};

export type AnimeEpisode = {
  id: string;
  title: string;
  synopsis: string;
  duration: number;
  video: AnimeVideo;
  metrics?: AnimeMetrics;
};

export type Anime = {
  slug: string;
  title: string;
  synopsis: string;
  thumbnail: string;
  year: number;
  rating: string;
  genres: string[];
  creator?: string;
  duration?: number;
  metrics?: AnimeMetrics;
  episodes: AnimeEpisode[];
};

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
};

type VideoRow = {
  id: string;
  series_id: string | null;
  title: string;
  description: string | null;
  tags: string | null;
  public_url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  view_count: number;
  like_count: number;
  is_adult: boolean;
  created_at: string;
};

function detectVideoType(url: string): "hls" | "mp4" {
  return url.endsWith(".m3u8") ? "hls" : "mp4";
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function createEpisode(row: VideoRow): AnimeEpisode {
  return {
    id: row.id,
    title: row.title,
    synopsis: row.description ?? "",
    duration: row.duration_sec ?? 0,
    video: {
      type: detectVideoType(row.public_url),
      src: row.public_url,
      poster: row.thumbnail_url ?? undefined,
    },
    metrics: {
      views: row.view_count ?? 0,
      likes: row.like_count ?? 0,
    },
  };
}

function buildAnimeFromSeries(series: SeriesRow, videos: VideoRow[]): Anime | null {
  if (videos.length === 0) {
    return null;
  }

  const videoMap = new Map(videos.map((video) => [video.id, video]));

  const episodes = videos
    .map(createEpisode)
    .sort((a, b) => {
      const aCreated = videoMap.get(a.id)?.created_at ?? "";
      const bCreated = videoMap.get(b.id)?.created_at ?? "";
      return aCreated.localeCompare(bCreated);
    });

  const totalViews = episodes.reduce((sum, episode) => sum + (episode.metrics?.views ?? 0), 0);
  const totalLikes = episodes.reduce((sum, episode) => sum + (episode.metrics?.likes ?? 0), 0);
  const firstVideo = videos[0];
  const createdYear = new Date(firstVideo.created_at).getFullYear();
  const tagSet = new Set<string>();
  videos.forEach((video) => {
    parseTags(video.tags).forEach((tag) => tagSet.add(tag));
  });

  return {
    slug: `series-${series.id}`,
    title: series.title,
    synopsis: series.description ?? firstVideo.description ?? "",
    thumbnail: series.cover_url ?? firstVideo.thumbnail_url ?? XANIME_THUMB_PLACEHOLDER,
    year: Number.isFinite(createdYear) ? createdYear : new Date().getFullYear(),
    rating: videos.some((video) => video.is_adult) ? "R18" : "G",
    genres: Array.from(tagSet),
    duration: episodes.reduce((sum, episode) => sum + (episode.duration || 0), 0),
    metrics: {
      views: totalViews,
      likes: totalLikes,
    },
    episodes,
  };
}

function buildAnimeFromVideo(video: VideoRow): Anime {
  const episode = createEpisode(video);
  const createdYear = new Date(video.created_at).getFullYear();

  return {
    slug: `video-${video.id}`,
    title: video.title,
    synopsis: video.description ?? "",
    thumbnail: video.thumbnail_url ?? XANIME_THUMB_PLACEHOLDER,
    year: Number.isFinite(createdYear) ? createdYear : new Date().getFullYear(),
    rating: video.is_adult ? "R18" : "G",
    genres: parseTags(video.tags),
    duration: episode.duration,
    metrics: episode.metrics,
    episodes: [episode],
  };
}

export async function fetchAnimeList(): Promise<Anime[]> {
  const supabase = createServiceRoleClient();
  const [{ data: seriesRows = [], error: seriesError }, { data: videoRows = [], error: videoError }] = await Promise.all([
    supabase
      .from("series")
      .select("id, title, description, cover_url, created_at")
      .order("created_at", { ascending: false })
      .returns<SeriesRow[]>(),
    supabase
      .from("videos")
      .select(
        "id, series_id, title, description, tags, public_url, thumbnail_url, duration_sec, view_count, like_count, is_adult, created_at",
      )
      .eq("visibility", "PUBLIC")
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: false })
      .returns<VideoRow[]>(),
  ]);

  if (seriesError) {
    console.error("シリーズの取得に失敗しました", seriesError);
  }
  if (videoError) {
    console.error("動画の取得に失敗しました", videoError);
  }

  const videos = videoRows ?? [];
  const seriesMap = new Map<string, SeriesRow>();
  (seriesRows ?? []).forEach((series) => {
    seriesMap.set(series.id, series);
  });

  const seriesToVideos = new Map<string, VideoRow[]>();
  const standaloneVideos: VideoRow[] = [];

  videos.forEach((video) => {
    if (video.series_id && seriesMap.has(video.series_id)) {
      const list = seriesToVideos.get(video.series_id) ?? [];
      list.push(video);
      seriesToVideos.set(video.series_id, list);
    } else {
      standaloneVideos.push(video);
    }
  });

  const animeList: Anime[] = [];

  for (const [seriesId, list] of seriesToVideos.entries()) {
    const series = seriesMap.get(seriesId);
    if (!series) {
      continue;
    }
    const anime = buildAnimeFromSeries(series, list);
    if (anime) {
      animeList.push(anime);
    }
  }

  standaloneVideos.forEach((video) => {
    animeList.push(buildAnimeFromVideo(video));
  });

  return animeList.sort((a, b) => {
    const aViews = a.metrics?.views ?? 0;
    const bViews = b.metrics?.views ?? 0;
    return bViews - aViews;
  });
}

export async function fetchAnimeBySlug(slug: string): Promise<Anime | undefined> {
  const supabase = createServiceRoleClient();

  if (slug.startsWith("series-")) {
    const seriesId = slug.slice("series-".length);
    const [{ data: series, error: seriesError }, { data: videos, error: videoError }] = await Promise.all([
      supabase
        .from("series")
        .select("id, title, description, cover_url, created_at")
        .eq("id", seriesId)
        .maybeSingle<SeriesRow>(),
      supabase
        .from("videos")
        .select(
          "id, series_id, title, description, tags, public_url, thumbnail_url, duration_sec, view_count, like_count, is_adult, created_at",
        )
        .eq("series_id", seriesId)
        .eq("visibility", "PUBLIC")
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: true })
        .returns<VideoRow[]>(),
    ]);

    if (seriesError || !series) {
      console.error("シリーズの取得に失敗しました", seriesError);
      return undefined;
    }
    if (videoError) {
      console.error("シリーズ動画の取得に失敗しました", videoError);
    }

    const list = videos ?? [];
    if (list.length === 0) {
      return undefined;
    }

    return buildAnimeFromSeries(series, list) ?? undefined;
  }

  const slugBody = slug.startsWith("video-") ? slug.slice("video-".length) : slug;
  const { data: video, error } = await supabase
    .from("videos")
    .select(
      "id, series_id, title, description, tags, public_url, thumbnail_url, duration_sec, view_count, like_count, is_adult, created_at",
    )
    .eq("id", slugBody)
    .eq("visibility", "PUBLIC")
    .eq("status", "PUBLISHED")
    .maybeSingle<VideoRow>();

  if (error || !video) {
    console.error("動画の取得に失敗しました", error);
    return undefined;
  }

  if (video.series_id) {
    // シリーズ所属の動画の場合、シリーズ全体を返す
    return fetchAnimeBySlug(`series-${video.series_id}`);
  }

  return buildAnimeFromVideo(video);
}
