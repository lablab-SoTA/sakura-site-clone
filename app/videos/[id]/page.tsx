import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";

import VideoWatch from "./video-watch";

// SNSアイコンコンポーネント
const SnsIcons = {
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

function getSnsLabel(key: "x" | "instagram" | "youtube"): string {
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

type VideoRecord = {
  id: string;
  owner_id: string;
  series_id: string | null;
  title: string;
  description: string | null;
  tags: string | null;
  public_url: string;
  like_count: number;
  view_count: number;
  width: number | null;
  height: number | null;
  created_at: string;
  thumbnail_url: string | null;
};

type ProfileRecord = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  sns_x: string | null;
  sns_instagram: string | null;
  sns_youtube: string | null;
};

type SeriesRecord = {
  id: string;
  title: string;
  slug?: string | null;
  title_clean?: string | null;
};

type SeriesEpisodeRecord = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
};

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: video, error } = await supabase
    .from("videos")
    .select(
      "id, owner_id, series_id, title, description, tags, public_url, thumbnail_url, like_count, view_count, width, height, created_at",
    )
    .eq("id", id)
    .single<VideoRecord>();

  if (error || !video) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, display_name, bio, avatar_url, sns_x, sns_instagram, sns_youtube")
    .eq("user_id", video.owner_id)
    .maybeSingle<ProfileRecord>();

  // シリーズ情報を取得（slugフィールドが存在しない場合でもエラーにならないように）
  let series: SeriesRecord | null = null;
  if (video.series_id) {
    // まずslugとtitle_cleanを含めて取得を試みる
    const { data: seriesWithSlug, error: slugError } = await supabase
      .from("series")
      .select("id, title, slug, title_clean")
      .eq("id", video.series_id)
      .maybeSingle<SeriesRecord>();
    
    if (seriesWithSlug) {
      series = seriesWithSlug;
    } else if (slugError) {
      // slugフィールドが存在しない場合は、基本フィールドのみで再取得
      const { data: seriesBasic } = await supabase
        .from("series")
        .select("id, title")
        .eq("id", video.series_id)
        .maybeSingle<{ id: string; title: string }>();
      
      if (seriesBasic) {
        series = {
          ...seriesBasic,
          slug: null,
          title_clean: seriesBasic.title,
        };
      }
    }
  }

  const { data: seriesEpisodeRows } = video.series_id
    ? await supabase
        .from("videos")
        .select("id, title, thumbnail_url, view_count, like_count, created_at")
        .eq("series_id", video.series_id)
        .eq("visibility", "PUBLIC")
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: true })
        .returns<SeriesEpisodeRecord[]>()
    : { data: [] as SeriesEpisodeRecord[] };

  const seriesEpisodes = (seriesEpisodeRows ?? []).map((episode, index) => ({
    ...episode,
    episodeNumber: index + 1,
    isCurrent: episode.id === video.id,
  }));
  const currentEpisode = seriesEpisodes.find((episode) => episode.isCurrent);
  const firstEpisode = seriesEpisodes.length > 0 ? seriesEpisodes[0] : null;
  const totalEpisodes = seriesEpisodes.length;

  const tags = video.tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const rawDisplayName = profile?.display_name?.trim();
  const authorDisplayName = rawDisplayName && rawDisplayName.length > 0 ? rawDisplayName : "匿名クリエイター";
  const authorInitial = authorDisplayName.charAt(0).toUpperCase() || "？";

  // SNSリンクを整理
  const snsLinks: Array<{ key: "x" | "instagram" | "youtube"; href: string }> = [];
  if (profile?.sns_x?.trim()) {
    snsLinks.push({ key: "x", href: profile.sns_x.trim() });
  }
  if (profile?.sns_instagram?.trim()) {
    snsLinks.push({ key: "instagram", href: profile.sns_instagram.trim() });
  }
  if (profile?.sns_youtube?.trim()) {
    snsLinks.push({ key: "youtube", href: profile.sns_youtube.trim() });
  }

  return (
    <div className="video-page">
      <div className="video-page__player">
        <VideoWatch
          videoId={video.id}
          src={video.public_url}
          title={video.title}
          description={video.description}
          initialLikeCount={video.like_count}
          initialViewCount={video.view_count}
          ownerId={video.owner_id}
          width={video.width}
          height={video.height}
          tags={tags ?? []}
          thumbnailUrl={video.thumbnail_url}
          episodeNumber={currentEpisode?.episodeNumber}
          episodeCount={totalEpisodes > 0 ? totalEpisodes : undefined}
          seriesId={series?.id}
          seriesSlug={series?.slug ?? (series?.id ? `series-${series.id}` : null)}
          firstEpisodeId={firstEpisode?.id}
        />
        {totalEpisodes > 0 && (
          <section className="video-page__episodes" aria-label="シリーズのエピソード一覧">
            <header className="video-page__episodes-header">
              <span className="video-page__episodes-kicker">EPISODES</span>
              <h2 className="video-page__episodes-title">{series?.title ?? "エピソード"}</h2>
              <p className="video-page__episodes-lede">
                全{totalEpisodes.toLocaleString()}話中の第{(currentEpisode?.episodeNumber ?? 1).toLocaleString()}話を再生中
              </p>
            </header>
            <ol className="video-page__episode-list">
              {seriesEpisodes.map((episode) => (
                <li
                  key={episode.id}
                  className={`video-page__episode-item${episode.isCurrent ? " video-page__episode-item--active" : ""}`}
                >
                  {episode.isCurrent ? (
                    <span className="video-page__episode-link video-page__episode-link--active" aria-current="true">
                      <span className="video-page__episode-number">
                        第{episode.episodeNumber.toLocaleString()}話
                      </span>
                      <span className="video-page__episode-title">{episode.title}</span>
                      <span className="video-page__episode-stats">
                        {episode.view_count.toLocaleString()} 再生・{episode.like_count.toLocaleString()} いいね
                      </span>
                    </span>
                  ) : (
                    <Link href={`/videos/${episode.id}`} className="video-page__episode-link">
                      <span className="video-page__episode-number">
                        第{episode.episodeNumber.toLocaleString()}話
                      </span>
                      <span className="video-page__episode-title">{episode.title}</span>
                      <span className="video-page__episode-stats">
                        {episode.view_count.toLocaleString()} 再生・{episode.like_count.toLocaleString()} いいね
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      <aside className="video-page__meta">
        <div className="video-page__author">
          <h2>投稿者</h2>
          <Link
            href={`/u/${video.owner_id}`}
            className="video-page__author-header"
            aria-label="投稿者のプロフィールページへ"
          >
            <span className="video-page__author-avatar">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" fill sizes="56px" />
              ) : (
                <span>{authorInitial}</span>
              )}
            </span>
            <span className="video-page__author-name">{authorDisplayName}</span>
          </Link>
          {profile?.bio && <p className="video-page__author-bio">{profile.bio}</p>}
          {snsLinks.length > 0 && (
            <ul className="video-page__author-links" aria-label="SNSリンク">
              {snsLinks.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} target="_blank" rel="noreferrer" aria-label={getSnsLabel(item.key)}>
                    {SnsIcons[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {series && (
          <div className="video-page__series">
            <h2>シリーズ</h2>
            {firstEpisode ? (
              <Link
                href={`/videos/${firstEpisode.id}`}
                className="video-page__series-link"
                aria-label="シリーズの第1話へ移動"
              >
                {series.title}
                <span aria-hidden="true">第1話へ</span>
              </Link>
            ) : (
              <p>{series.title}</p>
            )}
          </div>
        )}
        <Link href={`/report/${video.id}`} className="video-page__report">
          不適切な作品を通報する
        </Link>
      </aside>
    </div>
  );
}
