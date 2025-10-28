import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const videoId = params.id;

  if (!videoId) {
    return NextResponse.json({ message: "動画IDが不正です。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: video, error } = await supabase
    .from("videos")
    .select("view_count")
    .eq("id", videoId)
    .single();

  if (error || !video) {
    return NextResponse.json({ message: "動画が見つかりません。" }, { status: 404 });
  }

  const nextCount = (video.view_count ?? 0) + 1;

  const { data: updated, error: updateError } = await supabase
    .from("videos")
    .update({ view_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", videoId)
    .select("view_count")
    .single();

  if (updateError) {
    return NextResponse.json({ message: "再生数の更新に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ viewCount: updated?.view_count ?? nextCount });
}
