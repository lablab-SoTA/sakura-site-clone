import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import CreatorContentTabs, { type CreatorSeriesItem } from "@/components/creator/CreatorContentTabs";
import type { FeedViewerItem } from "@/components/feed/FeedViewer";
import { fetchAnimeList, isPortraitAnime } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";
import { createServiceRoleClient } from "@/lib/supabase/server";

type ProfileRecord = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  sns_x: string | null;
  sns_instagram: string | null;
  sns_youtube: string | null;
};

type VideoData = {
  id: string;
  title: string;
  description: string | null;
  public_url: string;
  thumbnail_url: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
  series_id: string | null;
  series_title: string | null;
  series_slug: string | null;
  episode_number_int: number | null;
  episode_number_str: string | null;
  watchPath: string | null;
  source: "legacy" | "hierarchy";
};

type LegacyVideoRow = {
  id: string;
  title: string;
  description: string | null;
  public_url: string;
  thumbnail_url: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
  series_id: string | null;
  series?: {
    title_clean?: string | null;
    title_raw?: string | null;
    title?: string | null;
    slug?: string | null;
  } | null;
};

type EpisodeRow = {
  id: string;
  title_clean: string | null;
  title_raw: string | null;
  description: string | null;
  episode_number_int: number | null;
  episode_number_str: string | null;
  created_at: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  season: {
    id: string;
    name: string | null;
    season_number: number | null;
    series: {
      id: string;
      title_clean: string | null;
      title_raw: string | null;
      slug?: string | null;
      title?: string | null;
    } | null;
  } | null;
  video_file: {
    id: string;
    owner_id: string;
    public_url: string;
    thumbnail_url: string | null;
    like_count: number | null;
    view_count: number | null;
    visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
    status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  } | null;
};

function isMissingColumn(error: PostgrestError | null | undefined): boolean {
  return error?.code === "42703";
}

function isMissingTable(error: PostgrestError | null | undefined): boolean {
  return error?.code === "PGRST205";
}

function calculateFeedScore(views: number, likes: number, createdAt: string | null | undefined): number {
  const now = Date.now();
  const createdTime = createdAt ? new Date(createdAt).getTime() : now;
  const isValid = Number.isFinite(createdTime);
  const ageHours = Math.max(1, (now - (isValid ? createdTime : now)) / (1000 * 60 * 60));
  const recencyBoost = 80000 / ageHours;
  const likeBoost = likes * 16;
  const viewScore = views * 0.55;
  return recencyBoost + likeBoost + viewScore;
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

export const metadata = {
  title: "クリエイターページ | xanime",
};

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, display_name, bio, avatar_url, sns_x, sns_instagram, sns_youtube")
    .eq("user_id", id)
    .maybeSingle<ProfileRecord>();

  if (!profile) {
    notFound();
  }

  let legacyVideoRows: LegacyVideoRow[] | null = null;
  let legacyVideoError: PostgrestError | null | undefined;

  const legacyVideoQuery = await supabase
    .from("videos")
    .select(
      "id, title, description, public_url, thumbnail_url, like_count, view_count, created_at, series_id, series:series(*)",
    )
    .eq("owner_id", id)
    .eq("visibility", "PUBLIC")
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false })
    .returns<LegacyVideoRow[]>();

  legacyVideoRows = legacyVideoQuery.data ?? null;
  legacyVideoError = legacyVideoQuery.error;

  if (legacyVideoError) {
    if (isMissingColumn(legacyVideoError)) {
      const fallbackVideos = await supabase
        .from("videos")
        .select("id, title, description, public_url, thumbnail_url, like_count, view_count, created_at, series_id")
        .eq("owner_id", id)
        .eq("visibility", "PUBLIC")
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: false })
        .returns<LegacyVideoRow[]>();

      if (fallbackVideos.error) {
        throw fallbackVideos.error;
      }

      legacyVideoRows = (fallbackVideos.data ?? []).map((row) => ({ ...row, series: null }));
    } else {
      throw legacyVideoError;
    }
  }

  const legacyPublished = (legacyVideoRows ?? []).map(normalizeLegacyVideoRow);

  const hierarchyPublished: VideoData[] = [];
  const { data: episodeRows, error: episodeError } = await supabase
    .from("episodes")
    .select(
      "id, title_clean, title_raw, description, thumbnail_url, tags, episode_number_int, episode_number_str, created_at, season:seasons(id, name, season_number, series:series(*)), video_file:video_files(id, owner_id, public_url, thumbnail_url, like_count, view_count, visibility, status)",
    )
    .eq("video_file.owner_id", id)
    .not("video_file", "is", null)
    .order("created_at", { ascending: false })
    .returns<EpisodeRow[]>();

  if (!episodeError) {
    hierarchyPublished.push(
      ...((episodeRows ?? []).map(normalizeEpisodeRow).filter((video): video is VideoData => video !== null)),
    );
  } else if (!isMissingTable(episodeError)) {
    console.warn("階層化された動画情報の取得に失敗しました", episodeError);
  }

  const publishedVideos = mergeAndSortVideos(legacyPublished, hierarchyPublished);

  const videoCount = publishedVideos.length;
  const totalViews = publishedVideos.reduce((acc, video) => acc + video.view_count, 0);
  const totalLikes = publishedVideos.reduce((acc, video) => acc + video.like_count, 0);
  const latestPublishedAt = publishedVideos[0]
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
        new Date(publishedVideos[0].created_at),
      )
    : null;
  const creatorDisplayName = profile.display_name?.trim() && profile.display_name.trim().length > 0 ? profile.display_name.trim() : "匿名クリエイター";
  const socialLinks = [
    profile.sns_x?.trim() ? { href: profile.sns_x.trim(), label: "X (Twitter)" } : null,
    profile.sns_instagram?.trim() ? { href: profile.sns_instagram.trim(), label: "Instagram" } : null,
    profile.sns_youtube?.trim() ? { href: profile.sns_youtube.trim(), label: "YouTube" } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  const bioText = profile.bio?.trim() ?? "";
  const hasBio = bioText.length > 0;

  const animeCatalog = await fetchAnimeList();
  const creatorAnime = animeCatalog.filter((anime) => {
    const owner = anime.ownerId ?? anime.episodes.find((episode) => episode.ownerId)?.ownerId;
    return owner === id;
  });

  const feedItems: FeedViewerItem[] = creatorAnime
    .filter((anime) => isPortraitAnime(anime))
    .flatMap((anime) => {
      const episode = anime.episodes[0];
      if (!episode) {
        return [] as FeedViewerItem[];
      }
      const creatorProfile = anime.creatorProfile ?? episode.creatorProfile;
      return [
        {
          id: episode.id,
          title: episode.title,
          description: episode.synopsis ?? anime.synopsis ?? "",
          src: episode.video.src,
          poster: resolvePoster(episode.video.poster, anime.thumbnail),
          creatorName: creatorProfile?.displayName ?? creatorDisplayName,
          creatorId: creatorProfile?.id ?? id,
          creatorAvatar: creatorProfile?.avatarUrl ?? profile.avatar_url ?? null,
          views: episode.metrics?.views ?? 0,
          likes: episode.metrics?.likes ?? 0,
          createdAt: episode.createdAt ?? null,
          score: calculateFeedScore(
            episode.metrics?.views ?? 0,
            episode.metrics?.likes ?? 0,
            episode.createdAt ?? null,
          ),
        },
      ];
    })
    .sort((a, b) => b.score - a.score);

  const seriesItems: CreatorSeriesItem[] = creatorAnime
    .filter((anime) => !isPortraitAnime(anime))
    .map((anime) => {
      const latestEpisode =
        [...anime.episodes].reverse().find((episode) => episode.createdAt) ??
        anime.episodes[anime.episodes.length - 1];
      return {
        slug: anime.slug,
        title: anime.title,
        poster: resolvePoster(latestEpisode?.video.poster, anime.thumbnail),
        episodeCount: anime.episodes.length,
        updatedAt: latestEpisode?.createdAt ?? null,
        views: anime.metrics?.views ?? 0,
      } satisfies CreatorSeriesItem;
    })
    .sort((a, b) => b.views - a.views);

  return (
    <div className="creator-page">
      <header className="creator-page__hero">
        <div className="creator-page__hero-visual" aria-hidden>
          <div className="creator-page__avatar">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="" fill sizes="140px" unoptimized />
            ) : (
              <span>{profile.display_name?.[0] ?? "?"}</span>
            )}
          </div>
        </div>
        <div className="creator-page__hero-body">
          <span className="creator-page__kicker">CREATOR</span>
          <h1 className="creator-page__title">{creatorDisplayName}</h1>
          {latestPublishedAt && (
            <p className="creator-page__update">最終更新 {latestPublishedAt}</p>
          )}
          <p className={`creator-page__bio${hasBio ? "" : " creator-page__bio--empty"}`}>
            {hasBio ? bioText : "プロフィール文はまだ設定されていません。"}
          </p>
          <ul className="creator-page__metrics" aria-label="クリエイターの公開状況">
            <li className="creator-page__metric">
              <span className="creator-page__metric-value">{videoCount.toLocaleString()}</span>
              <span className="creator-page__metric-label">公開作品</span>
            </li>
            <li className="creator-page__metric">
              <span className="creator-page__metric-value">{totalViews.toLocaleString()}</span>
              <span className="creator-page__metric-label">総再生数</span>
            </li>
            <li className="creator-page__metric">
              <span className="creator-page__metric-value">{totalLikes.toLocaleString()}</span>
              <span className="creator-page__metric-label">総いいね</span>
            </li>
          </ul>
          {socialLinks.length > 0 && (
            <ul className="creator-page__links">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      <section className="creator-page__videos">
        <div className="creator-page__section-head">
          <div>
            <span className="creator-page__section-kicker">PORTFOLIO</span>
            <h2 className="creator-page__section-title">公開中の作品</h2>
          </div>
          <p className="creator-page__section-lede">フィードとシリーズをタブで切り替えてご覧いただけます。</p>
        </div>
        <CreatorContentTabs feedItems={feedItems} seriesItems={seriesItems} />
      </section>
    </div>
  );
}

function normalizeLegacyVideoRow(video: LegacyVideoRow): VideoData {
  const rawSeriesTitle = video.series?.title_clean ?? video.series?.title_raw ?? video.series?.title ?? null;
  const seriesTitle = rawSeriesTitle ? rawSeriesTitle.trim() : null;

  return {
    id: video.id,
    title: video.title,
    description: video.description ?? null,
    public_url: video.public_url,
    thumbnail_url: video.thumbnail_url,
    like_count: video.like_count,
    view_count: video.view_count,
    created_at: video.created_at,
    series_id: video.series_id,
    series_title: seriesTitle,
    series_slug: (video.series?.slug ?? null) as string | null,
    episode_number_int: null,
    episode_number_str: null,
    watchPath: `/videos/${video.id}`,
    source: "legacy",
  };
}

function normalizeEpisodeRow(episode: EpisodeRow): VideoData | null {
  const videoFile = episode.video_file;
  if (!videoFile) {
    return null;
  }

  if (videoFile.visibility !== "PUBLIC" || videoFile.status !== "PUBLISHED") {
    return null;
  }

  const series = episode.season?.series ?? null;
  const seriesId = series?.id ?? null;
  const rawSeriesTitle = series?.title_clean ?? series?.title_raw ?? null;
  const seriesTitle = rawSeriesTitle ? rawSeriesTitle.trim() : null;

  const title = (episode.title_clean ?? episode.title_raw ?? "").trim();
  const safeTitle = title.length > 0 ? title : "タイトル未設定";
  const likeCount = videoFile.like_count ?? 0;
  const viewCount = videoFile.view_count ?? 0;

  return {
    id: episode.id,
    title: safeTitle,
    description: episode.description ?? null,
    public_url: videoFile.public_url,
    thumbnail_url: episode.thumbnail_url ?? videoFile.thumbnail_url,
    like_count: likeCount,
    view_count: viewCount,
    created_at: episode.created_at,
    series_id: seriesId,
    series_title: seriesTitle,
    series_slug: (series?.slug ?? null) as string | null,
    episode_number_int: episode.episode_number_int ?? null,
    episode_number_str: episode.episode_number_str ?? null,
    watchPath: null,
    source: "hierarchy",
  };
}

function mergeAndSortVideos(...lists: VideoData[][]): VideoData[] {
  const map = new Map<string, VideoData>();

  lists.flat().forEach((video) => {
    if (!map.has(video.id)) {
      map.set(video.id, video);
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    if (Number.isFinite(bTime) && Number.isFinite(aTime)) {
      return bTime - aTime;
    }
    return 0;
  });
}
