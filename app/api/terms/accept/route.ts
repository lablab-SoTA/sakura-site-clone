import { NextResponse } from "next/server";

import { TERMS_VERSION } from "@/lib/constants";
import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

type TermsPayload = {
  version?: string;
  noRepost: boolean;
  mosaic: boolean;
  adult: boolean;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as TermsPayload | null;

  if (!body) {
    return NextResponse.json({ message: "リクエスト本文が不正です。" }, { status: 400 });
  }

  if (!body.noRepost || !body.mosaic || !body.adult) {
    return NextResponse.json({ message: "すべてのチェック項目に同意してください。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const version = body.version ?? TERMS_VERSION;

  const { error } = await supabase.from("terms_acceptances").insert({
    user_id: user.id,
    version,
    no_repost: body.noRepost,
    mosaic: body.mosaic,
    adult: body.adult,
  });

  if (error) {
    return NextResponse.json({ message: "同意の保存に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
