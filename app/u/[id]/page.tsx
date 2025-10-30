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

  const videoList = videos ?? [];
  const videoCount = videoList.length;
  const totalViews = videoList.reduce((acc, video) => acc + video.view_count, 0);
  const totalLikes = videoList.reduce((acc, video) => acc + video.like_count, 0);
  const latestPublishedAt = videoList[0]
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
        new Date(videoList[0].created_at),
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
          <ul className="creator-page__grid">
            {videoList.map((video) => (
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
                  <h3 className="creator-page__card-title">{video.title}</h3>
                  <p className="creator-page__card-meta">
                    {video.view_count.toLocaleString()} 再生・{video.like_count.toLocaleString()} いいね
                  </p>
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
