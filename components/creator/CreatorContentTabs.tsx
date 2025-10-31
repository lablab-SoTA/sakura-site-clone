"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import FeedViewer, { type FeedViewerItem } from "@/components/feed/FeedViewer";
import { formatNumberJP } from "@/lib/intl";

import styles from "./CreatorContentTabs.module.css";

export type CreatorSeriesItem = {
  slug: string;
  title: string;
  poster: string;
  episodeCount: number;
  updatedAt: string | null;
  views: number;
};

type CreatorContentTabsProps = {
  feedItems: FeedViewerItem[];
  seriesItems: CreatorSeriesItem[];
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
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) {
    return "今日";
  }
  if (diffDays === 1) {
    return "1日前";
  }
  if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    return `${years}年前`;
  }
  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    return `${months}か月前`;
  }
  return `${diffDays}日前`;
}

export default function CreatorContentTabs({ feedItems, seriesItems }: CreatorContentTabsProps) {
  const hasFeed = feedItems.length > 0;
  const hasSeries = seriesItems.length > 0;
  const initialTab = useMemo(() => {
    if (hasFeed) {
      return "feed";
    }
    if (hasSeries) {
      return "series";
    }
    return "feed";
  }, [hasFeed, hasSeries]);

  const [activeTab, setActiveTab] = useState<"feed" | "series">(initialTab as "feed" | "series");

  return (
    <div className={styles.root}>
      <div className={styles.tabList} role="tablist" aria-label="作品タイプ">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "feed"}
          aria-controls="creator-feed-panel"
          className={`${styles.tabButton}${activeTab === "feed" ? ` ${styles.tabButtonActive}` : ""}`}
          onClick={() => setActiveTab("feed")}
          disabled={!hasFeed && activeTab === "feed"}
        >
          フィード
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "series"}
          aria-controls="creator-series-panel"
          className={`${styles.tabButton}${activeTab === "series" ? ` ${styles.tabButtonActive}` : ""}`}
          onClick={() => setActiveTab("series")}
          disabled={!hasSeries && activeTab === "series"}
        >
          シリーズ
        </button>
      </div>

      <div className={styles.panelContainer}>
        {activeTab === "feed" && (
          <div id="creator-feed-panel" role="tabpanel" aria-labelledby="creator-feed-tab" className={styles.panel}>
            {hasFeed ? (
              <FeedViewer items={feedItems} initialId={feedItems[0]?.id ?? null} />
            ) : (
              <p className={styles.empty}>公開中のフィード投稿はまだありません。</p>
            )}
          </div>
        )}

        {activeTab === "series" && (
          <div
            id="creator-series-panel"
            role="tabpanel"
            aria-labelledby="creator-series-tab"
            className={styles.panel}
          >
            {hasSeries ? (
              <div className={styles.seriesGrid}>
                {seriesItems.map((item) => (
                  <Link key={item.slug} href={`/series/${item.slug}`} className={styles.seriesCard}>
                    <div className={styles.seriesThumb}>
                      <Image
                        src={item.poster}
                        alt={`${item.title}のサムネイル`}
                        fill
                        className={styles.seriesImage}
                        sizes="(max-width: 768px) 70vw, 260px"
                      />
                    </div>
                    <div className={styles.seriesBody}>
                      <span className={styles.seriesTitle}>{item.title}</span>
                      <span className={styles.seriesMeta}>
                        全{item.episodeCount.toLocaleString()}話・更新 {formatDaysAgo(item.updatedAt)}
                      </span>
                      <span className={styles.seriesViews}>▶ {formatNumberJP(item.views)}回再生</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>公開中のシリーズ作品はまだありません。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
