import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchAnimeList } from "@/lib/anime";
import { formatNumberJP } from "@/lib/intl";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";
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

function formatDaysAgo(dateString: string | null | undefined): string {
  if (!dateString) {
    return "投稿日不明";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "投稿日不明";
  }
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) {
    return "今日";
  }
  return `${diffDays}日前`;
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

  const seriesSlug = series?.slug ?? (series?.id ? `series-${series.id}` : null);

  const currentEpisodeIndex = seriesEpisodes.findIndex((episode) => episode.isCurrent);
  const nextEpisode = currentEpisodeIndex !== -1 ? seriesEpisodes[currentEpisodeIndex + 1] ?? null : null;
  const otherEpisodes = seriesEpisodes.filter(
    (episode) => episode.id !== video.id && (!nextEpisode || episode.id !== nextEpisode.id),
  );

  const animeList = await fetchAnimeList();
  const recommendedSeries = animeList
    .filter((item) => item.seriesId && item.seriesId !== (series?.id ?? null))
    .slice(0, 6);

  return (
    <div className="episode-watch">
      <div className="episode-watch__main">
        <div className="episode-watch__player">
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
            seriesSlug={seriesSlug}
            firstEpisodeId={firstEpisode?.id}
          />
        </div>
        <section className="episode-watch__creator" aria-labelledby="episode-watch-creator">
          <h2 id="episode-watch-creator" className="episode-watch__heading">
            クリエイター
          </h2>
          <Link
            href={`/u/${video.owner_id}`}
            className="episode-watch__creator-link"
            aria-label="投稿者のプロフィールページへ"
          >
            <span className="episode-watch__creator-avatar">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" fill sizes="64px" />
              ) : (
                <span>{authorInitial}</span>
              )}
            </span>
            <span className="episode-watch__creator-name">{authorDisplayName}</span>
          </Link>
          {profile?.bio && <p className="episode-watch__creator-bio">{profile.bio}</p>}
          {snsLinks.length > 0 && (
            <ul className="episode-watch__sns" aria-label="SNSリンク">
              {snsLinks.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} target="_blank" rel="noreferrer" aria-label={getSnsLabel(item.key)}>
                    {SnsIcons[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <aside className="episode-watch__sidebar">
        {series && nextEpisode && (
          <section className="episode-watch__next" aria-labelledby="episode-watch-next">
            <h2 id="episode-watch-next" className="episode-watch__heading">
              次のエピソード
            </h2>
            <Link href={`/videos/${nextEpisode.id}`} className="episode-watch__next-card">
              <div className="episode-watch__next-thumb">
                <Image
                  src={resolvePoster(nextEpisode.thumbnail_url, video.thumbnail_url)}
                  alt={`${nextEpisode.title}のサムネイル`}
                  fill
                  className="episode-watch__next-image"
                  sizes="(max-width: 768px) 70vw, 320px"
                />
              </div>
              <div className="episode-watch__next-body">
                <span className="episode-watch__next-number">
                  第{nextEpisode.episodeNumber.toLocaleString()}話
                </span>
                <span className="episode-watch__next-title">{nextEpisode.title}</span>
                <span className="episode-watch__next-meta">
                  {formatDaysAgo(nextEpisode.created_at)}・{formatNumberJP(nextEpisode.view_count)}回再生
                </span>
              </div>
            </Link>
          </section>
        )}

        {series && otherEpisodes.length > 0 && (
          <section className="episode-watch__episodes" aria-labelledby="episode-watch-others">
            <div className="episode-watch__section-header">
              <h2 id="episode-watch-others" className="episode-watch__heading">
                他のエピソード
              </h2>
              {seriesSlug && (
                <Link href={`/series/${seriesSlug}`} className="episode-watch__series-link">
                  シリーズ一覧へ
                </Link>
              )}
            </div>
            <ul className="episode-watch__episode-list">
              {otherEpisodes.map((episode) => {
                const episodeLink = seriesSlug
                  ? `/series/${seriesSlug}?episode=${episode.id}`
                  : `/videos/${episode.id}`;
                return (
                  <li key={episode.id}>
                    <Link href={episodeLink} className="episode-watch__episode-link">
                      <span className="episode-watch__episode-number">
                        第{episode.episodeNumber.toLocaleString()}話
                      </span>
                      <span className="episode-watch__episode-title">{episode.title}</span>
                      <span className="episode-watch__episode-meta">
                        {formatDaysAgo(episode.created_at)}・{formatNumberJP(episode.view_count)}回
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {recommendedSeries.length > 0 && (
          <section className="episode-watch__recommend" aria-labelledby="episode-watch-recommend">
            <h2 id="episode-watch-recommend" className="episode-watch__heading">
              おすすめシリーズ
            </h2>
            <div className="episode-watch__recommend-grid">
              {recommendedSeries.map((item) => {
                const primaryEpisode = item.episodes[0];
                return (
                  <Link key={item.slug} href={`/series/${item.slug}`} className="episode-watch__recommend-card">
                    <div className="episode-watch__recommend-thumb">
                      <Image
                        src={resolvePoster(primaryEpisode?.video.poster, item.thumbnail)}
                        alt={`${item.title}のサムネイル`}
                        fill
                        className="episode-watch__recommend-image"
                        sizes="(max-width: 768px) 60vw, 240px"
                      />
                    </div>
                    <div className="episode-watch__recommend-body">
                      <span className="episode-watch__recommend-title">{item.title}</span>
                      <span className="episode-watch__recommend-meta">
                        全{item.episodes.length.toLocaleString()}話・{formatNumberJP(item.metrics?.views ?? 0)}回
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <Link href={`/report/${video.id}`} className="episode-watch__report">
          不適切な作品を通報する
        </Link>
      </aside>
    </div>
  );
}
