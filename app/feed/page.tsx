import FeedVerticalViewer from "@/components/feed/FeedVerticalViewer";
import { type FeedViewerItem } from "@/components/feed/FeedViewer";

import { fetchAnimeList, isPortraitAnime } from "@/lib/anime";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type FeedPageProps = {
  searchParams: Promise<{ start?: string }>;
};

export const metadata = {
  title: "フィード | xanime",
  description: "最新のフィード投稿を縦型で連続再生できます。",
};

function calculateScore(views: number, likes: number, createdAt: string | null, now: number): number {
  const createdTime = createdAt ? new Date(createdAt).getTime() : now;
  const isValid = Number.isFinite(createdTime);
  const ageHours = Math.max(1, (now - (isValid ? createdTime : now)) / (1000 * 60 * 60));
  const recencyBoost = 120000 / ageHours;
  const engagementBoost = likes * 18;
  const viewScore = views * 0.6;
  return recencyBoost + engagementBoost + viewScore;
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

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const { start } = await searchParams;
  const animeList = await fetchAnimeList();
  const now = Date.now();

  const items: FeedViewerItem[] = animeList
    .filter((anime) => isPortraitAnime(anime))
    .flatMap((anime) => {
      const episode = anime.episodes[0];
      if (!episode) {
        return [];
      }
      const metrics = episode.metrics ?? { views: 0, likes: 0 };
      const creator = anime.creatorProfile ?? episode.creatorProfile;

      return [
        {
          id: episode.id,
          title: episode.title,
          description: episode.synopsis,
          src: episode.video.src,
          poster: resolvePoster(episode.video.poster, anime.thumbnail),
          creatorName: creator?.displayName ?? anime.title,
          creatorId: creator?.id ?? null,
          creatorAvatar: creator?.avatarUrl ?? null,
          views: metrics.views ?? 0,
          likes: metrics.likes ?? 0,
          createdAt: episode.createdAt ?? null,
          score: calculateScore(metrics.views ?? 0, metrics.likes ?? 0, episode.createdAt ?? null, now),
        },
      ];
    })
    .sort((a, b) => b.score - a.score);

  if (items.length === 0) {
    return (
      <div className="feed-page">
        <p className="page-lede">フィード投稿がまだありません。最初の投稿をアップロードしてみましょう。</p>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <FeedVerticalViewer items={items} initialId={start ?? null} />
    </div>
  );
}
