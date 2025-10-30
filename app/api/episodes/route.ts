import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";
import type { EpisodeType } from "@/lib/types/hierarchy";

type EpisodePayload = {
  season_id: string;
  episode_number_int: number;
  episode_number_str: string;
  episode_type: EpisodeType;
  title_raw: string;
  title_clean: string;
  slug: string;
  description?: string | null;
  release_date?: string | null;
  duration_sec?: number | null;
  tags?: string[];
  thumbnail_url?: string | null;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as EpisodePayload | null;

  if (
    !body ||
    !body.season_id ||
    typeof body.episode_number_int !== "number" ||
    !body.episode_number_str ||
    !body.episode_type ||
    !body.title_raw ||
    !body.title_clean ||
    !body.slug
  ) {
    return NextResponse.json({ message: "必要な情報が不足しています。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // シーズンを通じてシリーズの所有者を確認
  const { data: season } = await supabase
    .from("seasons")
    .select("series_id")
    .eq("id", body.season_id)
    .maybeSingle();

  if (!season) {
    return NextResponse.json({ message: "シーズンが見つかりません。" }, { status: 404 });
  }

  const { data: series } = await supabase
    .from("series")
    .select("owner_id")
    .eq("id", season.series_id)
    .maybeSingle();

  if (!series || series.owner_id !== user.id) {
    return NextResponse.json({ message: "シーズンへのアクセス権限がありません。" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("episodes")
    .insert({
      season_id: body.season_id,
      episode_number_int: body.episode_number_int,
      episode_number_str: body.episode_number_str,
      episode_type: body.episode_type,
      title_raw: body.title_raw,
      title_clean: body.title_clean,
      slug: body.slug,
      description: body.description ?? null,
      release_date: body.release_date || null,
      duration_sec: body.duration_sec ?? null,
      tags: body.tags ?? [],
      thumbnail_url: body.thumbnail_url ?? null,
    })
    .select("id, title_clean, slug, episode_number_int, episode_number_str")
    .single();

  if (error) {
    console.error("エピソードの作成エラー:", error);
    return NextResponse.json({ message: "エピソードの作成に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ episode: data });
}

