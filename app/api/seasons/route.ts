import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

type SeasonPayload = {
  series_id: string;
  season_number: number;
  name: string;
  slug?: string | null;
  description?: string | null;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SeasonPayload | null;

  if (!body || !body.series_id || typeof body.season_number !== "number" || !body.name) {
    return NextResponse.json({ message: "必要な情報が不足しています。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // シリーズの所有者を確認
  const { data: series } = await supabase
    .from("series")
    .select("owner_id")
    .eq("id", body.series_id)
    .maybeSingle();

  if (!series || series.owner_id !== user.id) {
    return NextResponse.json({ message: "シリーズへのアクセス権限がありません。" }, { status: 403 });
  }

  if (!body.slug) {
    return NextResponse.json({ message: "シーズンスラッグを指定してください。" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    series_id: body.series_id,
    season_number: body.season_number,
    name: body.name,
    slug: body.slug,
    description: body.description ?? null,
  };

  const selectFields = ["id", "name", "season_number", "slug"];

  const { data, error } = await supabase.from("seasons").insert(payload).select(selectFields.join(", ")).single();

  if (error) {
    console.error("シーズンの作成エラー:", error);
    return NextResponse.json({ message: "シーズンの作成に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ season: data });
}
