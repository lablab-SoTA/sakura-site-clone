import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";
import { extractVideoStoragePath } from "@/lib/supabase/storage";

type VideoUpdatePayload = {
  title?: string;
  description?: string | null;
  tags?: string | null;
  thumbnailUrl?: string | null;
  removeThumbnail?: boolean;
};

export async function PATCH(
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

  const body = (await request.json().catch(() => null)) as VideoUpdatePayload | null;

  if (!body) {
    return NextResponse.json({ message: "更新内容が取得できませんでした。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: video } = await supabase
    .from("videos")
    .select("id, owner_id, title, description, tags, thumbnail_url")
    .eq("id", videoId)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ message: "動画が見つかりません。" }, { status: 404 });
  }

  if (video.owner_id !== user.id) {
    return NextResponse.json({ message: "この動画を更新する権限がありません。" }, { status: 403 });
  }

  const { data: episode } = await supabase
    .from("episodes")
    .select("id")
    .eq("id", videoId)
    .maybeSingle();

  const updateData: Record<string, unknown> = {};
  let nextTitleValue: string | undefined;
  let nextDescriptionValue: string | null | undefined;
  let nextTagsValue: string[] | undefined;
  let nextThumbnailUrlValue: string | null | undefined;

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    const candidateTitle = (body.title ?? "").trim();
    if (!candidateTitle) {
      return NextResponse.json({ message: "タイトルを入力してください。" }, { status: 400 });
    }
    updateData.title = candidateTitle;
    nextTitleValue = candidateTitle;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const candidateDescription = body.description?.toString().trim() ?? "";
    updateData.description = candidateDescription.length > 0 ? candidateDescription : null;
    nextDescriptionValue = candidateDescription.length > 0 ? candidateDescription : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    const rawTags = body.tags?.toString() ?? "";
    const trimmed = rawTags.trim();
    updateData.tags = trimmed.length > 0 ? trimmed : null;
    nextTagsValue = trimmed.length > 0
      ? trimmed
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];
    if (nextTagsValue.length === 0) {
      nextTagsValue = [];
    }
  }

  let shouldDeletePreviousThumbnail = false;

  if (Object.prototype.hasOwnProperty.call(body, "thumbnailUrl")) {
    const nextThumbnail = body.thumbnailUrl?.toString().trim() ?? null;
    updateData.thumbnail_url = nextThumbnail && nextThumbnail.length > 0 ? nextThumbnail : null;
    shouldDeletePreviousThumbnail = true;
    nextThumbnailUrlValue = nextThumbnail && nextThumbnail.length > 0 ? nextThumbnail : null;
  } else if (body.removeThumbnail) {
    updateData.thumbnail_url = null;
    shouldDeletePreviousThumbnail = true;
    nextThumbnailUrlValue = null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "更新対象の項目が見つかりませんでした。" }, { status: 400 });
  }

  updateData.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("videos")
    .update(updateData)
    .eq("id", videoId)
    .select("id, title, description, tags, thumbnail_url, updated_at")
    .single();

  if (error || !updated) {
    return NextResponse.json({ message: "動画情報の更新に失敗しました。" }, { status: 500 });
  }

  if (episode) {
    const episodeUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (nextTitleValue !== undefined) {
      episodeUpdate.title_raw = nextTitleValue;
      episodeUpdate.title_clean = nextTitleValue;
    }
    if (nextDescriptionValue !== undefined) {
      episodeUpdate.description = nextDescriptionValue;
    }
    if (nextTagsValue !== undefined) {
      episodeUpdate.tags = nextTagsValue;
    }
    if (nextThumbnailUrlValue !== undefined) {
      episodeUpdate.thumbnail_url = nextThumbnailUrlValue;
    }

    if (Object.keys(episodeUpdate).length > 1) {
      const { error: episodeError } = await supabase
        .from("episodes")
        .update(episodeUpdate)
        .eq("id", videoId);

      if (episodeError) {
        console.error("エピソード情報の同期に失敗しました:", episodeError);
      }
    }

    if (nextThumbnailUrlValue !== undefined) {
      const { error: fileThumbError } = await supabase
        .from("video_files")
        .update({ thumbnail_url: nextThumbnailUrlValue, updated_at: new Date().toISOString() })
        .eq("episode_id", videoId);

      if (fileThumbError) {
        console.error("動画ファイルのサムネイル更新に失敗しました:", fileThumbError);
      }
    }
  }

  if (shouldDeletePreviousThumbnail) {
    const previousPath = extractVideoStoragePath(video.thumbnail_url ?? null);
    const nextPath = extractVideoStoragePath((updateData.thumbnail_url as string | null) ?? null);

    if (previousPath && previousPath !== nextPath) {
      await supabase.storage.from("video").remove([previousPath]).catch(() => undefined);
    }
  }

  return NextResponse.json({ video: updated });
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

  const { data: episode } = await supabase
    .from("episodes")
    .select("thumbnail_url")
    .eq("id", videoId)
    .maybeSingle();

  const { data: videoFile } = await supabase
    .from("video_files")
    .select("file_path, thumbnail_url")
    .eq("episode_id", videoId)
    .maybeSingle();

  const storage = supabase.storage.from("video");
  const objectsToRemove = new Set<string>();
  objectsToRemove.add(video.file_path);

  const thumbnailPath = extractVideoStoragePath(video.thumbnail_url ?? null);

  if (thumbnailPath) {
    objectsToRemove.add(thumbnailPath);
  }

  if (episode?.thumbnail_url) {
    const episodeThumbPath = extractVideoStoragePath(episode.thumbnail_url);
    if (episodeThumbPath) {
      objectsToRemove.add(episodeThumbPath);
    }
  }

  if (videoFile?.file_path) {
    objectsToRemove.add(videoFile.file_path);
  }

  if (videoFile?.thumbnail_url) {
    const fileThumbPath = extractVideoStoragePath(videoFile.thumbnail_url);
    if (fileThumbPath) {
      objectsToRemove.add(fileThumbPath);
    }
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

  const { error: episodeDeleteError } = await supabase.from("episodes").delete().eq("id", videoId);

  if (episodeDeleteError) {
    console.error("エピソードの削除に失敗しました:", episodeDeleteError);
  }

  return NextResponse.json({ message: "動画を削除しました。" });
}
