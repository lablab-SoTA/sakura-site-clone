import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";

/**
 * Supabase Storage の公開URLからバケット内のパスを取り出すヘルパー。
 * 対応バケットは video のみ。
 */
const STORAGE_PUBLIC_PATH_PREFIX = "/storage/v1/object/public/video/";

function extractStoragePathFromPublicUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const prefixIndex = parsedUrl.pathname.indexOf(STORAGE_PUBLIC_PATH_PREFIX);

    if (prefixIndex === -1) {
      return null;
    }

    const path = parsedUrl.pathname.slice(prefixIndex + STORAGE_PUBLIC_PATH_PREFIX.length);

    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

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
    .select("id, owner_id, file_path, thumbnail_url")
    .eq("id", videoId)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ message: "動画が見つかりません。" }, { status: 404 });
  }

  if (video.owner_id !== user.id) {
    return NextResponse.json({ message: "この動画を削除する権限がありません。" }, { status: 403 });
  }

  const storage = supabase.storage.from("video");
  const objectsToRemove = new Set<string>();
  objectsToRemove.add(video.file_path);

  const thumbnailPath = extractStoragePathFromPublicUrl(video.thumbnail_url ?? null);

  if (thumbnailPath) {
    objectsToRemove.add(thumbnailPath);
  }

  if (objectsToRemove.size > 0) {
    const { error: storageError } = await storage.remove(Array.from(objectsToRemove));

    if (storageError) {
      return NextResponse.json({ message: "動画ファイルの削除に失敗しました。" }, { status: 500 });
    }
  }

  const { error } = await supabase.from("videos").delete().eq("id", videoId);

  if (error) {
    return NextResponse.json({ message: "動画の削除に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ message: "動画を削除しました。" });
}
