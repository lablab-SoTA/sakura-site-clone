import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

type VideoFilePayload = {
  episode_id: string;
  file_path: string;
  public_url: string;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  duration_sec?: number | null;
  is_adult: boolean;
  mosaic_confirmed: boolean;
  no_repost: boolean;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as VideoFilePayload | null;

  if (!body || !body.episode_id || !body.file_path || !body.public_url) {
    return NextResponse.json({ message: "必要な情報が不足しています。" }, { status: 400 });
  }

  if (!body.no_repost || !body.mosaic_confirmed || !body.is_adult) {
    return NextResponse.json({ message: "必須のチェック項目を満たしていません。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // エピソードを通じてシリーズの所有者を確認
  const { data: episode } = await supabase
    .from("episodes")
    .select(
      "id, season_id, title_raw, title_clean, description, tags, thumbnail_url, duration_sec, created_at",
    )
    .eq("id", body.episode_id)
    .maybeSingle();

  if (!episode) {
    return NextResponse.json({ message: "エピソードが見つかりません。" }, { status: 404 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("series_id")
    .eq("id", episode.season_id)
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
    return NextResponse.json({ message: "エピソードへのアクセス権限がありません。" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("video_files")
    .insert({
      episode_id: body.episode_id,
      owner_id: user.id,
      file_path: body.file_path,
      public_url: body.public_url,
      thumbnail_url: body.thumbnail_url ?? null,
      width: body.width ?? null,
      height: body.height ?? null,
      duration_sec: body.duration_sec ?? null,
      is_adult: body.is_adult,
      mosaic_confirmed: body.mosaic_confirmed,
      no_repost: body.no_repost,
      visibility: body.visibility ?? "PUBLIC",
      status: body.status ?? "PUBLISHED",
    })
    .select("id, public_url")
    .single();

  if (error) {
    console.error("動画ファイルの作成エラー:", error);
    return NextResponse.json({ message: "動画ファイルの登録に失敗しました。" }, { status: 500 });
  }

  const cleanTitle = episode.title_clean?.trim() ?? "";
  const rawTitle = episode.title_raw?.trim() ?? "";
  const normalizedTitle = cleanTitle.length > 0 ? cleanTitle : rawTitle;
  const episodeTags = Array.isArray(episode.tags)
    ? episode.tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag) => tag.length > 0)
    : [];
  const tagCsv = episodeTags.length > 0 ? episodeTags.join(",") : null;
  const nowIso = new Date().toISOString();

  const { error: syncError } = await supabase
    .from("videos")
    .upsert(
      {
        id: episode.id,
        owner_id: user.id,
        series_id: season.series_id,
        title: normalizedTitle.length > 0 ? normalizedTitle : rawTitle,
        description: episode.description ?? null,
        tags: tagCsv,
        is_adult: body.is_adult,
        mosaic_confirmed: body.mosaic_confirmed,
        no_repost: body.no_repost,
        visibility: body.visibility ?? "PUBLIC",
        status: body.status ?? "PUBLISHED",
        file_path: body.file_path,
        public_url: body.public_url,
        duration_sec: body.duration_sec ?? episode.duration_sec ?? null,
        width: body.width ?? null,
        height: body.height ?? null,
        thumbnail_url: body.thumbnail_url ?? episode.thumbnail_url ?? null,
        created_at: episode.created_at ?? nowIso,
        updated_at: nowIso,
        published_at: episode.created_at ?? nowIso,
      },
      { onConflict: "id" },
    );

  if (syncError) {
    console.error("動画レコードの同期に失敗しました:", syncError);
    await supabase.from("video_files").delete().eq("id", data.id).catch(() => undefined);
    return NextResponse.json({ message: "動画情報の同期に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ video_file: data });
}
