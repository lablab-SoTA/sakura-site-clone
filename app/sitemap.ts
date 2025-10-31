import type { MetadataRoute } from "next";

import animeData from "@/data/anime.json";

const SITE_URL = "https://xanime.net";

type AnimeEntry = {
  slug: string;
  updated_at?: string | null;
  created_at?: string | null;
  seasons?: Array<{
    episodes?: Array<{
      id: string;
      updated_at?: string | null;
      created_at?: string | null;
    }>;
  }>;
};

function resolveDateTimestamp(...candidates: Array<string | null | undefined>): Date {
  for (const value of candidates) {
    if (!value) {
      continue;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/feed`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/upload`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/series`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/videos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const dynamicRoutes = (animeData as AnimeEntry[]).flatMap((anime) => {
    const entries: MetadataRoute.Sitemap = [];
    const seriesLastModified = resolveDateTimestamp(anime.updated_at, anime.created_at);
    entries.push({
      url: `${SITE_URL}/series/${anime.slug}`,
      lastModified: seriesLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    anime.seasons?.forEach((season) => {
      season.episodes?.forEach((episode) => {
        entries.push({
          url: `${SITE_URL}/videos/${episode.id}`,
          lastModified: resolveDateTimestamp(episode.updated_at, episode.created_at, anime.updated_at),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      });
    });
    return entries;
  });

  return [...staticRoutes, ...dynamicRoutes];
}
