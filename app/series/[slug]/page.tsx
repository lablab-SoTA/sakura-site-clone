import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./series-page.module.css";

import { fetchAnimeBySlug, fetchAnimeList, isPortraitAnime } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";
import { formatNumberJP } from "@/lib/intl";

type SeriesPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ episode?: string }>;
};

function formatDaysAgo(dateString: string | null | undefined): string {
  if (!dateString) {
    return "公開日不明";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "公開日不明";
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

export default async function SeriesPage({ params, searchParams }: SeriesPageProps) {
  const { slug } = await params;
  const { episode: episodeId } = await searchParams;

  const primary = await fetchAnimeBySlug(slug);
  const anime = primary ?? (slug.startsWith("series-") ? undefined : await fetchAnimeBySlug(`series-${slug}`));

  if (!anime || anime.episodes.length === 0) {
    notFound();
  }

  const episodes = anime.episodes.map((episode, index) => ({
    ...episode,
    episodeNumber: episode.episodeNumber ?? index + 1,
  }));

  const selectedEpisode =
    (episodeId ? episodes.find((episode) => episode.id === episodeId) : undefined) ?? episodes[0];
  const creator = anime.creatorProfile ?? selectedEpisode?.creatorProfile;
  const totalViews = anime.metrics?.views ?? 0;
  const totalLikes = anime.metrics?.likes ?? 0;
  const latestEpisode = episodes[episodes.length - 1];

  const allSeries = await fetchAnimeList();
  const recommendedSeries = allSeries
    .filter((candidate) => !isPortraitAnime(candidate) && candidate.slug !== anime.slug)
    .slice(0, 6);

  return (
    <div className={styles.root}>
      <header className={styles.hero}>
        <div className={styles.heroVisual}>
          <Image
            src={resolvePoster(selectedEpisode?.video.poster, anime.thumbnail)}
            alt={`${anime.title}のキービジュアル`}
            fill
            priority
            className={styles.heroImage}
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        </div>
        <div className={styles.heroBody}>
          <span className={styles.heroLabel}>シリーズ</span>
          <h1 className={styles.heroTitle}>{anime.title}</h1>
          <div className={styles.heroMeta}>
            {creator && (
              <Link href={`/u/${creator.id}`} className={styles.heroCreator}>
                {creator.avatarUrl ? (
                  <span className={styles.heroAvatar}>
                    <Image src={creator.avatarUrl} alt="" fill sizes="48px" />
                  </span>
                ) : (
                  <span className={styles.heroAvatarPlaceholder}>
                    {(creator.displayName ?? "クリエイター").slice(0, 2)}
                  </span>
                )}
                <span>{creator.displayName}</span>
              </Link>
            )}
            <span>全{episodes.length.toLocaleString()}話</span>
            <span>▶ {formatNumberJP(totalViews)}</span>
            <span>❤ {formatNumberJP(totalLikes)}</span>
            {latestEpisode?.createdAt && (
              <span>最終更新 {formatDaysAgo(latestEpisode.createdAt)}</span>
            )}
          </div>
          {anime.synopsis && (
            <p className={styles.heroDescription}>
              {anime.synopsis.length > 220 ? `${anime.synopsis.slice(0, 220)}…` : anime.synopsis}
            </p>
          )}
          <Link
            href={`/videos/${selectedEpisode.id}`}
            className={styles.heroAction}
            aria-label={`${selectedEpisode.title}を再生する`}
          >
            第{selectedEpisode.episodeNumber.toLocaleString()}話を再生
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.episodeSection} aria-labelledby="episode-list-heading">
          <div className={styles.sectionHeader}>
            <h2 id="episode-list-heading" className={styles.sectionTitle}>
              エピソード
            </h2>
            <p className={styles.sectionLead}>各話の詳細と再生ページへ移動できます。</p>
          </div>
          <ul className={styles.episodeList}>
            {episodes.map((episode) => {
              const isActive = episode.id === selectedEpisode.id;
              return (
                <li key={episode.id} className={styles.episodeItem}>
                  <Link
                    href={`/videos/${episode.id}`}
                    className={`${styles.episodeCard}${isActive ? ` ${styles.episodeCardActive}` : ""}`}
                    aria-label={`${episode.title}を再生する`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <div className={styles.episodeThumb}>
                      <Image
                        src={resolvePoster(episode.video.poster, anime.thumbnail)}
                        alt={`${episode.title}のサムネイル`}
                        fill
                        className={styles.episodeImage}
                        sizes="(max-width: 768px) 40vw, 220px"
                      />
                    </div>
                    <div className={styles.episodeBody}>
                      <span className={styles.episodeNumber}>
                        第{episode.episodeNumber.toLocaleString()}話
                      </span>
                      <span className={styles.episodeTitle}>{episode.title}</span>
                      <span className={styles.episodeMeta}>
                        {formatDaysAgo(episode.createdAt)}・{formatNumberJP(episode.metrics?.views ?? 0)}回再生・
                        {formatNumberJP(episode.metrics?.likes ?? 0)}いいね
                      </span>
                    </div>
                    <span className={styles.episodeChevron} aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {recommendedSeries.length > 0 && (
          <section className={styles.recommendSection} aria-labelledby="series-recommend-heading">
            <div className={styles.sectionHeader}>
              <h2 id="series-recommend-heading" className={styles.sectionTitle}>
                他のおすすめシリーズ
              </h2>
              <p className={styles.sectionLead}>人気の作品からピックアップしました。</p>
            </div>
            <div className={styles.recommendGrid}>
              {recommendedSeries.map((series) => {
                const primaryEpisode = series.episodes[0];
                const seriesCreator = series.creatorProfile ?? primaryEpisode?.creatorProfile;
                return (
                  <Link
                    key={series.slug}
                    href={`/series/${series.slug}`}
                    className={styles.recommendCard}
                  >
                    <div className={styles.recommendThumb}>
                      <Image
                        src={resolvePoster(primaryEpisode?.video.poster, series.thumbnail)}
                        alt={`${series.title}のサムネイル`}
                        fill
                        className={styles.recommendImage}
                        sizes="(max-width: 768px) 60vw, 240px"
                      />
                    </div>
                    <div className={styles.recommendBody}>
                      <span className={styles.recommendTitle}>{series.title}</span>
                      <span className={styles.recommendMeta}>
                        {seriesCreator?.displayName ?? "クリエイター"}・全
                        {series.episodes.length.toLocaleString()}話
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
