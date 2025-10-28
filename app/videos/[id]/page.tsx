import Link from "next/link";
import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";

import VideoWatch from "./video-watch";

type VideoPageProps = {
  params: { id: string };
};

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

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = params;
  const supabase = createServiceRoleClient();

  const { data: video, error } = await supabase
    .from("videos")
    .select("id, owner_id, series_id, title, description, tags, public_url, like_count, view_count, created_at")
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

  const tags = video.tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

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
          tags={tags ?? []}
        />
      </div>
      <aside className="video-page__meta">
        <div className="video-page__author">
          <h2>投稿者</h2>
          <p className="video-page__author-name">
            {profile?.display_name ?? "匿名クリエイター"}
          </p>
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
