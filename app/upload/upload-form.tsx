"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type UploadType = "single" | "new-series" | "existing-series";

type SeriesOption = {
  id: string;
  title: string;
};

export default function UploadForm() {
  const supabase = getBrowserSupabaseClient();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [type, setType] = useState<UploadType>("single");
  const [seriesId, setSeriesId] = useState<string>("");
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDescription, setNewSeriesDescription] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [noRepost, setNoRepost] = useState(false);
  const [mosaicConfirmed, setMosaicConfirmed] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const setup = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionUserId(data.session.user.id);
        setAccessToken(data.session.access_token);
      }
    };

    setup();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionUserId(session.user.id);
        setAccessToken(session.access_token);
      } else {
        setSessionUserId(null);
        setAccessToken(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const loadSeries = async () => {
      if (!sessionUserId) {
        setSeriesOptions([]);
        return;
      }

      const { data, error } = await supabase
        .from("series")
        .select("id, title")
        .eq("owner_id", sessionUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("シリーズの取得に失敗しました", error);
        return;
      }

      setSeriesOptions(data ?? []);
    };

    loadSeries();
  }, [sessionUserId, supabase]);

  const canSubmit = useMemo(() => {
    if (!title || !file || !thumbnailFile || !noRepost || !mosaicConfirmed || !isAdult) {
      return false;
    }

    if (type === "existing-series" && !seriesId) {
      return false;
    }

    if (type === "new-series" && !newSeriesTitle) {
      return false;
    }

    return true;
  }, [file, isAdult, mosaicConfirmed, newSeriesTitle, noRepost, seriesId, thumbnailFile, title, type]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !sessionUserId) {
      setError("アップロードにはログインが必要です。");
      return;
    }

    if (!file) {
      setError("動画ファイルを選択してください。");
      return;
    }

    if (!thumbnailFile) {
      setError("サムネイル画像を選択してください。");
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        let resolvedSeriesId: string | null = null;
        const storage = supabase.storage.from("video");
        const uploadedPaths: string[] = [];

        if (type === "existing-series") {
          resolvedSeriesId = seriesId;
        }

        if (type === "new-series") {
          const response = await fetch("/api/series", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              title: newSeriesTitle,
              description: newSeriesDescription || null,
            }),
          });

          if (!response.ok) {
            const payload = await response
              .json()
              .catch(() => ({ message: "シリーズの作成に失敗しました。" }));
            throw new Error(payload.message ?? "シリーズの作成に失敗しました。");
          }

          const payload = await response.json();
          const createdSeries = payload.series ?? null;
          resolvedSeriesId = createdSeries?.id ?? null;

          if (createdSeries) {
            setSeriesOptions((prev) => [createdSeries, ...prev]);
          }
        }

        const uploadId = crypto.randomUUID();
        const videoPath = `${sessionUserId}/${uploadId}-${file.name}`;
        const { error: uploadError } = await storage.upload(videoPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPaths.push(videoPath);

        const thumbnailPath = `${sessionUserId}/thumbnails/${uploadId}-${thumbnailFile.name}`;
        const { error: thumbnailError } = await storage.upload(thumbnailPath, thumbnailFile, {
          cacheControl: "3600",
          upsert: false,
        });

        if (thumbnailError) {
          await storage.remove(uploadedPaths).catch(() => undefined);
          throw new Error(thumbnailError.message ?? "サムネイルのアップロードに失敗しました。");
        }

        uploadedPaths.push(thumbnailPath);

        const {
          data: { publicUrl },
        } = storage.getPublicUrl(videoPath);

        const {
          data: { publicUrl: thumbnailUrl },
        } = storage.getPublicUrl(thumbnailPath);

        const videoResponse = await fetch("/api/videos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            type,
            seriesId: resolvedSeriesId,
            title,
            description: description || null,
            tags: tags || null,
            filePath: videoPath,
            publicUrl,
            thumbnailUrl,
            mosaicConfirmed,
            noRepost,
            isAdult,
          }),
        });

        if (!videoResponse.ok) {
          await storage.remove(uploadedPaths).catch(() => undefined);
          const payload = await videoResponse
            .json()
            .catch(() => ({ message: "動画の登録に失敗しました。" }));
          throw new Error(payload.message ?? "動画の登録に失敗しました。");
        }

        setMessage("アップロードが完了しました。公開ページを確認してください。");
        setTitle("");
        setDescription("");
        setTags("");
        setFile(null);
        setThumbnailFile(null);
        setNoRepost(false);
        setMosaicConfirmed(false);
        setIsAdult(false);
        setNewSeriesTitle("");
        setNewSeriesDescription("");
        setSeriesId("");
        if (videoInputRef.current) {
          videoInputRef.current.value = "";
        }
        if (thumbnailInputRef.current) {
          thumbnailInputRef.current.value = "";
        }
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "アップロードに失敗しました。";
        setError(message);
      }
    });
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <fieldset className="upload-form__fieldset">
        <legend>投稿タイプ</legend>
        <label className="upload-form__radio">
          <input
            type="radio"
            name="type"
            value="single"
            checked={type === "single"}
            onChange={() => setType("single")}
          />
          <span>単発投稿</span>
        </label>
        <label className="upload-form__radio">
          <input
            type="radio"
            name="type"
            value="new-series"
            checked={type === "new-series"}
            onChange={() => setType("new-series")}
          />
          <span>シリーズを新規作成</span>
        </label>
        <label className="upload-form__radio">
          <input
            type="radio"
            name="type"
            value="existing-series"
            checked={type === "existing-series"}
            onChange={() => setType("existing-series")}
          />
          <span>既存シリーズに追加</span>
        </label>
      </fieldset>

      {type === "new-series" && (
        <div className="upload-form__group">
          <label className="upload-form__field">
            <span>シリーズ名</span>
            <input
              type="text"
              value={newSeriesTitle}
              onChange={(event) => setNewSeriesTitle(event.target.value)}
              required
            />
          </label>
          <label className="upload-form__field">
            <span>シリーズ説明（任意）</span>
            <textarea
              value={newSeriesDescription}
              onChange={(event) => setNewSeriesDescription(event.target.value)}
              rows={3}
            />
          </label>
        </div>
      )}

      {type === "existing-series" && (
        <div className="upload-form__group">
          <label className="upload-form__field">
            <span>シリーズを選択</span>
            <select value={seriesId} onChange={(event) => setSeriesId(event.target.value)} required>
              <option value="">選択してください</option>
              {seriesOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="upload-form__field">
        <span>作品タイトル</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </label>

      <label className="upload-form__field">
        <span>説明（任意）</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </label>

      <label className="upload-form__field">
        <span>タグ（カンマ区切り）</span>
        <input
          type="text"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="例: アクション, ファンタジー"
        />
      </label>

      <label className="upload-form__field">
        <span>動画ファイル（MP4推奨）</span>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
      </label>

      <label className="upload-form__field">
        <span>サムネイル画像</span>
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)}
          required
        />
        <small className="upload-form__hint">推奨サイズ: 16:9 / 1280×720px 以上</small>
      </label>

      <div className="upload-form__checks">
        <label className="upload-form__checkbox">
          <input
            type="checkbox"
            checked={noRepost}
            onChange={(event) => setNoRepost(event.target.checked)}
            required
          />
          <span>私は転載禁止に同意します。</span>
        </label>
        <label className="upload-form__checkbox">
          <input
            type="checkbox"
            checked={mosaicConfirmed}
            onChange={(event) => setMosaicConfirmed(event.target.checked)}
            required
          />
          <span>局部にはモザイクが入っています。</span>
        </label>
        <label className="upload-form__checkbox">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(event) => setIsAdult(event.target.checked)}
            required
          />
          <span>この作品は18禁であり、私は18歳以上です。</span>
        </label>
      </div>

      {error && (
        <p className="upload-form__error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="upload-form__message">{message}</p>}

      <button type="submit" className="button" disabled={!canSubmit || isPending}>
        {isPending ? "アップロード中..." : "公開する"}
      </button>
    </form>
  );
}
