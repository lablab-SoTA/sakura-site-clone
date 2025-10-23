import "server-only";

import { headers } from "next/headers";

export type AnimeVideo = {
  type: "hls" | "mp4";
  src: string;
  poster?: string;
};

export type AnimeMetrics = {
  views: number;
  likes: number;
};

export type AnimeEpisode = {
  id: string;
  title: string;
  synopsis: string;
  duration: number;
  video: AnimeVideo;
  metrics?: AnimeMetrics;
};

export type Anime = {
  slug: string;
  title: string;
  synopsis: string;
  thumbnail: string;
  year: number;
  rating: string;
  genres: string[];
  creator?: string;
  duration?: number;
  metrics?: AnimeMetrics;
  episodes: AnimeEpisode[];
};

const DATA_PATH = "/data/anime.json";

function getSiteUrlFallback() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_BASE_URL;
  if (envUrl) return envUrl;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://localhost:3000`;
}

async function resolveBaseUrl(): Promise<string> {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost ?? headerList.get("host");
  const forwardedProto = headerList.get("x-forwarded-proto");

  if (host && forwardedProto) {
    return `${forwardedProto}://${host}`;
  }

  if (host) {
    const fallback = new URL(getSiteUrlFallback());
    return `${fallback.protocol}//${host}`;
  }

  return getSiteUrlFallback();
}

async function buildDataUrl(): Promise<string> {
  const baseUrl = await resolveBaseUrl();
  return `${baseUrl}${DATA_PATH}`;
}

export async function fetchAnimeList(): Promise<Anime[]> {
  const dataUrl = await buildDataUrl();
  const response = await fetch(dataUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load anime metadata: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Anime[];
}

export async function fetchAnimeBySlug(slug: string): Promise<Anime | undefined> {
  const list = await fetchAnimeList();
  return list.find((item) => item.slug === slug);
}
