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

type MainSectionProps = {
  heroSlides: Highlight[];
  featuredEpisodes: Highlight[];
};

export default function MainSection({ heroSlides, featuredEpisodes }: MainSectionProps) {
  if (heroSlides.length === 0 && featuredEpisodes.length === 0) {
    return null;
  }

  const railEpisodes = featuredEpisodes.length > 0 ? featuredEpisodes : heroSlides;

  return (
    <section className={styles.root}>
      {heroSlides.length > 0 && (
        <div className={styles.heroRegion} data-section="hero">
          <HeroCarousel slides={heroSlides} />
        </div>
      )}

      {railEpisodes.length > 0 && (
        <section className={styles.episodeSection} aria-labelledby="popular-episodes-heading">
          <header className={styles.sectionHeader}>
            <h2 id="popular-episodes-heading" className={styles.sectionTitle}>
              人気のエピソード
            </h2>
            <p className={styles.sectionLead}>再生回数の多い人気エピソードをピックアップしました。</p>
          </header>
          <div className={styles.episodeRail}>
            {railEpisodes.map(({ anime, episode }) => {
              const posterSrc = episode.video.poster || anime.thumbnail || XANIME_THUMB_PLACEHOLDER;
              const views = episode.metrics?.views ?? 0;
              return (
                <Link
                  key={`${anime.slug}-${episode.id}-rail`}
                  href={`/watch/${anime.slug}?episode=${episode.id}`}
                  className={styles.episodeCard}
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
            })}
          </div>
        </section>
      )}
    </section>
  );
}
