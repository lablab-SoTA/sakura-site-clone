import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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

type VideoRecord = {
  id: string;
  title: string;
  public_url: string;
  thumbnail_url: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
};

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

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, public_url, thumbnail_url, like_count, view_count, created_at")
    .eq("owner_id", id)
    .order("created_at", { ascending: false })
    .returns<VideoRecord[]>();

  return (
    <div className="creator-page">
      <header className="creator-page__header">
        <div className="creator-page__avatar" aria-hidden>
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="96px" unoptimized />
          ) : (
            <span>{profile.display_name?.[0] ?? "?"}</span>
          )}
        </div>
        <div>
          <h1 className="creator-page__title">{profile.display_name ?? "匿名クリエイター"}</h1>
          {profile.bio && <p className="creator-page__bio">{profile.bio}</p>}
          <ul className="creator-page__links">
            {profile.sns_x && (
              <li>
                <Link href={profile.sns_x} target="_blank" rel="noreferrer">
                  X (Twitter)
                </Link>
              </li>
            )}
            {profile.sns_instagram && (
              <li>
                <Link href={profile.sns_instagram} target="_blank" rel="noreferrer">
                  Instagram
                </Link>
              </li>
            )}
            {profile.sns_youtube && (
              <li>
                <Link href={profile.sns_youtube} target="_blank" rel="noreferrer">
                  YouTube
                </Link>
              </li>
            )}
          </ul>
        </div>
      </header>
      <section className="creator-page__videos">
        <h2>公開中の作品</h2>
        {videos && videos.length > 0 ? (
          <ul className="creator-page__grid">
            {videos.map((video) => (
              <li key={video.id} className="creator-page__card">
                <Link href={`/videos/${video.id}`}>
                  <div className="creator-page__thumb" aria-hidden>
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt=""
                        fill
                        sizes="(max-width: 600px) 100vw, 280px"
                        unoptimized
                      />
                    ) : (
                      <div className="creator-page__thumb-placeholder">動画</div>
                    )}
                  </div>
                  <h3>{video.title}</h3>
                  <p>{video.view_count.toLocaleString()} 再生 • {video.like_count.toLocaleString()} いいね</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="creator-page__empty">まだ公開された作品はありません。</p>
        )}
      </section>
    </div>
  );
}
