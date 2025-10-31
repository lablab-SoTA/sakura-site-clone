"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Anime } from "@/lib/anime";
import { formatNumberJP } from "@/lib/intl";
import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

import styles from "./search-page.module.css";

type SearchPageClientProps = {
  animeList: Anime[];
};

type SearchResult = {
  anime: Anime;
  score: number;
};

function normalizeText(source: string): string {
  return source
    .normalize("NFKC")
    .replace(/[\u3000\s]+/g, " ")
    .trim()
    .toLowerCase();
}

function buildSearchTokens(query: string): string[] {
  const normalized = normalizeText(query);
  if (normalized.length === 0) {
    return [];
  }
  return normalized.split(" ").filter((token) => token.length > 0);
}

function resolveDestination(anime: Anime): string {
  const firstEpisode = anime.episodes[0] ?? null;
  if (!anime.seriesId && firstEpisode) {
    // 単発動画の場合は動画ページに遷移させる
    return `/videos/${firstEpisode.id}`;
  }
  return `/series/${anime.slug}`;
}

function buildSearchCorpus(anime: Anime): string {
  const chunks = [anime.title, anime.synopsis, anime.creator ?? "", anime.genres.join(" ")];
  return normalizeText(chunks.filter(Boolean).join(" "));
}

function sliceSynopsis(text: string, limit = 140): string {
  if (!text) {
    return "";
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}…`;
}

export default function SearchPageClient({ animeList }: SearchPageClientProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  const tokens = useMemo(() => buildSearchTokens(query), [query]);

  const matchedResults = useMemo(() => {
    if (tokens.length === 0) {
      return [] as SearchResult[];
    }

    return animeList
      .map<SearchResult | null>((anime) => {
        const corpus = buildSearchCorpus(anime);
        const isMatch = tokens.every((token) => corpus.includes(token));
        if (!isMatch) {
          return null;
        }

        const metrics = anime.metrics ?? { views: 0, likes: 0 };
        const views = metrics.views ?? 0;
        const likes = metrics.likes ?? 0;
        const relevanceBoost = tokens.some((token) => anime.title && normalizeText(anime.title).startsWith(token))
          ? 220
          : 0;
        const score = likes * 6 + views * 0.12 + relevanceBoost;
        return { anime, score };
      })
      .filter((entry): entry is SearchResult => entry !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
  }, [animeList, tokens]);

  const popularSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    for (const anime of animeList) {
      if (anime.title && suggestions.size < 8) {
        suggestions.add(anime.title);
      }
      if (suggestions.size >= 8) {
        break;
      }
    }
    return Array.from(suggestions);
  }, [animeList]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const firstResult = matchedResults[0];
      if (firstResult) {
        router.push(resolveDestination(firstResult.anime));
      }
    },
    [matchedResults, router],
  );

  const handleSuggestion = useCallback((value: string) => {
    setQuery(value);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const hasQuery = tokens.length > 0;
  const resultCount = matchedResults.length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>検索</h1>
        <p className={styles.description}>作品名、クリエイター名、ジャンルなどで気になる動画を探してみましょう。</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} role="search">
        <div className={styles.inputWrapper}>
          <label className="sr-only" htmlFor="search-query">
            検索キーワード
          </label>
          <input
            ref={inputRef}
            id="search-query"
            name="query"
            type="search"
            autoComplete="off"
            placeholder="作品名・タグ・クリエイター名で検索"
            value={query}
            onChange={handleChange}
            className={styles.input}
          />
          <button type="submit" className={styles.submitButton}>
            検索
          </button>
        </div>
      </form>

      <section className={styles.resultsSection} aria-live="polite">
        <div className={styles.resultsHeader}>
          <h2 className={styles.sectionTitle}>{hasQuery ? "検索結果" : "人気のキーワード"}</h2>
          {hasQuery && <span className={styles.resultCount}>{`${resultCount}件ヒットしました`}</span>}
        </div>

        {hasQuery ? (
          resultCount > 0 ? (
            <div className={styles.grid}>
              {matchedResults.map(({ anime }) => {
                const destination = resolveDestination(anime);
                const firstEpisode = anime.episodes[0] ?? null;
                const metrics = anime.metrics ?? { views: 0, likes: 0 };
                const views = formatNumberJP(metrics.views ?? 0);
                const likes = formatNumberJP(metrics.likes ?? 0);
                const synopsis = sliceSynopsis(anime.synopsis ?? "");
                const thumbnail = anime.thumbnail && anime.thumbnail.length > 0 ? anime.thumbnail : XANIME_THUMB_PLACEHOLDER;

                return (
                  <Link key={`${anime.slug}-${firstEpisode?.id ?? "standalone"}`} href={destination} className={styles.card}>
                    <div className={styles.thumbnail}>
                      <Image src={thumbnail} alt={`${anime.title}のサムネイル`} fill sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                    <div className={styles.cardBody}>
                      <h3 className={styles.cardTitle}>{anime.title}</h3>
                      {synopsis && <p className={styles.cardSynopsis}>{synopsis}</p>}
                      <div className={styles.cardMeta}>
                        <span>{`👍 ${likes}`}</span>
                        <span>{`👀 ${views}`}</span>
                        {anime.year ? <span>{`${anime.year}年`}</span> : null}
                        {anime.genres.slice(0, 2).map((genre) => (
                          <span key={genre}>{genre}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>一致する作品が見つかりませんでした。別のキーワードでお試しください。</div>
          )
        ) : (
          <div className={styles.empty}>
            <p>気になるキーワードを入力して検索してみましょう。</p>
            {popularSuggestions.length > 0 && (
              <div className={styles.suggestionList}>
                {popularSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => handleSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

