import Link from "next/link";
import Image from "next/image";

import HeroCarousel from "@/components/HeroCarousel";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";
import type { Anime, AnimeEpisode } from "@/lib/anime";
import { formatNumberJP } from "@/lib/intl";

import styles from "./MainSection.module.css";

type Highlight = {
  anime: Anime;
  episode: AnimeEpisode;
};

type SeriesHighlight = {
  anime: Anime;
  primaryEpisode?: AnimeEpisode;
  totalViews: number;
};

type MainSectionProps = {
  heroSlides: Highlight[];
  popularSeries: SeriesHighlight[];
  popularEpisodes: Highlight[];
  allContent: Highlight[];
};

export default function MainSection({
  heroSlides,
  popularSeries,
  popularEpisodes,
  allContent,
}: MainSectionProps) {
  if (
    heroSlides.length === 0 &&
    popularSeries.length === 0 &&
    popularEpisodes.length === 0 &&
    allContent.length === 0
  ) {
    return null;
  }

  const renderEpisodeCards = (items: Highlight[], keySuffix: string) =>
    items.map(({ anime, episode }) => {
      const posterSrc = episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
      const views = episode.metrics?.views ?? 0;
      return (
        <Link
          key={`${anime.slug}-${episode.id}-${keySuffix}`}
          href={`/videos/${episode.id}`}
          className={styles.card}
          aria-label={`${anime.title} ${episode.title} を再生する`}
        >
          <div className={styles.thumb}>
            <Image
              src={posterSrc}
              alt={`${episode.title}のサムネイル`}
              fill
              className={styles.thumbImage}
              sizes="(max-width: 600px) 180px, 240px"
            />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.series}>{anime.title}</p>
            <p className={styles.episodeTitle}>{episode.title}</p>
            <p className={styles.plays}>▶ {formatNumberJP(views)}</p>
          </div>
        </Link>
      );
    });

  const renderSeriesCards = (items: SeriesHighlight[]) =>
    items.map(({ anime, primaryEpisode, totalViews }) => {
      const posterSrc = primaryEpisode?.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
      const episodeCount = anime.episodes.length;
      return (
        <Link
          key={anime.slug}
          href={`/watch/${anime.slug}`}
          className={styles.card}
          aria-label={`${anime.title} を視聴する`}
        >
          <div className={styles.thumb}>
            <Image
              src={posterSrc}
              alt={`${anime.title}のサムネイル`}
              fill
              className={styles.thumbImage}
              sizes="(max-width: 600px) 180px, 240px"
            />
          </div>
          <div className={styles.cardBody}>
            <p className={styles.series}>{anime.title}</p>
            <p className={styles.episodeTitle}>{primaryEpisode?.title ?? "エピソード"}</p>
            <p className={styles.seriesMeta}>
              <span>全{episodeCount}話</span>
              <span>▶ {formatNumberJP(totalViews)}</span>
            </p>
          </div>
        </Link>
      );
    });

  return (
    <section className={styles.root}>
      {heroSlides.length > 0 && (
        <div className={styles.heroRegion} data-section="hero">
          <HeroCarousel slides={heroSlides} />
        </div>
      )}

      {popularSeries.length > 0 && (
        <section className={styles.cardSection} aria-labelledby="popular-series-heading">
          <header className={styles.sectionHeader}>
            <h2 id="popular-series-heading" className={styles.sectionTitle}>
              人気のシリーズ
            </h2>
            <p className={styles.sectionLead}>総再生数が多いシリーズ作品をピックアップしました。</p>
          </header>
          <div className={styles.cardRail}>{renderSeriesCards(popularSeries)}</div>
        </section>
      )}

      {popularEpisodes.length > 0 && (
        <section className={styles.cardSection} aria-labelledby="popular-episodes-heading">
          <header className={styles.sectionHeader}>
            <h2 id="popular-episodes-heading" className={styles.sectionTitle}>
              人気のエピソード
            </h2>
            <p className={styles.sectionLead}>再生回数の多いエピソードをまとめてご紹介します。</p>
          </header>
          <div className={styles.cardRail}>{renderEpisodeCards(popularEpisodes, "popular")}</div>
        </section>
      )}

      {allContent.length > 0 && (
        <section className={styles.cardSection} aria-labelledby="all-content-heading">
          <header className={styles.sectionHeader}>
            <h2 id="all-content-heading" className={styles.sectionTitle}>
              コンテンツ（全て）
            </h2>
            <p className={styles.sectionLead}>公開中のすべてのコンテンツを一覧でご覧いただけます。</p>
          </header>
          <div className={styles.cardRail}>{renderEpisodeCards(allContent, "all")}</div>
        </section>
      )}
    </section>
  );
}
