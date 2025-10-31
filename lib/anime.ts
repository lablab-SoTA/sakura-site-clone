import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

export type VideoOrientation = "portrait" | "landscape" | "square" | "unknown";

export type AnimeVideo = {
  type: "hls" | "mp4";
  src: string;
  poster?: string;
  width?: number | null;
  height?: number | null;
  orientation: VideoOrientation;
};

export type AnimeMetrics = {
  views: number;
  likes: number;
};

export type CreatorProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type AnimeEpisode = {
  id: string;
  title: string;
  synopsis: string;
  duration: number;
  video: AnimeVideo;
  orientation: VideoOrientation;
  metrics?: AnimeMetrics;
  episodeNumber?: number;
  ownerId?: string;
  createdAt?: string;
  seriesId?: string | null;
  creatorProfile?: CreatorProfile;
};

export type Anime = {
  slug: string;
  seriesId?: string | null;
  title: string;
  synopsis: string;
  thumbnail: string;
  year: number;
  rating: string;
  genres: string[];
  creator?: string;
  creatorProfile?: CreatorProfile;
  ownerId?: string;
  duration?: number;
  metrics?: AnimeMetrics;
  episodes: AnimeEpisode[];
  primaryOrientation: VideoOrientation;
};

type SeriesRow = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
};

type VideoRow = {
  id: string;
  owner_id: string;
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
  width: number | null;
  height: number | null;
};

type SeasonRow = {
  id: string;
  series_id: string;
  season_number: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type EpisodeRow = {
  id: string;
  season_id: string;
  episode_number_int: number | null;
  episode_number_str: string | null;
  episode_type: string;
  title_raw: string;
  title_clean: string | null;
  slug: string;
  description: string | null;
  release_date: string | null;
  duration_sec: number | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

type EpisodeAssembly = {
  episode: AnimeEpisode;
  seasonNumber: number;
  episodeNumberInt: number | null;
  createdAt: string;
  isAdult: boolean;
  tags: string[];
};

type VideoFileRow = {
  id: string;
  episode_id: string;
  owner_id: string;
  public_url: string;
  file_path: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  view_count: number | null;
  like_count: number | null;
  is_adult: boolean | null;
  visibility: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function detectVideoOrientation(width: number | null | undefined, height: number | null | undefined): VideoOrientation {
  const w = typeof width === "number" ? width : null;
  const h = typeof height === "number" ? height : null;
  if (!w || !h || w <= 0 || h <= 0) {
    return "unknown";
  }
  if (h > w * 1.05) {
    return "portrait";
  }
  if (w > h * 1.05) {
    return "landscape";
  }
  return "square";
}

export function resolvePrimaryOrientation(episodes: AnimeEpisode[]): VideoOrientation {
  if (episodes.length === 0) {
    return "unknown";
  }

  const tally: Record<VideoOrientation, number> = {
    portrait: 0,
    landscape: 0,
    square: 0,
    unknown: 0,
  };

  episodes.forEach((episode) => {
    tally[episode.orientation] += 1;
  });

  const preference: VideoOrientation[] = ["portrait", "landscape", "square", "unknown"];
  let winner: VideoOrientation = "unknown";
  preference.forEach((orientation) => {
    if (tally[orientation] > tally[winner]) {
      winner = orientation;
    }
  });

  return winner;
}

function resolvePrimaryOrientationWithFallback(
  episodes: AnimeEpisode[],
  hasSeries: boolean,
): VideoOrientation {
  const primary = resolvePrimaryOrientation(episodes);
  if (primary !== "unknown") {
    return primary;
  }

  const hasPortraitEpisode = episodes.some((episode) => episode.orientation === "portrait");
  if (hasPortraitEpisode) {
    return "portrait";
  }

  const hasSquareEpisode = episodes.some((episode) => episode.orientation === "square");
  if (hasSquareEpisode) {
    return "square";
  }

  // 幅と高さの情報が欠損している旧データは、シリーズかどうかで推定する
  return hasSeries ? "landscape" : "portrait";
}

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function detectVideoType(url: string): "hls" | "mp4" {
  return url.endsWith(".m3u8") ? "hls" : "mp4";
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function decodeSlug(value: string): string {
  if (!value) {
    return value;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function createEpisode(row: VideoRow, seriesId: string | null = null): AnimeEpisode {
  const orientation = detectVideoOrientation(row.width, row.height);

  return {
    id: row.id,
    title: row.title,
    synopsis: row.description ?? "",
    duration: row.duration_sec ?? 0,
    video: {
      type: detectVideoType(row.public_url),
      src: row.public_url,
      poster: row.thumbnail_url ?? undefined,
      width: row.width,
      height: row.height,
      orientation,
    },
    orientation,
    metrics: {
      views: row.view_count ?? 0,
      likes: row.like_count ?? 0,
    },
    ownerId: row.owner_id,
    createdAt: row.created_at,
    seriesId,
  };
}

function buildAnimeFromLegacySeries(series: SeriesRow, videos: VideoRow[]): Anime | null {
  if (videos.length === 0) {
    return null;
  }

  const videoMap = new Map(videos.map((video) => [video.id, video]));

  const episodes = videos
    .map((video) => createEpisode(video, series.id))
    .sort((a, b) => {
      const aCreated = videoMap.get(a.id)?.created_at ?? "";
      const bCreated = videoMap.get(b.id)?.created_at ?? "";
      return aCreated.localeCompare(bCreated);
    })
    .map((episode, index) => ({
      ...episode,
      episodeNumber: index + 1,
    }));

  const totalViews = episodes.reduce((sum, episode) => sum + (episode.metrics?.views ?? 0), 0);
  const totalLikes = episodes.reduce((sum, episode) => sum + (episode.metrics?.likes ?? 0), 0);
  const firstVideo = videos[0];
  const createdYear = new Date(firstVideo.created_at).getFullYear();
  const primaryOwnerId = episodes.find((episode) => episode.ownerId)?.ownerId;
  const tagSet = new Set<string>();
  videos.forEach((video) => {
    parseTags(video.tags).forEach((tag) => tagSet.add(tag));
  });

  const seriesSlug = series.slug && series.slug.trim().length > 0 ? series.slug : `series-${series.id}`;

  return {
    slug: seriesSlug,
    seriesId: series.id,
    title: series.title,
    synopsis: series.description ?? firstVideo.description ?? "",
    thumbnail: series.cover_url ?? firstVideo.thumbnail_url ?? XANIME_THUMB_PLACEHOLDER,
    year: Number.isFinite(createdYear) ? createdYear : new Date().getFullYear(),
    rating: videos.some((video) => video.is_adult) ? "R18" : "G",
    genres: Array.from(tagSet),
    ownerId: primaryOwnerId ?? undefined,
    duration: episodes.reduce((sum, episode) => sum + (episode.duration || 0), 0),
    metrics: {
      views: totalViews,
      likes: totalLikes,
    },
    episodes,
    primaryOrientation: resolvePrimaryOrientationWithFallback(episodes, true),
  };
}

function buildEpisodeAssemblies(
  episodeRows: EpisodeRow[],
  seasons: SeasonRow[],
  videoFileMap: Map<string, VideoFileRow>,
  seriesId: string,
): EpisodeAssembly[] {
  if (episodeRows.length === 0) {
    return [];
  }

  const seasonOrder = new Map<string, number>();
  seasons.forEach((season) => {
    seasonOrder.set(season.id, season.season_number ?? 0);
  });

  const assemblies: EpisodeAssembly[] = [];

  episodeRows.forEach((row) => {
    const videoFile = videoFileMap.get(row.id);
    if (!videoFile) {
      return;
    }

    if (!videoFile.public_url || videoFile.visibility !== "PUBLIC" || videoFile.status !== "PUBLISHED") {
      return;
    }

    const orientation = detectVideoOrientation(videoFile.width, videoFile.height);
    const poster = videoFile.thumbnail_url ?? row.thumbnail_url ?? undefined;
    const duration = videoFile.duration_sec ?? row.duration_sec ?? 0;
    const metrics: AnimeMetrics = {
      views: Number(videoFile.view_count ?? 0),
      likes: Number(videoFile.like_count ?? 0),
    };

    const episode: AnimeEpisode = {
      id: row.id,
      title: row.title_clean?.trim().length ? row.title_clean : row.title_raw,
      synopsis: row.description ?? "",
      duration,
      video: {
        type: detectVideoType(videoFile.public_url),
        src: videoFile.public_url,
        poster,
        width: videoFile.width ?? undefined,
        height: videoFile.height ?? undefined,
        orientation,
      },
      orientation,
      metrics,
      ownerId: videoFile.owner_id ?? undefined,
      createdAt: row.created_at,
      seriesId,
      episodeNumber: row.episode_number_int ?? undefined,
    };

    const tags = Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      : [];

    assemblies.push({
      episode,
      seasonNumber: seasonOrder.get(row.season_id) ?? 0,
      episodeNumberInt: row.episode_number_int ?? null,
      createdAt: row.created_at,
      isAdult: Boolean(videoFile.is_adult ?? true),
      tags,
    });
  });

  return assemblies;
}

function buildAnimeFromEpisodeAssemblies(series: SeriesRow, assemblies: EpisodeAssembly[]): Anime | null {
  if (assemblies.length === 0) {
    return null;
  }

  assemblies.sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) {
      return a.seasonNumber - b.seasonNumber;
    }
    if (a.episodeNumberInt !== null && b.episodeNumberInt !== null && a.episodeNumberInt !== b.episodeNumberInt) {
      return a.episodeNumberInt - b.episodeNumberInt;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  const episodes = assemblies.map((entry, index) => ({
    ...entry.episode,
    episodeNumber: entry.episodeNumberInt ?? index + 1,
  }));

  const totalViews = episodes.reduce((sum, episode) => sum + (episode.metrics?.views ?? 0), 0);
  const totalLikes = episodes.reduce((sum, episode) => sum + (episode.metrics?.likes ?? 0), 0);
  const totalDuration = episodes.reduce((sum, episode) => sum + (episode.duration ?? 0), 0);
  const anyAdult = assemblies.some((entry) => entry.isAdult);
  const tagSet = new Set<string>();
  assemblies.forEach((entry) => {
    entry.tags.forEach((tag) => tagSet.add(tag));
  });

  const thumbnailCandidate =
    series.cover_url ??
    episodes.find((episode) => episode.video.poster && episode.video.poster.length > 0)?.video.poster ??
    XANIME_THUMB_PLACEHOLDER;

  const createdReference = episodes[0]?.createdAt ?? series.created_at;
  const createdYear = new Date(createdReference).getFullYear();
  const ownerId = episodes.find((episode) => episode.ownerId)?.ownerId;
  const seriesSlug = series.slug && series.slug.trim().length > 0 ? series.slug : `series-${series.id}`;
  const primaryOrientation = resolvePrimaryOrientationWithFallback(episodes, true);

  return {
    slug: seriesSlug,
    seriesId: series.id,
    title: series.title,
    synopsis: series.description ?? episodes[0]?.synopsis ?? "",
    thumbnail: thumbnailCandidate,
    year: Number.isFinite(createdYear) ? createdYear : new Date().getFullYear(),
    rating: anyAdult ? "R18" : "G",
    genres: Array.from(tagSet),
    ownerId: ownerId ?? undefined,
    duration: totalDuration,
    metrics: {
      views: totalViews,
      likes: totalLikes,
    },
    episodes,
    primaryOrientation,
  };
}

function buildAnimeFromVideo(video: VideoRow): Anime {
  const episode = createEpisode(video);
  const createdYear = new Date(video.created_at).getFullYear();
  const primaryEpisode = { ...episode, episodeNumber: 1 };

  return {
    slug: `video-${video.id}`,
    seriesId: null,
    title: video.title,
    synopsis: video.description ?? "",
    thumbnail: video.thumbnail_url ?? XANIME_THUMB_PLACEHOLDER,
    year: Number.isFinite(createdYear) ? createdYear : new Date().getFullYear(),
    rating: video.is_adult ? "R18" : "G",
    genres: parseTags(video.tags),
    ownerId: video.owner_id,
    duration: episode.duration,
    metrics: episode.metrics,
    episodes: [primaryEpisode],
    primaryOrientation: resolvePrimaryOrientationWithFallback([primaryEpisode], false),
  };
}

async function enrichAnimeListWithProfiles(
  supabase: ReturnType<typeof createServiceRoleClient>,
  list: Anime[],
): Promise<Anime[]> {
  if (list.length === 0) {
    return [];
  }

  const ownerIds = new Set<string>();
  list.forEach((anime) => {
    if (anime.ownerId) {
      ownerIds.add(anime.ownerId);
    }
    anime.episodes.forEach((episode) => {
      if (episode.ownerId) {
        ownerIds.add(episode.ownerId);
      }
    });
  });

  let profileMap = new Map<string, CreatorProfile>();

  if (ownerIds.size > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", Array.from(ownerIds))
      .returns<ProfileRow[]>();

    if (profileError) {
      console.error("クリエイタープロフィールの取得に失敗しました", profileError);
    } else if (profileRows) {
      profileMap = new Map(
        profileRows.map((row) => {
          const rawName = row.display_name?.trim() ?? "";
          return [
            row.user_id,
            {
              id: row.user_id,
              displayName: rawName.length > 0 ? rawName : "匿名クリエイター",
              avatarUrl: row.avatar_url ?? null,
            },
          ] as const;
        }),
      );
    }
  }

  const resolveProfile = (ownerId?: string): CreatorProfile | undefined => {
    if (!ownerId) {
      return undefined;
    }
    const existing = profileMap.get(ownerId);
    if (existing) {
      return existing;
    }
    return {
      id: ownerId,
      displayName: "匿名クリエイター",
      avatarUrl: null,
    };
  };

  return list.map((anime) => {
    const primaryOwnerId =
      anime.ownerId ?? anime.episodes.find((episode) => Boolean(episode.ownerId))?.ownerId;
    const creatorProfile = resolveProfile(primaryOwnerId);

    return {
      ...anime,
      ownerId: primaryOwnerId ?? undefined,
      creator: creatorProfile?.displayName ?? anime.creator,
      creatorProfile,
      episodes: anime.episodes.map((episode) => ({
        ...episode,
        creatorProfile: resolveProfile(episode.ownerId),
      })),
    };
  });
}

export async function fetchAnimeList(): Promise<Anime[]> {
  const supabase = createServiceRoleClient();
  const [{ data: seriesRows = [], error: seriesError }, { data: videoRows = [], error: videoError }] = await Promise.all([
    supabase
      .from("series")
      .select("id, slug, title, description, cover_url, created_at")
      .order("created_at", { ascending: false })
      .returns<SeriesRow[]>(),
    supabase
      .from("videos")
      .select(
        "id, owner_id, series_id, title, description, tags, public_url, thumbnail_url, duration_sec, view_count, like_count, is_adult, created_at, width, height",
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
    const anime = buildAnimeFromLegacySeries(series, list);
    if (anime) {
      animeList.push(anime);
    }
  }

  standaloneVideos.forEach((video) => {
    animeList.push(buildAnimeFromVideo(video));
  });

  const enrichedList = await enrichAnimeListWithProfiles(supabase, animeList);

  return enrichedList.sort((a, b) => {
    const aViews = a.metrics?.views ?? 0;
    const bViews = b.metrics?.views ?? 0;
    return bViews - aViews;
  });
}

export function isPortraitAnime(anime: Anime): boolean {
  if (anime.primaryOrientation === "portrait" || anime.primaryOrientation === "square") {
    return true;
  }

  if (anime.primaryOrientation === "landscape") {
    return false;
  }

  const hasPortraitEpisode = anime.episodes.some((episode) => episode.orientation === "portrait");
  if (hasPortraitEpisode) {
    return true;
  }

  const hasSquareEpisode = anime.episodes.some((episode) => episode.orientation === "square");
  if (hasSquareEpisode) {
    return true;
  }

  // シリーズに属さない単発作品はフィード向きの可能性が高いため縦型扱いとする
  if (!anime.seriesId) {
    return true;
  }

  return anime.episodes.length <= 1;
}

export function isLandscapeAnime(anime: Anime): boolean {
  if (anime.primaryOrientation === "landscape") {
    return true;
  }

  if (anime.primaryOrientation === "portrait") {
    return false;
  }

  if (anime.primaryOrientation === "square") {
    return false;
  }

  const hasLandscapeEpisode = anime.episodes.some((episode) => episode.orientation === "landscape");
  if (hasLandscapeEpisode) {
    return true;
  }

  // 複数話のシリーズで寸法が不明な場合は横型とみなす
  return Boolean(anime.seriesId) && anime.episodes.length > 1;
}

export async function fetchAnimeBySlug(slug: string): Promise<Anime | undefined> {
  const rawSlug = slug;
  const normalizedSlug = decodeSlug(rawSlug);
  const effectiveSlug = normalizedSlug.length > 0 ? normalizedSlug : rawSlug;
  const supabase = createServiceRoleClient();

  const fetchSeries = async (match: { id?: string; slug?: string }): Promise<Anime | undefined> => {
    let seriesQuery = supabase.from("series").select("id, slug, title, description, cover_url, created_at").limit(1);
    if (match.id) {
      seriesQuery = seriesQuery.eq("id", match.id);
    }
    if (match.slug) {
      seriesQuery = seriesQuery.eq("slug", match.slug);
    }

    const { data: series, error: seriesError } = await seriesQuery.maybeSingle<SeriesRow>();

    if (seriesError) {
      console.error("シリーズの取得に失敗しました", seriesError);
    }

    if (!series) {
      return undefined;
    }

    const { data: seasons, error: seasonsError } = await supabase
      .from("seasons")
      .select("id, series_id, season_number, name, slug, description, created_at, updated_at")
      .eq("series_id", series.id)
      .order("season_number", { ascending: true })
      .returns<SeasonRow[]>();

    if (seasonsError) {
      console.error("シーズンの取得に失敗しました", seasonsError);
    }

    const seasonList = seasons ?? [];
    let episodeAssemblies: EpisodeAssembly[] = [];

    if (seasonList.length > 0) {
      const seasonIds = seasonList.map((season) => season.id);

      const { data: episodeRows, error: episodeError } = await supabase
        .from("episodes")
        .select(
          "id, season_id, episode_number_int, episode_number_str, episode_type, title_raw, title_clean, slug, description, release_date, duration_sec, tags, thumbnail_url, created_at, updated_at",
        )
        .in("season_id", seasonIds)
        .order("created_at", { ascending: true })
        .returns<EpisodeRow[]>();

      if (episodeError) {
        console.error("エピソードの取得に失敗しました", episodeError);
      }

      const rows = episodeRows ?? [];
      if (rows.length > 0) {
        const episodeIds = rows.map((row) => row.id);
        const { data: videoFiles, error: videoFileError } = await supabase
          .from("video_files")
          .select(
            "id, episode_id, owner_id, public_url, file_path, thumbnail_url, width, height, duration_sec, view_count, like_count, is_adult, visibility, status, created_at, updated_at",
          )
          .in("episode_id", episodeIds)
          .returns<VideoFileRow[]>();

        if (videoFileError) {
          console.error("動画ファイルの取得に失敗しました", videoFileError);
        }

        const videoFileMap = new Map<string, VideoFileRow>();
        (videoFiles ?? []).forEach((file) => {
          if (!videoFileMap.has(file.episode_id)) {
            videoFileMap.set(file.episode_id, file);
          }
        });

        episodeAssemblies = buildEpisodeAssemblies(rows, seasonList, videoFileMap, series.id);
      }
    }

    if (episodeAssemblies.length > 0) {
      const anime = buildAnimeFromEpisodeAssemblies(series, episodeAssemblies);
      if (anime) {
        const enriched = await enrichAnimeListWithProfiles(supabase, [anime]);
        return enriched[0] ?? anime;
      }
    }

    const { data: videos, error: videoError } = await supabase
      .from("videos")
      .select(
        "id, owner_id, series_id, title, description, tags, public_url, thumbnail_url, duration_sec, view_count, like_count, is_adult, created_at, width, height",
      )
      .eq("series_id", series.id)
      .eq("visibility", "PUBLIC")
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: true })
      .returns<VideoRow[]>();

    if (videoError) {
      console.error("シリーズ動画の取得に失敗しました", videoError);
    }

    const list = videos ?? [];
    if (list.length === 0) {
      return undefined;
    }

    const anime = buildAnimeFromLegacySeries(series, list);
    if (!anime) {
      return undefined;
    }

    const enriched = await enrichAnimeListWithProfiles(supabase, [anime]);
    return enriched[0] ?? anime;
  };

  const fetchVideo = async (videoId: string): Promise<Anime | undefined> => {
    if (!isValidUuid(videoId)) {
      return undefined;
    }

    const { data: video, error } = await supabase
      .from("videos")
      .select(
        "id, owner_id, series_id, title, description, tags, public_url, thumbnail_url, duration_sec, view_count, like_count, is_adult, created_at, width, height",
      )
      .eq("id", videoId)
      .eq("visibility", "PUBLIC")
      .eq("status", "PUBLISHED")
      .maybeSingle<VideoRow>();

    if (error || !video) {
      console.error("動画の取得に失敗しました", error);
      return undefined;
    }

    if (video.series_id) {
      const seriesAnime = await fetchSeries(video.series_id);
      if (seriesAnime) {
        return seriesAnime;
      }
    }

    const standalone = buildAnimeFromVideo(video);
    const enriched = await enrichAnimeListWithProfiles(supabase, [standalone]);
    return enriched[0] ?? standalone;
  };

  if (effectiveSlug.startsWith("series-")) {
    const seriesId = effectiveSlug.slice("series-".length);
    const seriesAnime = isValidUuid(seriesId) ? await fetchSeries({ id: seriesId }) : undefined;
    if (seriesAnime) {
      return seriesAnime;
    }
    const fallbackSeries = await fetchSeries({ slug: effectiveSlug });
    if (fallbackSeries) {
      return fallbackSeries;
    }
    if (isValidUuid(seriesId)) {
      return fetchVideo(seriesId);
    }
    return undefined;
  }

  const seriesBySlug = await fetchSeries({ slug: effectiveSlug });
  if (seriesBySlug) {
    return seriesBySlug;
  }

  if (effectiveSlug !== rawSlug) {
    const fallbackSeries = await fetchSeries({ slug: rawSlug });
    if (fallbackSeries) {
      return fallbackSeries;
    }
  }

  const slugBody = effectiveSlug.startsWith("video-") ? effectiveSlug.slice("video-".length) : effectiveSlug;
  return fetchVideo(slugBody);
}
