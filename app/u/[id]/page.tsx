import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

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
  public_url: string;
  thumbnail_url: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
  series_id: string | null;
  series_title: string | null;
  episode_number_int: number | null;
  episode_number_str: string | null;
  watchPath: string | null;
  source: "legacy" | "hierarchy";
};

type LegacyVideoRow = {
  id: string;
  title: string;
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
  episode_number_int: number | null;
  episode_number_str: string | null;
  created_at: string;
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

type VideoGroup = {
  key: string;
  title: string;
  videos: VideoData[];
};

function isMissingColumn(error: PostgrestError | null | undefined): boolean {
  return error?.code === "42703";
}

function isMissingTable(error: PostgrestError | null | undefined): boolean {
  return error?.code === "PGRST205";
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
    .select("id, title, public_url, thumbnail_url, like_count, view_count, created_at, series_id, series:series(*)")
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
        .select("id, title, public_url, thumbnail_url, like_count, view_count, created_at, series_id")
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
      "id, title_clean, title_raw, episode_number_int, episode_number_str, created_at, season:seasons(id, name, season_number, series:series(*)), video_file:video_files(id, owner_id, public_url, thumbnail_url, like_count, view_count, visibility, status)",
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
  const socialLinks = [
    profile.sns_x?.trim() ? { href: profile.sns_x.trim(), label: "X (Twitter)" } : null,
    profile.sns_instagram?.trim() ? { href: profile.sns_instagram.trim(), label: "Instagram" } : null,
    profile.sns_youtube?.trim() ? { href: profile.sns_youtube.trim(), label: "YouTube" } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  const bioText = profile.bio?.trim() ?? "";
  const hasBio = bioText.length > 0;

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
          <h1 className="creator-page__title">{profile.display_name ?? "匿名クリエイター"}</h1>
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
          {videoCount > 0 && (
            <p className="creator-page__section-lede">
              {videoCount.toLocaleString()}件の作品が公開されています。
            </p>
          )}
        </div>
        {videoCount > 0 ? (
          <div className="profile-dashboard__panel">
            <div className="profile-dashboard__series-list">
              {groupVideosBySeries(publishedVideos).map((group) => (
                <section key={group.key} className="profile-dashboard__series-group" aria-label={`${group.title}の作品一覧`}>
                  <div className="profile-dashboard__series-header">
                    <h3 className="profile-dashboard__series-title">{group.title}</h3>
                    <span className="profile-dashboard__series-count">{group.videos.length}本</span>
                  </div>
                  <ul className="profile-dashboard__video-list">
                    {group.videos.map((video) => (
                      <li key={video.id} className="profile-dashboard__video-card">
                        {video.watchPath ? (
                          <Link href={video.watchPath}>
                            <VideoListCardContent video={video} />
                          </Link>
                        ) : (
                          <a href={video.public_url} target="_blank" rel="noreferrer">
                            <VideoListCardContent video={video} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <p className="creator-page__empty">まだ公開された作品はありません。</p>
        )}
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
    public_url: video.public_url,
    thumbnail_url: video.thumbnail_url,
    like_count: video.like_count,
    view_count: video.view_count,
    created_at: video.created_at,
    series_id: video.series_id,
    series_title: seriesTitle,
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
    public_url: videoFile.public_url,
    thumbnail_url: videoFile.thumbnail_url,
    like_count: likeCount,
    view_count: viewCount,
    created_at: episode.created_at,
    series_id: seriesId,
    series_title: seriesTitle,
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

function groupVideosBySeries(videos: VideoData[]): VideoGroup[] {
  const groups: VideoGroup[] = [];
  const map = new Map<string, VideoGroup>();

  videos.forEach((video) => {
    const hasSeries = Boolean(video.series_id);
    const key = hasSeries ? `series-${video.series_id}` : "standalone";
    const title = hasSeries ? video.series_title ?? "シリーズ名未設定" : "シリーズ未設定";

    if (!map.has(key)) {
      const group: VideoGroup = { key, title, videos: [] };
      map.set(key, group);
      groups.push(group);
    }

    map.get(key)?.videos.push(video);
  });

  return groups;
}

function VideoListCardContent({ video }: { video: VideoData }) {
  return (
    <>
      <div className="profile-dashboard__video-thumb" aria-hidden>
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt=""
            fill
            sizes="(max-width: 720px) 50vw, 240px"
            className="profile-dashboard__video-image"
          />
        ) : (
          <span className="profile-dashboard__video-placeholder">サムネイルなし</span>
        )}
      </div>
      <div className="profile-dashboard__video-body">
        <h4 className="profile-dashboard__video-title">{video.title}</h4>
      </div>
    </>
  );
}
