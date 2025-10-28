import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

type LikeParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const videoId = params.id;

  if (!videoId) {
    return NextResponse.json({ message: "動画IDが不正です。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("user_id", user.id).eq("video_id", videoId);

    const { count } = await supabase
      .from("likes")
      .select("video_id", { count: "exact", head: true })
      .eq("video_id", videoId);

    const nextCount = count ?? 0;
    await supabase
      .from("videos")
      .update({ like_count: nextCount, updated_at: new Date().toISOString() })
      .eq("id", videoId);

    return NextResponse.json({ liked: false, likeCount: nextCount });
  }

  const { error: insertError } = await supabase
    .from("likes")
    .insert({ user_id: user.id, video_id: videoId });

  if (insertError) {
    return NextResponse.json({ message: "いいねに失敗しました。" }, { status: 500 });
  }

  const { count } = await supabase
    .from("likes")
    .select("video_id", { count: "exact", head: true })
    .eq("video_id", videoId);

  const nextCount = count ?? 0;
  await supabase
    .from("videos")
    .update({ like_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", videoId);

  return NextResponse.json({ liked: true, likeCount: nextCount });
}
