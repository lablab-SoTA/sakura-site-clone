-- Supabase プロジェクトで実行する初期スキーマ
-- SQL Editor に貼り付けて一度だけ実行してください。

-- users は Supabase Auth が管理（id=uuid）

-- プロフィール
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  avatar_url text,
  sns_x text,
  sns_instagram text,
  sns_youtube text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 規約同意履歴
create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  no_repost boolean not null,
  mosaic boolean not null,
  adult boolean not null,
  agreed_at timestamptz default now()
);

-- シリーズ（作品）
-- title_raw: 元のタイトル（例：「癒し乃さくら」）
-- title_clean: 正規化・整理されたタイトル
-- slug: URL用のスラッグ（例：「iyashi-no-sakura」）
-- metadata: JSONB形式で追加メタデータを保存
create table public.series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title_raw text not null,
  title_clean text not null,
  slug text not null unique,
  description text,
  cover_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- シーズン（章。任意）
-- シーズンが無い場合は season_number = 0 を規約化
-- name: シーズン名（例：「Season 1」「前編」）
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  season_number int not null default 0,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(series_id, season_number),
  unique(series_id, slug)
);

-- エピソード（各話）
-- episode_type: regular / ova / special / movie / recap を区別
-- episode_number_int: 整数のエピソード番号（例：1, 2, 3）
-- episode_number_str: 文字列のエピソード番号（例：「1話」「第1話」「SP1」）
-- title_raw: 元のタイトル
-- title_clean: 正規化・整理されたタイトル
-- slug: URL用のスラッグ
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  episode_number_int int not null,
  episode_number_str text not null,
  episode_type text not null default 'regular' check (episode_type in ('regular', 'ova', 'special', 'movie', 'recap')),
  title_raw text not null,
  title_clean text not null,
  slug text not null,
  description text,
  release_date date,
  duration_sec int,
  tags text[],
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(season_id, episode_number_int),
  unique(season_id, slug)
);

-- 動画ファイル情報（エピソードと1対1の関係）
-- episodes テーブルとの関係を維持
create table public.video_files (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  public_url text not null,
  width int,
  height int,
  duration_sec int,
  thumbnail_url text,
  is_adult boolean not null default true,
  mosaic_confirmed boolean not null default false,
  no_repost boolean not null default true,
  visibility text not null default 'PUBLIC',
  status text not null default 'PUBLISHED',
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- シーン（場面・チャプター。オプション）
-- エピソード内のさらに細かい区切りを管理
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  scene_number int not null,
  name text not null,
  slug text,
  description text,
  start_time_sec int,
  end_time_sec int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(episode_id, scene_number)
);

-- 動画情報（後方互換性のため残す。段階的に移行）
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid references public.series(id) on delete set null,
  title text not null,
  description text,
  tags text,
  is_adult boolean not null default true,
  mosaic_confirmed boolean not null default false,
  no_repost boolean not null default true,
  visibility text not null default 'PUBLIC',
  status text not null default 'PUBLISHED',
  file_path text not null,
  public_url text not null,
  duration_sec int,
  width int,
  height int,
  thumbnail_url text,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- いいね（エピソード用）
create table public.episode_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, episode_id)
);

-- いいね（従来の動画用。後方互換性のため残す）
create table public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, video_id)
);

-- 通報（エピソード用）
create table public.episode_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  reason text not null,
  message text,
  created_at timestamptz default now()
);

-- 通報（従来の動画用。後方互換性のため残す）
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  video_id uuid not null references public.videos(id) on delete cascade,
  reason text not null,
  message text,
  created_at timestamptz default now()
);

-- インデックス
create index idx_seasons_series_id on public.seasons(series_id);
create index idx_episodes_season_id on public.episodes(season_id);
create index idx_episodes_type on public.episodes(episode_type);
create index idx_video_files_episode_id on public.video_files(episode_id);
create index idx_scenes_episode_id on public.scenes(episode_id);
create index idx_series_slug on public.series(slug);
create index idx_seasons_slug on public.seasons(slug);
create index idx_episodes_slug on public.episodes(slug);
