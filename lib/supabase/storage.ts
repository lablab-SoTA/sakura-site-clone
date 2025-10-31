const VIDEO_STORAGE_PREFIX = "/storage/v1/object/public/video/";

/**
 * Supabase Storage の公開URLから video バケット内のオブジェクトパスを抽出する。
 * 対象URLでない場合は null を返す。
 */
export function extractVideoStoragePath(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const prefixIndex = parsedUrl.pathname.indexOf(VIDEO_STORAGE_PREFIX);

    if (prefixIndex === -1) {
      return null;
    }

    const rawPath = parsedUrl.pathname.slice(prefixIndex + VIDEO_STORAGE_PREFIX.length);

    return rawPath ? decodeURIComponent(rawPath) : null;
  } catch {
    return null;
  }
}
