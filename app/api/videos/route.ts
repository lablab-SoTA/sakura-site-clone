import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

type VideoPayload = {
  type: "single" | "new-series" | "existing-series";
  seriesId?: string | null;
  title: string;
  description?: string | null;
  tags?: string | null;
  filePath: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
  mosaicConfirmed: boolean;
  noRepost: boolean;
  isAdult: boolean;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as VideoPayload | null;

  if (!body || !body.title || !body.filePath || !body.publicUrl) {
    return NextResponse.json({ message: "必要な情報が不足しています。" }, { status: 400 });
  }

  if (!body.noRepost || !body.mosaicConfirmed || !body.isAdult) {
    return NextResponse.json({ message: "必須のチェック項目を満たしていません。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("videos")
    .insert({
      owner_id: user.id,
      series_id: body.seriesId ?? null,
      title: body.title,
      description: body.description ?? null,
      tags: body.tags ?? null,
      file_path: body.filePath,
      public_url: body.publicUrl,
      thumbnail_url: body.thumbnailUrl ?? null,
      mosaic_confirmed: body.mosaicConfirmed,
      no_repost: body.noRepost,
      is_adult: body.isAdult,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: "動画の登録に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ video: data });
}
