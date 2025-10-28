import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

type SeriesPayload = {
  title: string;
  description?: string | null;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SeriesPayload | null;

  if (!body || !body.title) {
    return NextResponse.json({ message: "シリーズ名を入力してください。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("series")
    .insert({
      owner_id: user.id,
      title: body.title,
      description: body.description ?? null,
    })
    .select("id, title")
    .single();

  if (error) {
    return NextResponse.json({ message: "シリーズの作成に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ series: data });
}
