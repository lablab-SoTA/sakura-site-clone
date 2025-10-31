import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";
import { extractVideoStoragePath } from "@/lib/supabase/storage";

type DeleteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: DeleteContext) {
  const { id: episodeId } = await context.params;
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  if (!episodeId) {
    return NextResponse.json({ message: "エピソードIDが不正です。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: episode } = await supabase
    .from("episodes")
    .select("season_id, thumbnail_url")
    .eq("id", episodeId)
    .maybeSingle();

  if (!episode) {
    return NextResponse.json({ message: "エピソードが見つかりません。" }, { status: 404 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("series_id")
    .eq("id", episode.season_id)
    .maybeSingle();

  if (!season) {
    return NextResponse.json({ message: "シーズン情報が見つかりません。" }, { status: 404 });
  }

  const { data: series } = await supabase
    .from("series")
    .select("owner_id")
    .eq("id", season.series_id)
    .maybeSingle();

  if (!series || series.owner_id !== user.id) {
    return NextResponse.json({ message: "エピソードを削除する権限がありません。" }, { status: 403 });
  }

  const { data: videoFile } = await supabase
    .from("video_files")
    .select("file_path, thumbnail_url")
    .eq("episode_id", episodeId)
    .maybeSingle();

  const storage = supabase.storage.from("video");
  const pathsToRemove = new Set<string>();

  if (videoFile?.file_path) {
    pathsToRemove.add(videoFile.file_path);
  }

  if (episode.thumbnail_url) {
    const episodeThumbPath = extractVideoStoragePath(episode.thumbnail_url);
    if (episodeThumbPath) {
      pathsToRemove.add(episodeThumbPath);
    }
  }

  if (videoFile?.thumbnail_url) {
    const storedThumbPath = extractVideoStoragePath(videoFile.thumbnail_url);
    if (storedThumbPath) {
      pathsToRemove.add(storedThumbPath);
    }
  }

  if (pathsToRemove.size > 0) {
    const { error: storageError } = await storage.remove(Array.from(pathsToRemove));

    if (storageError) {
      return NextResponse.json({ message: "動画ファイルの削除に失敗しました。" }, { status: 500 });
    }
  }

  const { error: deleteError } = await supabase.from("episodes").delete().eq("id", episodeId);

  if (deleteError) {
    return NextResponse.json({ message: "エピソードの削除に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ message: "エピソードを削除しました。" });
}
