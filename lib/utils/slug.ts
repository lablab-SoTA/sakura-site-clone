/**
 * スラッグ生成ユーティリティ
 * 命名規則に従ったスラッグを生成します
 */

/**
 * テキストをスラッグに変換
 * 
 * @param text 変換するテキスト
 * @returns スラッグ（英数字とハイフンのみ）
 * 
 * @example
 * generateSlug("癒し乃さくら") // "iyashi-no-sakura"
 * generateSlug("第1話「タイトル」") // "episode-1-title"
 */
export function generateSlug(text: string): string {
  const normalized = text.normalize("NFKC");

  let slug = normalized
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    // すべての文字カテゴリ(Letter/Number)を許可して記号のみ除去
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) {
    slug = Array.from(normalized.trim().toLowerCase())
      .map((char) => {
        if (/^[a-z0-9-]$/.test(char)) {
          return char;
        }
        if (char === " " || char === "_") {
          return "-";
        }
        const code = char.codePointAt(0);
        if (!code) {
          return "";
        }
        return `u${code.toString(16)}`;
      })
      .join("")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  if (!slug) {
    slug = `item-${Date.now().toString(36)}`;
  }

  return slug;
}

/**
 * シリーズのスラッグを生成
 * 
 * @param titleClean 正規化されたタイトル
 * @returns シリーズスラッグ
 */
export function generateSeriesSlug(titleClean: string): string {
  return generateSlug(titleClean);
}

/**
 * シーズンのスラッグを生成
 * 
 * @param seriesSlug シリーズのスラッグ
 * @param seasonNumber シーズン番号
 * @param seasonName シーズン名（オプション）
 * @returns シーズンスラッグ
 */
export function generateSeasonSlug(
  seriesSlug: string,
  seasonNumber: number,
  seasonName?: string
): string {
  if (seasonNumber === 0) {
    return `${seriesSlug}-main`;
  }
  
  if (seasonName) {
    const nameSlug = generateSlug(seasonName);
    return `${seriesSlug}-${nameSlug}`;
  }
  
  return `${seriesSlug}-season-${seasonNumber}`;
}

/**
 * エピソードのスラッグを生成
 * 
 * @param seasonSlug シーズンのスラッグ
 * @param episodeNumber エピソード番号（整数）
 * @param episodeType エピソードタイプ
 * @returns エピソードスラッグ
 */
export function generateEpisodeSlug(
  seasonSlug: string,
  episodeNumber: number,
  episodeType: "regular" | "ova" | "special" | "movie" | "recap" = "regular"
): string {
  const typePrefix = episodeType === "regular" ? "episode" : episodeType;
  return `${seasonSlug}-${typePrefix}-${episodeNumber}`;
}

/**
 * シーンのスラッグを生成（オプション）
 * 
 * @param episodeSlug エピソードのスラッグ
 * @param sceneNumber シーン番号
 * @param sceneName シーン名（オプション）
 * @returns シーンスラッグ
 */
export function generateSceneSlug(
  episodeSlug: string,
  sceneNumber: number,
  sceneName?: string
): string {
  if (sceneName) {
    const nameSlug = generateSlug(sceneName);
    return `${episodeSlug}-${nameSlug}`;
  }
  
  return `${episodeSlug}-scene-${sceneNumber}`;
}

/**
 * タイトルを正規化（title_clean生成用）
 * 
 * @param titleRaw 元のタイトル
 * @returns 正規化されたタイトル
 * 
 * @example
 * normalizeTitle("第1話「タイトル」") // "タイトル"
 * normalizeTitle("【完全版】タイトル") // "タイトル"
 */
export function normalizeTitle(titleRaw: string): string {
  let clean = titleRaw
    // 全角スペースを半角スペースに統一
    .replace(/\u3000/g, " ")
    // 連続するスペースを1つに
    .replace(/\s+/g, " ")
    // 先頭・末尾のスペースを削除
    .trim();

  // 括弧内のテキストを削除（例：「完全版」「前編」など）
  clean = clean
    .replace(/【[^】]*】/g, "") // 【】形式
    .replace(/「[^」]*」/g, "") // 「」形式
    .replace(/『[^』]*』/g, "") // 『』形式
    .replace(/\([^)]*\)/g, "") // ()形式
    .replace(/\[[^\]]*\]/g, "") // []形式
    .replace(/\s+/g, " ")
    .trim();

  // 番号プレフィックスを削除（例：「第1話」「Episode 1:」など）
  clean = clean
    .replace(/^第\d+話[:：]?\s*/g, "")
    .replace(/^Episode\s+\d+[:：]?\s*/gi, "")
    .replace(/^EP\d+[:：]?\s*/gi, "")
    .replace(/^\d+[:：]\s*/g, "")
    .trim();

  return clean;
}

/**
 * エピソード番号の文字列表現を生成
 * 
 * @param episodeNumber エピソード番号（整数）
 * @param episodeType エピソードタイプ
 * @returns エピソード番号の文字列表現
 * 
 * @example
 * generateEpisodeNumberStr(1, "regular") // "第1話"
 * generateEpisodeNumberStr(1, "special") // "SP1"
 * generateEpisodeNumberStr(1, "movie") // "Movie 1"
 */
export function generateEpisodeNumberStr(
  episodeNumber: number,
  episodeType: "regular" | "ova" | "special" | "movie" | "recap" = "regular"
): string {
  switch (episodeType) {
    case "regular":
    case "ova":
      return `第${episodeNumber}話`;
    case "special":
      return `SP${episodeNumber}`;
    case "movie":
      return `Movie ${episodeNumber}`;
    case "recap":
      return `総集編 ${episodeNumber}`;
    default:
      return `第${episodeNumber}話`;
  }
}

