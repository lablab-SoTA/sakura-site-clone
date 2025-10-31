import type { Metadata } from "next";

import { fetchAnimeList } from "@/lib/anime";

import SearchPageClient from "./search-page-client";

export const metadata: Metadata = {
  title: "検索 | xanime",
  description: "作品名やタグで検索して、お気に入りの動画を見つけましょう。",
};

export default async function SearchPage() {
  const animeList = await fetchAnimeList();

  return <SearchPageClient animeList={animeList} />;
}

