import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";

import VideoWatch from "./video-watch";

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
      "id, owner_id, series_id, title, description, tags, public_url, like_count, view_count, width, height, created_at",
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

  const { data: series } = video.series_id
    ? await supabase
        .from("series")
        .select("id, title")
        .eq("id", video.series_id)
        .maybeSingle<SeriesRecord>()
    : { data: null };

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
  const totalEpisodes = seriesEpisodes.length;

  const tags = video.tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const rawDisplayName = profile?.display_name?.trim();
  const authorDisplayName = rawDisplayName && rawDisplayName.length > 0 ? rawDisplayName : "匿名クリエイター";
  const authorInitial = authorDisplayName.charAt(0).toUpperCase() || "？";

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
          episodeNumber={currentEpisode?.episodeNumber}
          episodeCount={totalEpisodes > 0 ? totalEpisodes : undefined}
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
          <ul className="video-page__author-links">
            {profile?.sns_x && (
              <li>
                <Link href={profile.sns_x} target="_blank" rel="noreferrer">
                  X (Twitter)
                </Link>
              </li>
            )}
            {profile?.sns_instagram && (
              <li>
                <Link href={profile.sns_instagram} target="_blank" rel="noreferrer">
                  Instagram
                </Link>
              </li>
            )}
            {profile?.sns_youtube && (
              <li>
                <Link href={profile.sns_youtube} target="_blank" rel="noreferrer">
                  YouTube
                </Link>
              </li>
            )}
          </ul>
        </div>
        {series && (
          <div className="video-page__series">
            <h2>シリーズ</h2>
            <p>{series.title}</p>
          </div>
        )}
        <Link href={`/report/${video.id}`} className="video-page__report">
          不適切な作品を通報する
        </Link>
      </aside>
    </div>
  );
}
