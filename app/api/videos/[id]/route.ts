import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: videoId } = await context.params;
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  if (!videoId) {
    return NextResponse.json({ message: "動画IDが不正です。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: video } = await supabase
    .from("videos")
    .select("id, owner_id")
    .eq("id", videoId)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ message: "動画が見つかりません。" }, { status: 404 });
  }

  if (video.owner_id !== user.id) {
    return NextResponse.json({ message: "この動画を削除する権限がありません。" }, { status: 403 });
  }

  const { error } = await supabase.from("videos").delete().eq("id", videoId);

  if (error) {
    return NextResponse.json({ message: "動画の削除に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ message: "動画を削除しました。" });
}
