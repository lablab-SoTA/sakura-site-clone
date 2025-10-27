import "server-only";

import animeData from "@/data/anime.json";

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

const animeList = animeData as Anime[];

export async function fetchAnimeList(): Promise<Anime[]> {
  return animeList;
}

export async function fetchAnimeBySlug(slug: string): Promise<Anime | undefined> {
  return animeList.find((item) => item.slug === slug);
}
