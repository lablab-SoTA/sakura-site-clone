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

-- シリーズ
create table public.series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 動画情報
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

-- いいね
create table public.likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, video_id)
);

-- 通報
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  video_id uuid not null references public.videos(id) on delete cascade,
  reason text not null,
  message text,
  created_at timestamptz default now()
);
