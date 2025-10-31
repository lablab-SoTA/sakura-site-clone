"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type VideoWatchProps = {
  videoId: string;
  src: string;
  title: string;
  description: string | null;
  initialLikeCount: number;
  initialViewCount: number;
  ownerId: string;
  width: number | null;
  height: number | null;
  tags: string[];
  thumbnailUrl?: string | null;
  episodeNumber?: number;
  episodeCount?: number;
  seriesId?: string | null;
  seriesSlug?: string | null;
  firstEpisodeId?: string | null;
};

type LikeState = "liked" | "unliked" | "unknown";

type LikeResponse = {
  liked: boolean;
  likeCount: number;
};

type ViewResponse = {
  viewCount: number;
};

function sanitizeObjectKey(rawName: string, fallback: string) {
  const normalized = rawName.normalize("NFKC");
  const dotIndex = normalized.lastIndexOf(".");
  const base = dotIndex > 0 ? normalized.slice(0, dotIndex) : normalized;
  const extension = dotIndex > 0 ? normalized.slice(dotIndex) : "";
  const sanitizedBase = base
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+/, "")
    .replace(/[-_]+$/, "");
  const safeBase = sanitizedBase.length > 0 ? sanitizedBase : fallback;
  const safeExtension = extension.replace(/[^A-Za-z0-9.]/g, "").toLowerCase();
  return `${safeBase}${safeExtension}`;
}

function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function joinTags(tags: string[]): string {
  return tags.join(", ");
}

export default function VideoWatch({
  videoId,
  src,
  title,
  description,
  initialLikeCount,
  initialViewCount,
  ownerId,
  width,
  height,
  tags: initialTags,
  thumbnailUrl,
  episodeNumber,
  episodeCount,
  firstEpisodeId,
}: VideoWatchProps) {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const editThumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);

  const [likeState, setLikeState] = useState<LikeState>("unknown");
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [message, setMessage] = useState<ReactNode>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);

  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentDescription, setCurrentDescription] = useState<string | null>(description ?? null);
  const [currentTags, setCurrentTags] = useState<string[]>([...initialTags]);
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(thumbnailUrl ?? null);

  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editTags, setEditTags] = useState(joinTags(initialTags));
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimerRef.current !== null) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  }, []);

  const hideControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(false);
  }, [clearHideTimer]);

  const showControlsTemporarily = useCallback(
    (durationMs = 3000) => {
      setControlsVisible(true);
      clearHideTimer();
      if (durationMs > 0) {
        hideControlsTimerRef.current = window.setTimeout(() => {
          setControlsVisible(false);
          hideControlsTimerRef.current = null;
        }, durationMs);
      }
    },
    [clearHideTimer],
  );

  const showControlsIndefinitely = useCallback(() => {
    showControlsTemporarily(0);
  }, [showControlsTemporarily]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    const resolveSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setAccessToken(data.session.access_token);
        setIsOwner(data.session.user.id === ownerId);
        const { data: liked } = await supabase
          .from("likes")
          .select("video_id")
          .eq("video_id", videoId)
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        setLikeState(liked ? "liked" : "unliked");
      } else {
        setAccessToken(null);
        setLikeState("unliked");
        setIsOwner(false);
      }
    };

    resolveSession();
  }, [ownerId, supabase, videoId]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    element.controls = controlsVisible;
  }, [controlsVisible]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    const tryPlay = () => {
      element.muted = false;
      const playPromise = element.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {
          setMessage((prev) => prev ?? "自動再生がブロックされた場合は再生ボタンを押してください。");
        });
      }
    };

    tryPlay();
    element.addEventListener("loadeddata", tryPlay, { once: true });

    return () => {
      element.removeEventListener("loadeddata", tryPlay);
    };
  }, [src]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    const showByInteraction = () => {
      if (element.paused || element.ended) {
        showControlsIndefinitely();
      } else {
        showControlsTemporarily();
      }
    };

    const revealIndefinitely = () => showControlsIndefinitely();
    const handleLeave = () => {
      if (!element.paused && !element.ended) {
        hideControls();
      }
    };

    element.addEventListener("pointermove", showByInteraction);
    element.addEventListener("pointerdown", showByInteraction);
    element.addEventListener("touchstart", showByInteraction, { passive: true });
    element.addEventListener("touchmove", showByInteraction, { passive: true });
    element.addEventListener("pause", revealIndefinitely);
    element.addEventListener("ended", revealIndefinitely);
    element.addEventListener("mouseenter", showByInteraction);
    element.addEventListener("mouseleave", handleLeave);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!element) return;
      const target = event.target as Node | null;
      if (target && target !== element && !element.contains(target)) {
        return;
      }
      showByInteraction();
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      element.removeEventListener("pointermove", showByInteraction);
      element.removeEventListener("pointerdown", showByInteraction);
      element.removeEventListener("touchstart", showByInteraction);
      element.removeEventListener("touchmove", showByInteraction);
      element.removeEventListener("pause", revealIndefinitely);
      element.removeEventListener("ended", revealIndefinitely);
      element.removeEventListener("mouseenter", showByInteraction);
      element.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [hideControls, showControlsIndefinitely, showControlsTemporarily]);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  useEffect(() => {
    setCurrentDescription(description ?? null);
  }, [description]);

  useEffect(() => {
    setCurrentTags([...initialTags]);
  }, [initialTags]);

  useEffect(() => {
    setCurrentThumbnailUrl(thumbnailUrl ?? null);
  }, [thumbnailUrl]);

  useEffect(() => {
    return () => {
      if (editThumbnailPreview) {
        URL.revokeObjectURL(editThumbnailPreview);
      }
    };
  }, [editThumbnailPreview]);

  const handleToggleLike = useCallback(async () => {
    if (!accessToken) {
      setMessage(
        <span>
          いいねするには
          {" "}
          <Link href="/auth/login" style={{ textDecoration: "underline" }}>
            ログイン
          </Link>
          {" "}が必要です。
        </span>,
      );
      return;
    }

    if (likeState === "unknown" || isTogglingLike) {
      return;
    }

    const currentState = likeState;
    const currentCount = likeCount;
    const nextState = likeState === "liked" ? "unliked" : "liked";
    const delta = nextState === "liked" ? 1 : -1;

    setIsTogglingLike(true);
    try {
      setLikeState(nextState);
      setLikeCount((prev) => Math.max(0, prev + delta));
      setMessage(null);

      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("failed");
      }

      const payload = (await response.json()) as LikeResponse;
      setLikeCount(payload.likeCount);
      setLikeState(payload.liked ? "liked" : "unliked");
      setMessage(null);
    } catch {
      setLikeState(currentState);
      setLikeCount(currentCount);
      setMessage("いいねの切り替えに失敗しました。");
    } finally {
      setIsTogglingLike(false);
    }
  }, [accessToken, isTogglingLike, likeCount, likeState, videoId]);

  const handlePlay = useCallback(async () => {
    hideControls();

    const storageKey = `xanime_view_${videoId}`;
    if (typeof window !== "undefined") {
      const alreadyCounted = localStorage.getItem(storageKey);
      if (alreadyCounted) {
        return;
      }
    }

    const response = await fetch(`/api/videos/${videoId}/view`, {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as ViewResponse;
    setViewCount((prev) => payload.viewCount ?? prev + 1);

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "1");
    }
  }, [hideControls, videoId]);

  const resetThumbnailSelection = useCallback(() => {
    setEditThumbnailFile(null);
    setEditThumbnailPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    if (editThumbnailInputRef.current) {
      editThumbnailInputRef.current.value = "";
    }
  }, []);

  const openEditor = useCallback(() => {
    resetThumbnailSelection();
    setEditTitle(currentTitle);
    setEditDescription(currentDescription ?? "");
    setEditTags(joinTags(currentTags));
    setRemoveThumbnail(false);
    setEditError(null);
    setIsEditorOpen(true);
  }, [currentDescription, currentTags, currentTitle, resetThumbnailSelection]);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    resetThumbnailSelection();
    setRemoveThumbnail(false);
    setEditError(null);
  }, [resetThumbnailSelection]);

  const handleThumbnailFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setEditThumbnailFile(nextFile);
    setEditThumbnailPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return nextFile ? URL.createObjectURL(nextFile) : null;
    });
    if (!nextFile && event.target.value) {
      event.target.value = "";
    }
    setRemoveThumbnail(false);
  }, []);

  const handleClearThumbnailSelection = useCallback(() => {
    resetThumbnailSelection();
    setRemoveThumbnail(false);
  }, [resetThumbnailSelection]);

  const handleToggleRemoveThumbnail = useCallback(() => {
    setRemoveThumbnail((previous) => {
      const next = !previous;
      if (next) {
        resetThumbnailSelection();
      }
      return next;
    });
  }, [resetThumbnailSelection]);

  const handleSaveEdits = useCallback(async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditError("タイトルを入力してください。");
      return;
    }

    let activeAccessToken = accessToken;
    if (!activeAccessToken) {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setEditError("ログイン状態の確認に失敗しました。時間をおいて再試行してください。");
        return;
      }
      activeAccessToken = data.session?.access_token ?? null;
      if (!activeAccessToken) {
        setEditError("動画を編集するにはログインが必要です。");
        return;
      }
      setAccessToken(activeAccessToken);
    }

    setIsSaving(true);
    setEditError(null);

    const storage = supabase.storage.from("video");
    let uploadedThumbnailPath: string | null = null;
    let uploadedThumbnailUrl: string | null = null;

    const preparedTags = parseTagsInput(editTags);
    const tagsAsString = preparedTags.length > 0 ? joinTags(preparedTags) : "";
    const trimmedDescription = editDescription.trim();

    try {
      if (editThumbnailFile) {
        const uploadId = crypto.randomUUID();
        const sanitized = sanitizeObjectKey(editThumbnailFile.name, "thumbnail");
        const targetPath = `${ownerId}/thumbnails/${uploadId}-${sanitized}`;
        const { error: uploadError } = await storage.upload(targetPath, editThumbnailFile, {
          cacheControl: "3600",
          upsert: false,
        });

        if (uploadError) {
          throw new Error(uploadError.message ?? "サムネイルのアップロードに失敗しました。");
        }

        uploadedThumbnailPath = targetPath;
        const {
          data: { publicUrl },
        } = storage.getPublicUrl(targetPath);
        uploadedThumbnailUrl = publicUrl;
      }

      const payload: Record<string, unknown> = {
        title: trimmedTitle,
        description: trimmedDescription,
        tags: tagsAsString,
      };

      if (uploadedThumbnailUrl) {
        payload.thumbnailUrl = uploadedThumbnailUrl;
      } else if (removeThumbnail) {
        payload.removeThumbnail = true;
      }

      const response = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeAccessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const payloadBody = (await response.json().catch(() => null)) as
        | {
            message?: string;
            video?: {
              title: string;
              description: string | null;
              tags: string | null;
              thumbnail_url: string | null;
            };
          }
        | null;

      if (!response.ok) {
        const messageText = payloadBody?.message ?? "動画情報の更新に失敗しました。";
        throw new Error(messageText);
      }

      const updated = payloadBody?.video;
      if (!updated) {
        throw new Error("更新後の動画情報を取得できませんでした。");
      }

      const nextTags = parseTagsInput(updated.tags ?? "");
      setCurrentTitle(updated.title);
      setCurrentDescription(updated.description ?? null);
      setCurrentTags(nextTags);
      setCurrentThumbnailUrl(updated.thumbnail_url ?? null);
      setMessage("動画情報を更新しました。");
      closeEditor();
    } catch (unknownError) {
      if (uploadedThumbnailPath) {
        await storage.remove([uploadedThumbnailPath]).catch(() => undefined);
      }
      const fallbackMessage =
        unknownError instanceof Error ? unknownError.message : "動画情報の更新に失敗しました。";
      setEditError(fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  }, [
    accessToken,
    closeEditor,
    editDescription,
    editTags,
    editThumbnailFile,
    editTitle,
    ownerId,
    removeThumbnail,
    supabase,
    videoId,
  ]);

  const likeLabel = useMemo(() => (likeState === "liked" ? "いいね済み" : "いいね"), [likeState]);
  const saveLabel = isSaving ? "保存中..." : "変更を保存";
  const deleteLabel = isDeleting ? "削除中..." : "動画を削除";
  const videoStyle = useMemo(() => {
    if (width && height && width > 0 && height > 0) {
      return {
        aspectRatio: `${width} / ${height}`,
      } as const;
    }
    return undefined;
  }, [height, width]);
  const episodeLabel = useMemo(() => {
    if (typeof episodeNumber !== "number") {
      return null;
    }
    const formatter = new Intl.NumberFormat("ja-JP");
    const numberText = formatter.format(episodeNumber);
    const totalText =
      typeof episodeCount === "number" && episodeCount > 0
        ? ` / 全${formatter.format(episodeCount)}話`
        : "";
    return `第${numberText}話${totalText}`;
  }, [episodeCount, episodeNumber]);

  const handleDelete = useCallback(async () => {
    if (!accessToken) {
      setMessage("動画を削除するにはログインが必要です。");
      return;
    }

    const confirmed =
      typeof window === "undefined" ? true : window.confirm("この動画を削除しますか？この操作は元に戻せません。");

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    const response = await fetch(`/api/videos/${videoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    setIsDeleting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(payload?.message ?? "動画の削除に失敗しました。時間をおいて再試行してください。");
      return;
    }

    setMessage("動画を削除しました。マイページへ移動します。");
    router.replace("/settings/profile");
  }, [accessToken, router, videoId]);

  return (
    <div className="video-watch">
      <div className="video-watch__media">
        <video
          ref={videoRef}
          controls={controlsVisible}
          autoPlay
          playsInline
          preload="auto"
          src={src}
          onPlay={handlePlay}
          style={videoStyle}
          controlsList="nodownload noplaybackrate"
        />
      </div>
      <div className="video-watch__body">
        <div>
          {episodeLabel && <p className="video-watch__episode-label">{episodeLabel}</p>}
          {firstEpisodeId ? (
            <h1 className="video-watch__title">
              <Link href={`/videos/${firstEpisodeId}`} className="video-watch__title-link">
                {currentTitle}
              </Link>
            </h1>
          ) : (
            <h1 className="video-watch__title">{currentTitle}</h1>
          )}
          <p className="video-watch__stats">
            <span>{viewCount.toLocaleString()} 再生</span>
            <span>{likeCount.toLocaleString()} いいね</span>
          </p>
        </div>
        <div className="video-watch__actions">
          <div className="video-watch__action-group">
            <button
              type="button"
              className={`video-watch__like button ${likeState === "liked" ? "video-watch__like--active" : ""}`}
              onClick={handleToggleLike}
              disabled={likeState === "unknown" || isTogglingLike}
            >
              {likeLabel}
            </button>
            <a href={`/report/${videoId}`} className="video-watch__report">
              通報する
            </a>
          </div>
          {isOwner && (
            <button type="button" className="video-watch__edit button button--ghost" onClick={openEditor}>
              動画を編集
            </button>
          )}
        </div>
        {currentDescription && <p className="video-watch__description">{currentDescription}</p>}
        {currentTags.length > 0 && (
          <ul className="video-watch__tags">
            {currentTags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        )}
        {message && <p className="video-watch__message">{message}</p>}
      </div>
      {isOwner && isEditorOpen && (
        <div className="video-watch__editor-overlay" role="dialog" aria-modal="true">
          <div className="video-watch__editor">
            <h2 className="video-watch__editor-title">動画を編集</h2>
            {editError && <p className="video-watch__editor-error">{editError}</p>}
            <div className="video-watch__editor-field">
              <label className="video-watch__editor-label" htmlFor="video-edit-title">
                タイトル
              </label>
              <input
                id="video-edit-title"
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>
            <div className="video-watch__editor-field">
              <label className="video-watch__editor-label" htmlFor="video-edit-description">
                説明
              </label>
              <textarea
                id="video-edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
              />
            </div>
            <div className="video-watch__editor-field">
              <label className="video-watch__editor-label" htmlFor="video-edit-tags">
                タグ（カンマ区切り）
              </label>
              <input
                id="video-edit-tags"
                type="text"
                value={editTags}
                onChange={(event) => setEditTags(event.target.value)}
                placeholder="例: 温泉, 癒やし"
              />
            </div>
            <div className="video-watch__editor-field">
              <span className="video-watch__editor-label">サムネイル</span>
              <div className="video-watch__editor-thumbnail">
                {editThumbnailPreview ? (
                  <img src={editThumbnailPreview} alt="" />
                ) : currentThumbnailUrl && !removeThumbnail ? (
                  <img src={currentThumbnailUrl} alt="" />
                ) : (
                  <div className="video-watch__editor-thumbnail-placeholder">サムネイル未設定</div>
                )}
              </div>
              <div className="video-watch__editor-thumbnail-actions">
                <label className="button button--ghost video-watch__editor-file-button">
                  ファイルを選択
                  <input
                    ref={editThumbnailInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleThumbnailFileChange}
                  />
                </label>
                {editThumbnailFile && (
                  <button type="button" className="button button--ghost" onClick={handleClearThumbnailSelection}>
                    選択をクリア
                  </button>
                )}
                {currentThumbnailUrl && (
                  <label className="video-watch__editor-remove">
                    <input
                      type="checkbox"
                      checked={removeThumbnail}
                      onChange={handleToggleRemoveThumbnail}
                      disabled={!!editThumbnailFile}
                    />
                    <span>現在のサムネイルを削除する</span>
                  </label>
                )}
              </div>
            </div>
            <div className="video-watch__editor-actions">
              <button type="button" className="button" onClick={handleSaveEdits} disabled={isSaving}>
                {saveLabel}
              </button>
              <button type="button" className="button button--ghost" onClick={closeEditor} disabled={isSaving}>
                キャンセル
              </button>
            </div>
            <div className="video-watch__editor-divider" role="separator" />
            <div className="video-watch__editor-danger">
              <p className="video-watch__editor-danger-text">動画を削除する場合はこちら</p>
              <button
                type="button"
                className="video-watch__delete button button--ghost"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {deleteLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
