import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

type ReportPayload = {
  videoId: string;
  reason: string;
  message?: string | null;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  const body = (await request.json().catch(() => null)) as ReportPayload | null;

  if (!body || !body.videoId || !body.reason) {
    return NextResponse.json({ message: "必要な情報が不足しています。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user?.id ?? null,
    video_id: body.videoId,
    reason: body.reason,
    message: body.message ?? null,
  });

  if (error) {
    return NextResponse.json({ message: "通報の送信に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
