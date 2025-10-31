"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { PostgrestError } from "@supabase/supabase-js";

import ProfileForm from "./profile-form";
import CreatorContentTabs, { type CreatorSeriesItem } from "@/components/creator/CreatorContentTabs";
import type { FeedViewerItem } from "@/components/feed/FeedViewer";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type ProfileData = {
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
  episode_number_int?: number | null;
  episode_number_str?: string | null;
  watchPath: string | null;
  source: "legacy" | "hierarchy";
  width: number | null;
  height: number | null;
  orientation: "portrait" | "landscape" | "square" | "unknown";
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
  width: number | null;
  height: number | null;
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
    width: number | null;
    height: number | null;
  } | null;
};

type VideoGroup = {
  key: string;
  title: string;
  videos: VideoData[];
};

type LegacyLikeRow = {
  created_at: string;
  video: LegacyVideoRow | null;
};

type EpisodeLikeRow = {
  created_at: string;
  episode: EpisodeRow | null;
};

type ViewState = "loading" | "signedOut" | "ready";
type ActiveTab = "published" | "liked";

const snsIcons: Record<"x" | "instagram" | "youtube", ReactNode> = {
  x: (
    <svg viewBox="0 0 24 24" aria-hidden width="20" height="20">
      <path
        fill="currentColor"
        d="M3.6 2h5.08l4.32 6.52L17.84 2H21l-7.04 9.4 7.4 10.6h-5.08l-4.64-6.96L6.24 22H3l7.44-9.92z"
      />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden width="20" height="20">
      <path
        fill="currentColor"
        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11zm0 2a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zm6.25-2.75a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 0 1 2.5 0z"
      />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" aria-hidden width="20" height="20">
      <path
        fill="currentColor"
        d="M21.8 7.2a2.3 2.3 0 0 0-1.6-1.64C18.8 5 12 5 12 5s-6.8 0-8.2.56A2.3 2.3 0 0 0 2.2 7.2A23 23 0 0 0 2 12a23 23 0 0 0 .2 4.8a2.3 2.3 0 0 0 1.6 1.64C5.2 19 12 19 12 19s6.8 0 8.2-.56A2.3 2.3 0 0 0 21.8 16.8A23 23 0 0 0 22 12a23 23 0 0 0-.2-4.8zM10 15.5v-7l6 3.5z"
      />
    </svg>
  ),
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

export default function ProfileDashboard() {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [publishedVideos, setPublishedVideos] = useState<VideoData[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoData[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("published");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isVideoManagerOpen, setIsVideoManagerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const loadData = useCallback(
    async (targetUserId: string) => {
      setError(null);

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url, sns_x, sns_instagram, sns_youtube")
        .eq("user_id", targetUserId)
        .maybeSingle<ProfileData>();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileRow ?? null);

      // 旧 videos テーブルの取得
      let legacyVideoRows: LegacyVideoRow[] | null = null;
      let legacyVideoError: PostgrestError | null | undefined;

      const legacyVideoQuery = await supabase
        .from("videos")
        .select(
          "id, title, description, public_url, thumbnail_url, like_count, view_count, created_at, series_id, width, height, series:series(*)",
        )
        .eq("owner_id", targetUserId)
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
            .select("id, title, description, public_url, thumbnail_url, like_count, view_count, created_at, series_id, width, height")
            .eq("owner_id", targetUserId)
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

      let legacyLikeRows: LegacyLikeRow[] | null = null;
      let legacyLikeError: PostgrestError | null | undefined;

      const legacyLikesQuery = await supabase
        .from("likes")
        .select(
          "created_at, video:videos(id, title, description, public_url, thumbnail_url, like_count, view_count, created_at, series_id, width, height, series:series(*))",
        )
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .returns<LegacyLikeRow[]>();

      legacyLikeRows = legacyLikesQuery.data ?? null;
      legacyLikeError = legacyLikesQuery.error;

      if (legacyLikeError) {
        if (isMissingColumn(legacyLikeError)) {
          const fallbackLikes = await supabase
            .from("likes")
            .select("created_at, video:videos(id, title, description, public_url, thumbnail_url, like_count, view_count, created_at, series_id, width, height)")
            .eq("user_id", targetUserId)
            .order("created_at", { ascending: false })
            .returns<LegacyLikeRow[]>();

          if (fallbackLikes.error) {
            throw fallbackLikes.error;
          }

          legacyLikeRows = (fallbackLikes.data ?? []).map((row) =>
            row.video ? { ...row, video: { ...row.video, series: null } } : row,
          );
        } else {
          throw legacyLikeError;
        }
      }

      const legacyLiked = (legacyLikeRows ?? [])
        .map((item) => item.video)
        .filter((video): video is LegacyVideoRow => !!video)
        .map(normalizeLegacyVideoRow);

      // 新しい episodes / episode_likes テーブル（存在しない環境では空として扱う）
      const hierarchyPublished: VideoData[] = [];
      const { data: episodeRows, error: episodeError } = await supabase
        .from("episodes")
        .select(
          "id, title_clean, title_raw, description, thumbnail_url, tags, episode_number_int, episode_number_str, created_at, season:seasons(id, name, season_number, series:series(*)), video_file:video_files(id, owner_id, public_url, thumbnail_url, like_count, view_count, visibility, status, width, height)",
        )
        .eq("video_file.owner_id", targetUserId)
        .not("video_file", "is", null)
        .order("created_at", { ascending: false })
        .returns<EpisodeRow[]>();

      if (!episodeError) {
        hierarchyPublished.push(
          ...((episodeRows ?? []).map(normalizeEpisodeRow).filter((video): video is VideoData => video !== null)),
        );
      } else if (!isMissingTable(episodeError)) {
        console.warn("新しい階層データの取得に失敗しました", episodeError);
      }

      const hierarchyLiked: VideoData[] = [];
      const { data: episodeLikeRows, error: episodeLikeError } = await supabase
        .from("episode_likes")
        .select(
          "created_at, episode:episodes(id, title_clean, title_raw, description, thumbnail_url, tags, episode_number_int, episode_number_str, created_at, season:seasons(id, name, season_number, series:series(*)), video_file:video_files(id, owner_id, public_url, thumbnail_url, like_count, view_count, visibility, status, width, height))",
        )
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .returns<EpisodeLikeRow[]>();

      if (!episodeLikeError) {
        hierarchyLiked.push(
          ...((episodeLikeRows ?? [])
            .map((item) => item.episode)
            .filter((episode): episode is EpisodeRow => !!episode)
            .map(normalizeEpisodeRow)
            .filter((video): video is VideoData => video !== null)),
        );
      } else if (!isMissingTable(episodeLikeError)) {
        console.warn("新しい階層データのいいね取得に失敗しました", episodeLikeError);
      }

      setPublishedVideos(mergeAndSortVideos(legacyPublished, hierarchyPublished));
      setLikedVideos(mergeAndSortVideos(legacyLiked, hierarchyLiked));
    },
    [supabase],
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setViewState("loading");
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionError) {
        console.error("セッションの取得に失敗しました", sessionError);
        setError("ログイン状態の確認に失敗しました。再度お試しください。");
        setViewState("signedOut");
        return;
      }

      if (!data.session) {
        setViewState("signedOut");
        return;
      }

      const targetUserId = data.session.user.id;
      setUserId(targetUserId);
      setJoinedAt(data.session.user.created_at ?? null);

      try {
        await loadData(targetUserId);
        setViewState("ready");
      } catch (unknownError) {
        console.error("プロフィール情報の取得に失敗しました", unknownError);
        setError("プロフィール情報の取得に失敗しました。時間をおいて再度お試しください。");
        setViewState("ready");
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [loadData, supabase]);

  const handleOpenEditor = () => {
    setIsVideoManagerOpen(false);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
  };

  const handleOpenVideoManager = () => {
    setIsEditorOpen(false);
    setIsVideoManagerOpen(true);
  };

  const handleCloseVideoManager = () => {
    setIsVideoManagerOpen(false);
  };

  const handleVideoLibraryRefreshed = useCallback(async () => {
    if (!userId) {
      return;
    }
    await loadData(userId);
  }, [loadData, userId]);

  const handleProfileSaved = async () => {
    if (!userId) {
      return;
    }
    await loadData(userId);
  };

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    setIsLoggingOut(true);
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    setIsLoggingOut(false);

    if (signOutError) {
      setLogoutError("ログアウトに失敗しました。時間をおいて再度お試しください。");
      return;
    }

    router.replace("/auth/login");
  }, [router, supabase]);

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === activeTab) {
      return;
    }
    setActiveTab(tab);
  };

  const getPanelClassName = (tab: ActiveTab) => {
    const isActive = activeTab === tab;
    const baseClass = "profile-dashboard__panel profile-dashboard__panel--animated";
    return isActive ? `${baseClass} profile-dashboard__panel--active` : `${baseClass} profile-dashboard__panel--inactive`;
  };

  const displayName = useMemo(() => {
    const raw = profile?.display_name ?? "";
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : "匿名クリエイター";
  }, [profile]);

  const snsLinks = useMemo(() => {
    if (!profile) {
      return [];
    }

    const links: Array<{ key: "x" | "instagram" | "youtube"; href: string }> = [];

    if (profile.sns_x) {
      links.push({ key: "x", href: profile.sns_x });
    }

    if (profile.sns_instagram) {
      links.push({ key: "instagram", href: profile.sns_instagram });
    }

    if (profile.sns_youtube) {
      links.push({ key: "youtube", href: profile.sns_youtube });
    }

    return links;
  }, [profile]);

  const formattedJoinedAt = useMemo(() => {
    if (!joinedAt) {
      return null;
    }
    const date = new Date(joinedAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, [joinedAt]);

  const totalViewCount = useMemo(() => {
    return publishedVideos.reduce((total, video) => {
      return total + (video.view_count ?? 0);
    }, 0);
  }, [publishedVideos]);

  const feedItems = useMemo<FeedViewerItem[]>(() => {
    return publishedVideos
      .filter((video) => isPortraitVideo(video))
      .map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description ?? "",
        src: video.public_url,
        poster: resolvePoster(video.thumbnail_url, null),
        creatorName: displayName,
        creatorId: userId,
        creatorAvatar: profile?.avatar_url ?? null,
        views: video.view_count ?? 0,
        likes: video.like_count ?? 0,
        createdAt: video.created_at,
        score: calculateFeedScore(video.view_count ?? 0, video.like_count ?? 0, video.created_at),
      }))
      .sort((a, b) => b.score - a.score);
  }, [displayName, profile?.avatar_url, publishedVideos, userId]);

  const seriesItems = useMemo<CreatorSeriesItem[]>(() => {
    const groups = new Map<string, { slug: string; title: string; videos: VideoData[] }>();

    publishedVideos.forEach((video) => {
      if (isPortraitVideo(video)) {
        return;
      }

      const hasSeries = Boolean(video.series_id);
      const slug = hasSeries
        ? video.series_slug ?? `series-${video.series_id}`
        : `video-${video.id}`;
      const title = hasSeries ? video.series_title ?? "シリーズ名未設定" : video.title;

      const existing = groups.get(slug);
      if (existing) {
        existing.videos.push(video);
      } else {
        groups.set(slug, {
          slug,
          title,
          videos: [video],
        });
      }
    });

    return Array.from(groups.values())
      .map((group) => {
        const sorted = group.videos
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = sorted[0];
        const totalViewsGroup = group.videos.reduce((acc, video) => acc + (video.view_count ?? 0), 0);
        return {
          slug: group.slug,
          title: group.title,
          poster: resolvePoster(latest?.thumbnail_url ?? null, null),
          episodeCount: group.videos.length,
          updatedAt: latest?.created_at ?? null,
          views: totalViewsGroup,
        } satisfies CreatorSeriesItem;
      })
      .sort((a, b) => b.views - a.views);
  }, [publishedVideos]);

  const totalLikeCount = useMemo(() => {
    return publishedVideos.reduce((total, video) => {
      return total + (video.like_count ?? 0);
    }, 0);
  }, [publishedVideos]);

  if (viewState === "loading") {
    return (
      <div className="profile-dashboard__shell" role="status">
        <p className="profile-dashboard__message">プロフィール情報を読み込んでいます...</p>
      </div>
    );
  }

  if (viewState === "signedOut") {
    const redirectTo = encodeURIComponent("/settings/profile");
    return (
      <div className="profile-dashboard__shell">
        <div className="auth-required">
          <p className="auth-required__message">プロフィールを表示するにはログインが必要です。</p>
          <div className="auth-required__actions">
            <Link href={`/auth/login?redirectTo=${redirectTo}`} className="button">
              ログイン
            </Link>
            <Link href={`/auth/register?redirectTo=${redirectTo}`} className="button button--ghost">
              新規登録
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-dashboard">
      <section className="profile-dashboard__header">
        <div className="profile-dashboard__header-content">
          <div className="profile-dashboard__meta">
            <div className="profile-dashboard__header-row">
              <button
                type="button"
                className="profile-dashboard__avatar"
                onClick={handleOpenEditor}
                aria-label="プロフィールを編集"
              >
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="プロフィール画像" fill sizes="96px" />
                ) : (
                  <span>{displayName.trim().charAt(0).toUpperCase() || "?"}</span>
                )}
              </button>
              <div className="profile-dashboard__identity">
                <h1 className="profile-dashboard__name">{displayName}</h1>
              </div>
              <div className="profile-dashboard__stats-row">
                <p className="profile-dashboard__stat-line">
                  {formattedJoinedAt && <span>登録日 {formattedJoinedAt}</span>}
                  <span>総再生数 {totalViewCount.toLocaleString()}</span>
                  <span>いいね {totalLikeCount.toLocaleString()}</span>
                </p>
                {snsLinks.length > 0 && (
                  <ul className="profile-dashboard__sns" aria-label="SNSリンク">
                    {snsLinks.map((item) => (
                      <li key={item.key}>
                        <Link href={item.href} target="_blank" rel="noreferrer" aria-label={getSnsLabel(item.key)}>
                          {snsIcons[item.key]}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {profile?.bio ? (
              <p className="profile-dashboard__bio">{profile.bio}</p>
            ) : (
              <p className="profile-dashboard__bio profile-dashboard__bio--muted">自己紹介はまだ設定されていません。</p>
            )}
            <div className="profile-dashboard__actions">
              <button type="button" className="button profile-dashboard__edit-button" onClick={handleOpenEditor}>
                プロフィールを変更
              </button>
              <button
                type="button"
                className="profile-dashboard__video-button"
                onClick={handleOpenVideoManager}
              >
                動画を編集
              </button>
            </div>
          </div>
        </div>
        {error && <p className="profile-dashboard__error">{error}</p>}
      </section>

      <section className="profile-dashboard__collections">
        <div className="profile-dashboard__tabs" role="tablist" aria-label="動画一覧切り替え">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "published"}
            aria-controls="profile-dashboard-tabpanel-published"
            className={`profile-dashboard__tab${activeTab === "published" ? " profile-dashboard__tab--active" : ""}`}
            onClick={() => handleTabChange("published")}
          >
            公開した作品
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "liked"}
            aria-controls="profile-dashboard-tabpanel-liked"
            className={`profile-dashboard__tab${activeTab === "liked" ? " profile-dashboard__tab--active" : ""}`}
            onClick={() => handleTabChange("liked")}
          >
            いいねした作品
          </button>
        </div>
        <div className="profile-dashboard__panels">
          <div
            className={getPanelClassName("published")}
            role="tabpanel"
            id="profile-dashboard-tabpanel-published"
            aria-hidden={activeTab !== "published"}
            tabIndex={activeTab === "published" ? 0 : -1}
          >
            {publishedVideos.length > 0 ? (
              <CreatorContentTabs feedItems={feedItems} seriesItems={seriesItems} />
            ) : (
              <p className="profile-dashboard__empty">公開した作品はまだありません。</p>
            )}
          </div>
          <div
            className={getPanelClassName("liked")}
            role="tabpanel"
            id="profile-dashboard-tabpanel-liked"
            aria-hidden={activeTab !== "liked"}
            tabIndex={activeTab === "liked" ? 0 : -1}
          >
            {likedVideos.length > 0 ? (
              <VideoList videos={likedVideos} />
            ) : (
              <p className="profile-dashboard__empty">いいねした作品はまだありません。</p>
            )}
          </div>
        </div>
      </section>

      <section className="profile-dashboard__logout" aria-label="アカウント操作">
        {logoutError && <p className="profile-dashboard__logout-error">{logoutError}</p>}
        <button
          type="button"
          className="button button--ghost profile-dashboard__logout-button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "ログアウト中..." : "ログアウト"}
        </button>
      </section>

      {isEditorOpen && (
        <div className="profile-dashboard__modal" role="dialog" aria-modal="true" aria-label="プロフィール編集">
          <div className="profile-dashboard__modal-panel">
            <div className="profile-dashboard__modal-header">
              <h2>プロフィールを編集</h2>
              <button type="button" className="profile-dashboard__modal-close" onClick={handleCloseEditor}>
                閉じる
              </button>
            </div>
            <ProfileForm
              onSaved={async () => {
                await handleProfileSaved();
                handleCloseEditor();
              }}
            />
          </div>
        </div>
      )}
      {isVideoManagerOpen && (
        <VideoManagerModal
          videos={publishedVideos}
          supabase={supabase}
          onClose={handleCloseVideoManager}
          onRefresh={handleVideoLibraryRefreshed}
        />
      )}
    </div>
  );
}

function detectVideoOrientationFromDimensions(
  width: number | null,
  height: number | null,
): VideoData["orientation"] {
  if (!width || !height || width <= 0 || height <= 0) {
    return "unknown";
  }
  if (height > width * 1.05) {
    return "portrait";
  }
  if (width > height * 1.05) {
    return "landscape";
  }
  return "square";
}

function isPortraitVideo(video: VideoData): boolean {
  if (video.orientation === "portrait") {
    return true;
  }

  if (video.orientation === "landscape") {
    return false;
  }

  if (video.orientation === "square") {
    return video.series_id === null;
  }

  if (video.width && video.height) {
    if (video.height > video.width * 1.02) {
      return true;
    }
    if (video.width > video.height * 1.02) {
      return false;
    }
  }

  // 寸法情報が無い旧データはシリーズ紐付きかどうかで推定する
  return video.series_id === null;
}

function normalizeLegacyVideoRow(video: LegacyVideoRow): VideoData {
  const rawSeriesTitle = video.series?.title_clean ?? video.series?.title_raw ?? video.series?.title ?? null;
  const seriesTitle = rawSeriesTitle ? rawSeriesTitle.trim() : null;
  const width = video.width ?? null;
  const height = video.height ?? null;
  const orientation = detectVideoOrientationFromDimensions(width, height);
  const seriesSlug = video.series?.slug ?? (video.series_id ? `series-${video.series_id}` : null);

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
    series_slug: seriesSlug,
    episode_number_int: null,
    episode_number_str: null,
    watchPath: `/videos/${video.id}`,
    source: "legacy",
    width,
    height,
    orientation,
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
  const width = videoFile.width ?? null;
  const height = videoFile.height ?? null;
  const orientation = detectVideoOrientationFromDimensions(width, height);
  const seriesSlug = series?.slug ?? (seriesId ? `series-${seriesId}` : null);
  const thumbnailUrl = episode.thumbnail_url ?? videoFile.thumbnail_url ?? null;
  return {
    id: episode.id,
    title: safeTitle,
    description: episode.description ?? null,
    public_url: videoFile.public_url,
    thumbnail_url: thumbnailUrl,
    like_count: likeCount,
    view_count: viewCount,
    created_at: episode.created_at,
    series_id: seriesId,
    series_title: seriesTitle,
    series_slug: seriesSlug,
    episode_number_int: episode.episode_number_int ?? null,
    episode_number_str: episode.episode_number_str ?? null,
    watchPath: null,
    source: "hierarchy",
    width,
    height,
    orientation,
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
    return Number.isFinite(bTime) && Number.isFinite(aTime) ? bTime - aTime : 0;
  });
}

function VideoList({ videos }: { videos: VideoData[] }) {
  const groups = groupVideosBySeries(videos);

  return (
    <div className="profile-dashboard__series-list">
      {groups.map((group) => (
        <section key={group.key} className="profile-dashboard__series-group" aria-label={`${group.title}の動画一覧`}>
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
  );
}

function groupVideosBySeries(videos: VideoData[]): VideoGroup[] {
  const groups: VideoGroup[] = [];
  const map = new Map<string, VideoGroup>();

  videos.forEach((video) => {
    const hasSeries = Boolean(video.series_id);
    const key = hasSeries ? `series-${video.series_id}` : "standalone";
    const title = hasSeries
      ? video.series_title ?? "シリーズ名未設定"
      : "シリーズ未設定";

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
        <p>
          {video.view_count.toLocaleString()} 再生・{video.like_count.toLocaleString()} いいね
        </p>
      </div>
    </>
  );
}

type VideoManagerModalProps = {
  videos: VideoData[];
  supabase: ReturnType<typeof getBrowserSupabaseClient>;
  onClose: () => void;
  onRefresh: () => Promise<void>;
};

type LegacyVideoDetailRow = {
  title: string;
  description: string | null;
  thumbnail_url: string | null;
};

type EpisodeVideoDetailRow = {
  title_raw: string | null;
  title_clean: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_file: {
    thumbnail_url: string | null;
  } | null;
};

function VideoManagerModal({ videos, supabase, onClose, onRefresh }: VideoManagerModalProps) {
  const [mode, setMode] = useState<"list" | "edit" | "delete">("list");
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [formState, setFormState] = useState({ title: "", description: "", thumbnailUrl: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [videos]);

  const resetSelection = () => {
    setSelectedVideo(null);
    setFormState({ title: "", description: "", thumbnailUrl: "" });
    setMode("list");
  };

  const fetchVideoDetail = useCallback(
    async (video: VideoData) => {
      if (video.source === "legacy") {
        const { data, error: detailError } = await supabase
          .from("videos")
          .select("title, description, thumbnail_url")
          .eq("id", video.id)
          .maybeSingle<LegacyVideoDetailRow>();

        if (detailError || !data) {
          throw detailError ?? new Error("動画情報が見つかりませんでした");
        }

        return {
          title: data.title,
          description: data.description ?? "",
          thumbnailUrl: data.thumbnail_url ?? video.thumbnail_url ?? "",
        };
      }

      const { data, error: episodeDetailError } = await supabase
        .from("episodes")
        .select("title_raw, title_clean, description, thumbnail_url, video_file:video_files(thumbnail_url)")
        .eq("id", video.id)
        .maybeSingle<EpisodeVideoDetailRow>();

      if (episodeDetailError || !data) {
        throw episodeDetailError ?? new Error("動画情報が見つかりませんでした");
      }

      const title = data.title_clean ?? data.title_raw ?? video.title;
      const thumbnail = data.thumbnail_url ?? data.video_file?.thumbnail_url ?? video.thumbnail_url ?? "";

      return {
        title,
        description: data.description ?? "",
        thumbnailUrl: thumbnail,
      };
    },
    [supabase],
  );

  const handleStartEdit = useCallback(
    async (video: VideoData) => {
      setError(null);
      setFeedback(null);
      setSelectedVideo(video);
      setMode("edit");
      setIsLoadingDetail(true);
      try {
        const detail = await fetchVideoDetail(video);
        setFormState(detail);
      } catch (unknownError) {
        console.error("動画詳細の取得に失敗しました", unknownError);
        setError("動画の詳細取得に失敗しました。時間をおいて再度お試しください。");
        resetSelection();
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [fetchVideoDetail],
  );

  const handleStartDelete = useCallback((video: VideoData) => {
    setError(null);
    setFeedback(null);
    setSelectedVideo(video);
    setMode("delete");
  }, []);

  const handleFieldChange = useCallback(
    (key: "title" | "description" | "thumbnailUrl") =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setFormState((prev) => ({ ...prev, [key]: value }));
      },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedVideo) {
        return;
      }

      const trimmedTitle = formState.title.trim();
      if (trimmedTitle.length === 0) {
        setError("タイトルを入力してください。");
        return;
      }

      const trimmedDescription = formState.description.trim();
      const trimmedThumbnail = formState.thumbnailUrl.trim();

      const safeDescription = trimmedDescription.length > 0 ? trimmedDescription : null;
      const safeThumbnail = trimmedThumbnail.length > 0 ? trimmedThumbnail : null;

      setIsBusy(true);
      setError(null);

      try {
        if (selectedVideo.source === "legacy") {
          const { error: updateError } = await supabase
            .from("videos")
            .update({
              title: trimmedTitle,
              description: safeDescription,
              thumbnail_url: safeThumbnail,
            })
            .eq("id", selectedVideo.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: episodeUpdateError } = await supabase
            .from("episodes")
            .update({
              title_raw: trimmedTitle,
              title_clean: trimmedTitle,
              description: safeDescription,
              thumbnail_url: safeThumbnail,
            })
            .eq("id", selectedVideo.id);

          if (episodeUpdateError) {
            throw episodeUpdateError;
          }

          const { error: fileUpdateError } = await supabase
            .from("video_files")
            .update({
              thumbnail_url: safeThumbnail,
            })
            .eq("episode_id", selectedVideo.id);

          if (fileUpdateError) {
            throw fileUpdateError;
          }
        }

        await onRefresh();
        setFeedback("動画情報を更新しました。");
        resetSelection();
      } catch (unknownError) {
        console.error("動画情報の更新に失敗しました", unknownError);
        setError("動画情報の更新に失敗しました。時間をおいて再度お試しください。");
      } finally {
        setIsBusy(false);
      }
    },
    [formState.description, formState.thumbnailUrl, formState.title, onRefresh, selectedVideo, supabase],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedVideo) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("認証情報の取得に失敗しました。再度ログインし直してください。");
      }

      const endpoint =
        selectedVideo.source === "legacy" ? `/api/videos/${selectedVideo.id}` : `/api/episodes/${selectedVideo.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "動画の削除に失敗しました。時間をおいて再度お試しください。");
      }

      await onRefresh();
      setFeedback("動画を削除しました。");
      resetSelection();
    } catch (unknownError) {
      console.error("動画の削除に失敗しました", unknownError);
      const message =
        unknownError instanceof Error ? unknownError.message : "動画の削除に失敗しました。時間をおいて再度お試しください。";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }, [onRefresh, selectedVideo, supabase]);

  const handleBackToList = useCallback(() => {
    setError(null);
    resetSelection();
  }, []);

  const renderList = () => {
    if (sortedVideos.length === 0) {
      return <p className="video-manager__empty">公開済みの動画がまだありません。</p>;
    }

    return (
      <ul className="video-manager__list">
        {sortedVideos.map((video) => {
          const isFeed = isPortraitVideo(video);
          const badgeLabel = isFeed ? "フィード" : "シリーズ";
          const publishedAt = new Date(video.created_at).toLocaleDateString("ja-JP");

          return (
            <li key={video.id} className="video-manager__item">
              <div className="video-manager__thumb" aria-hidden>
                {video.thumbnail_url ? (
                  <Image src={video.thumbnail_url} alt="" fill sizes="120px" className="video-manager__image" />
                ) : (
                  <span className="video-manager__thumb-placeholder">サムネイルなし</span>
                )}
              </div>
              <div className="video-manager__meta">
                <div className="video-manager__meta-header">
                  <span className={`video-manager__badge${isFeed ? " video-manager__badge--feed" : " video-manager__badge--series"}`}>
                    {badgeLabel}
                  </span>
                  {video.series_title && !isFeed && (
                    <span className="video-manager__series">{video.series_title}</span>
                  )}
                </div>
                <h3 className="video-manager__title">{video.title}</h3>
                <p className="video-manager__stats">
                  {video.view_count.toLocaleString()} 再生・{video.like_count.toLocaleString()} いいね
                </p>
                <p className="video-manager__date">公開日: {publishedAt}</p>
              </div>
              <div className="video-manager__actions">
                <button type="button" className="video-manager__action" onClick={() => handleStartEdit(video)}>
                  編集
                </button>
                <button
                  type="button"
                  className="video-manager__action video-manager__action--danger"
                  onClick={() => handleStartDelete(video)}
                >
                  削除
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderEdit = () => {
    if (!selectedVideo) {
      return null;
    }

    if (isLoadingDetail) {
      return <p className="video-manager__loading">動画情報を読み込んでいます...</p>;
    }

    return (
      <form className="video-manager__form" onSubmit={handleSubmit}>
        <div className="video-manager__field">
          <label htmlFor="video-manager-title">タイトル</label>
          <input
            id="video-manager-title"
            className="video-manager__input"
            value={formState.title}
            onChange={handleFieldChange("title")}
            placeholder="動画のタイトル"
            required
            disabled={isBusy}
          />
        </div>
        <div className="video-manager__field">
          <label htmlFor="video-manager-description">説明</label>
          <textarea
            id="video-manager-description"
            className="video-manager__textarea"
            value={formState.description}
            onChange={handleFieldChange("description")}
            placeholder="視聴者向けの説明文"
            rows={5}
            disabled={isBusy}
          />
        </div>
        <div className="video-manager__field">
          <label htmlFor="video-manager-thumbnail">サムネイルURL</label>
          <input
            id="video-manager-thumbnail"
            className="video-manager__input"
            value={formState.thumbnailUrl}
            onChange={handleFieldChange("thumbnailUrl")}
            placeholder="https://..."
            disabled={isBusy}
          />
          <p className="video-manager__hint">空欄にすると既存のサムネイルURLは削除されます。</p>
        </div>
        <div className="video-manager__form-actions">
          <button type="button" className="video-manager__action video-manager__action--ghost" onClick={handleBackToList}>
            一覧に戻る
          </button>
          <button type="submit" className="video-manager__action video-manager__action--primary" disabled={isBusy}>
            {isBusy ? "保存中..." : "変更を保存"}
          </button>
        </div>
      </form>
    );
  };

  const renderDelete = () => {
    if (!selectedVideo) {
      return null;
    }

    return (
      <div className="video-manager__confirm">
        <p>
          <strong>{selectedVideo.title}</strong>
          を削除しますか？この操作は元に戻せません。
        </p>
        <div className="video-manager__form-actions">
          <button type="button" className="video-manager__action video-manager__action--ghost" onClick={handleBackToList}>
            キャンセル
          </button>
          <button
            type="button"
            className="video-manager__action video-manager__action--danger"
            onClick={handleDelete}
            disabled={isBusy}
          >
            {isBusy ? "削除中..." : "削除する"}
          </button>
        </div>
      </div>
    );
  };

  let body: ReactNode;
  if (mode === "edit") {
    body = renderEdit();
  } else if (mode === "delete") {
    body = renderDelete();
  } else {
    body = renderList();
  }

  return (
    <div className="profile-dashboard__modal" role="dialog" aria-modal="true" aria-label="動画の管理">
      <div className="profile-dashboard__modal-panel profile-dashboard__modal-panel--wide">
        <div className="profile-dashboard__modal-header">
          <h2>動画を管理</h2>
          <button type="button" className="profile-dashboard__modal-close" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="video-manager">
          {feedback && <p className="video-manager__feedback">{feedback}</p>}
          {error && <p className="video-manager__error">{error}</p>}
          {body}
        </div>
      </div>
    </div>
  );
}

function getSnsLabel(key: "x" | "instagram" | "youtube") {
  switch (key) {
    case "x":
      return "X を開く";
    case "instagram":
      return "Instagram を開く";
    case "youtube":
      return "YouTube を開く";
    default:
      return "外部リンクを開く";
  }
}
