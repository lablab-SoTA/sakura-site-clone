/**
 * 階層モデルの型定義
 * Series → Season → Episode → Scene の階層構造を定義
 */

/**
 * エピソードタイプ
 * - regular: 通常のエピソード
 * - ova: OVA（オリジナルビデオアニメーション）
 * - special: スペシャルエピソード
 * - movie: 劇場版
 * - recap: 総集編
 */
export type EpisodeType = "regular" | "ova" | "special" | "movie" | "recap";

/**
 * Series（作品）
 * 例: 「癒し乃さくら」
 */
export type Series = {
  id: string;
  owner_id: string;
  title_raw: string; // 元のタイトル（例：「癒し乃さくら」）
  title_clean: string; // 正規化・整理されたタイトル
  slug: string; // URL用のスラッグ（例：「iyashi-no-sakura」）
  description: string | null;
  cover_url: string | null;
  metadata: Record<string, unknown>; // JSONB形式で追加メタデータ
  created_at: string;
  updated_at: string;
};

/**
 * Season（シーズン／章。任意）
 * シーズンが無い場合は season_number = 0 を規約化
 */
export type Season = {
  id: string;
  series_id: string;
  season_number: number; // シーズンが無い場合は 0
  name: string; // シーズン名（例：「Season 1」「前編」）
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Episode（各話）
 */
export type Episode = {
  id: string;
  season_id: string;
  episode_number_int: number; // 整数のエピソード番号（例：1, 2, 3）
  episode_number_str: string; // 文字列のエピソード番号（例：「1話」「第1話」「SP1」）
  episode_type: EpisodeType; // regular / ova / special / movie / recap
  title_raw: string; // 元のタイトル
  title_clean: string; // 正規化・整理されたタイトル
  slug: string; // URL用のスラッグ
  description: string | null;
  release_date: string | null; // YYYY-MM-DD形式
  duration_sec: number | null;
  tags: string[]; // タグ配列
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * VideoFile（動画ファイル情報）
 * Episodeと1対1の関係
 */
export type VideoFile = {
  id: string;
  episode_id: string;
  owner_id: string;
  file_path: string;
  public_url: string;
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  thumbnail_url: string | null;
  is_adult: boolean;
  mosaic_confirmed: boolean;
  no_repost: boolean;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  view_count: number;
  like_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Scene（場面・チャプター。オプション）
 * Episode内のさらに細かい区切りを管理
 */
export type Scene = {
  id: string;
  episode_id: string;
  scene_number: number;
  name: string;
  slug: string | null;
  description: string | null;
  start_time_sec: number | null; // 開始時刻（秒）
  end_time_sec: number | null; // 終了時刻（秒）
  created_at: string;
  updated_at: string;
};

/**
 * 階層構造を含む完全なSeries情報
 */
export type SeriesWithHierarchy = Series & {
  seasons: SeasonWithEpisodes[];
};

/**
 * Seasonとそのエピソードを含む情報
 */
export type SeasonWithEpisodes = Season & {
  episodes: EpisodeWithVideoFile[];
};

/**
 * Episodeと動画ファイルを含む情報
 */
export type EpisodeWithVideoFile = Episode & {
  video_file: VideoFile | null;
  scenes?: Scene[];
};

/**
 * データベースから取得する際のRow型
 */
export type SeriesRow = Omit<Series, "metadata"> & {
  metadata: string | Record<string, unknown>;
};

export type SeasonRow = Season;

export type EpisodeRow = Episode;

export type VideoFileRow = VideoFile;

export type SceneRow = Scene;


