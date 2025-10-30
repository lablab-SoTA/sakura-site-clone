import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";
import type { EpisodeType } from "@/lib/types/hierarchy";

type SeriesPayload = {
  title_raw: string;
  title_clean: string;
  slug: string;
  description?: string | null;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SeriesPayload | null;

  if (!body || !body.title_raw || !body.title_clean || !body.slug) {
    return NextResponse.json({ message: "シリーズ名とスラッグを入力してください。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("series")
    .insert({
      owner_id: user.id,
      title_raw: body.title_raw,
      title_clean: body.title_clean,
      slug: body.slug,
      description: body.description ?? null,
    })
    .select("id, title_clean, slug")
    .single();

  if (error) {
    console.error("シリーズの作成エラー:", error);
    return NextResponse.json({ message: "シリーズの作成に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ series: data });
}
