import Image from "next/image";
import Link from "next/link";

import { formatNumberJP } from "@/lib/intl";

import styles from "./HomeShowcase.module.css";

export type HomeFeedItem = {
  id: string;
  href: string;
  poster: string;
  creatorName: string;
  creatorAvatar: string | null;
  createdAt: string | null;
};

export type HomeSeriesItem = {
  slug: string;
  href: string;
  poster: string;
  title: string;
  creatorName: string;
  creatorAvatar: string | null;
  updatedAt: string | null;
  episodeCount: number;
  totalViews: number;
};

export type HomeEpisodeItem = {
  id: string;
  href: string;
  poster: string;
  title: string;
  seriesTitle: string;
  creatorName: string;
  creatorAvatar: string | null;
  episodeNumber?: number;
  views: number;
};

type HomeShowcaseProps = {
  feedItems: HomeFeedItem[];
  seriesItems: HomeSeriesItem[];
  episodeItems: HomeEpisodeItem[];
};

function formatDaysAgo(dateString: string | null): string {
  if (!dateString) {
    return "更新日不明";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "更新日不明";
  }

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "今日";
  }

  return `${diffDays}日前`;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "？";
  }
  const first = trimmed.charAt(0);
  const second = trimmed.charAt(1);
  return (first + (second ?? "")).toUpperCase();
}

type AvatarProps = {
  name: string;
  src: string | null;
  variant?: "md" | "sm";
};

function Avatar({ name, src, variant = "md" }: AvatarProps) {
  const className = `${styles.avatar}${variant === "sm" ? ` ${styles.avatarSmall}` : ""}`;

  if (src) {
    return (
      <span className={className}>
        <Image src={src} alt="" fill sizes={variant === "sm" ? "32px" : "40px"} />
      </span>
    );
  }

  return (
    <span className={className}>
      <span>{getInitials(name)}</span>
    </span>
  );
}

export default function HomeShowcase({ feedItems, seriesItems, episodeItems }: HomeShowcaseProps) {
  const hasFeed = feedItems.length > 0;
  const hasSeries = seriesItems.length > 0;
  const hasEpisodes = episodeItems.length > 0;

  if (!hasFeed && !hasSeries && !hasEpisodes) {
    return null;
  }

  return (
    <div className={styles.root}>
      {hasFeed && (
        <section className={styles.section} aria-labelledby="home-feed-heading">
          <header className={styles.sectionHeader}>
            <h2 id="home-feed-heading" className={styles.sectionTitle}>
              フィード
            </h2>
            <p className={styles.sectionLead}>縦型の最新投稿をスワイプして楽しめます。</p>
          </header>
          <div className={`${styles.rail} ${styles.feedRail}`}>
            {feedItems.map((item) => (
              <Link key={item.id} href={item.href} className={`${styles.card} ${styles.feedCard}`}>
                <div className={styles.feedThumb}>
                  <Image
                    src={item.poster}
                    alt={`${item.creatorName}のフィード`}
                    fill
                    priority={false}
                    className={styles.feedPoster}
                    sizes="(max-width: 520px) 70vw, 260px"
                  />
                  <div className={styles.feedOverlay}>
                    <Avatar name={item.creatorName} src={item.creatorAvatar} />
                    <div className={styles.feedOverlayText}>
                      <span className={styles.feedCreator}>{item.creatorName}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasSeries && (
        <section className={styles.section} aria-labelledby="home-series-heading">
          <header className={styles.sectionHeader}>
            <h2 id="home-series-heading" className={styles.sectionTitle}>
              人気のシリーズ
            </h2>
            <p className={styles.sectionLead}>横型のシリーズ作品をまるっとチェック。</p>
          </header>
          <div className={`${styles.rail} ${styles.seriesRail}`}>
            {seriesItems.map((item) => (
              <Link key={item.slug} href={item.href} className={`${styles.card} ${styles.seriesCard}`}>
                <div className={styles.seriesThumb}>
                  <Image
                    src={item.poster}
                    alt={`${item.title}のカバー`}
                    fill
                    className={styles.seriesPoster}
                    sizes="(max-width: 520px) 80vw, 320px"
                  />
                </div>
                <div className={styles.seriesContent}>
                  <div className={styles.titleBlock}>
                    <Avatar name={item.creatorName} src={item.creatorAvatar} variant="sm" />
                    <div className={styles.titleText}>
                      <span className={styles.seriesTitle}>{item.title}</span>
                      <span className={styles.seriesMeta}>
                        {item.creatorName}・{formatDaysAgo(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <span className={styles.seriesStats}>
                    全{item.episodeCount.toLocaleString()}話・▶ {formatNumberJP(item.totalViews)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasEpisodes && (
        <section className={styles.section} aria-labelledby="home-episodes-heading">
          <header className={styles.sectionHeader}>
            <h2 id="home-episodes-heading" className={styles.sectionTitle}>
              人気のエピソード
            </h2>
            <p className={styles.sectionLead}>注目のエピソードをピックアップしました。</p>
          </header>
          <div className={`${styles.rail} ${styles.episodeRail}`}>
            {episodeItems.map((item) => {
              const episodeLabel =
                typeof item.episodeNumber === "number"
                  ? `第${item.episodeNumber.toLocaleString()}話`
                  : "エピソード";
              return (
                <Link key={item.id} href={item.href} className={`${styles.card} ${styles.episodeCard}`}>
                  <div className={styles.episodeThumb}>
                    <Image
                      src={item.poster}
                      alt={`${item.title}のサムネイル`}
                      fill
                      className={styles.episodePoster}
                      sizes="(max-width: 520px) 80vw, 320px"
                    />
                  </div>
                  <div className={styles.episodeContent}>
                    <div className={styles.titleBlock}>
                      <Avatar name={item.creatorName} src={item.creatorAvatar} variant="sm" />
                      <span className={styles.episodeTitle}>{item.title}</span>
                    </div>
                    <span className={styles.episodeSeries}>{item.seriesTitle}</span>
                    <span className={styles.episodeStats}>
                      {episodeLabel}・▶ {formatNumberJP(item.views)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
