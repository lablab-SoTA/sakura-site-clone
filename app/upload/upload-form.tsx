"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type UploadType = "new-series" | "existing-series";

type SeriesOption = {
  id: string;
  title: string;
};

export default function UploadForm() {
  const supabase = getBrowserSupabaseClient();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [type, setType] = useState<UploadType>("new-series");
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
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [hasPromptedVideo, setHasPromptedVideo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }

        if (sessionError) {
          console.error("ログイン状態の取得に失敗しました", sessionError);
          setSessionUserId(null);
          setAccessToken(null);
          setError("ログイン状態の確認に失敗しました。時間をおいて再度お試しください。");
          return;
        }

        if (data.session) {
          setSessionUserId(data.session.user.id);
          setAccessToken(data.session.access_token);
          setError(null);
        } else {
          setSessionUserId(null);
          setAccessToken(null);
          setError(null);
        }
      } catch (unknownError) {
        console.error("ログイン状態の確認中にエラーが発生しました", unknownError);
        if (!isMounted) {
          return;
        }
        setSessionUserId(null);
        setAccessToken(null);
        setError("ログイン状態の確認に失敗しました。時間をおいて再度お試しください。");
      } finally {
        if (isMounted) {
          setIsSessionResolved(true);
        }
      }
    };

    setup();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        setSessionUserId(session ? session.user.id : null);
        setAccessToken(session ? session.access_token : null);
        if (!session) {
          setError(null);
          setMessage(null);
          setSeriesOptions([]);
          setSeriesId("");
          setNewSeriesTitle("");
          setNewSeriesDescription("");
          setFile(null);
          setThumbnailFile(null);
          setStep("details");
        }
      } finally {
        setIsSessionResolved(true);
      }
    });

    return () => {
      isMounted = false;
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

  useEffect(() => {
    if (!sessionUserId || hasPromptedVideo) {
      return;
    }
    // モバイルでページ遷移直後にファイル選択を促す
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
      videoInputRef.current.click();
      setHasPromptedVideo(true);
    }
  }, [hasPromptedVideo, sessionUserId]);

  useEffect(() => {
    if (!file) {
      setVideoPreviewUrl(null);
      if (step === "confirm") {
        setStep("details");
      }
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, step]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [thumbnailFile]);

  const canProceed = useMemo(() => {
    if (!file) {
      return false;
    }
    if (!title.trim() || !thumbnailFile) {
      return false;
    }
    if (type === "existing-series" && !seriesId) {
      return false;
    }
    if (type === "new-series" && !newSeriesTitle.trim()) {
      return false;
    }
    return true;
  }, [file, thumbnailFile, title, type, seriesId, newSeriesTitle]);

  const canPublish = useMemo(() => {
    if (!canProceed) {
      return false;
    }
    return noRepost && mosaicConfirmed && isAdult;
  }, [canProceed, isAdult, mosaicConfirmed, noRepost]);

  const openVideoPicker = useCallback(() => {
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
      videoInputRef.current.click();
    }
  }, []);

  const openThumbnailPicker = useCallback(() => {
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
      thumbnailInputRef.current.click();
    }
  }, []);

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setError(null);
    setMessage(null);
    setStep("details");
  };

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setThumbnailFile(nextFile);
    setError(null);
  };

  const handleSelectType = (nextType: UploadType) => {
    setType(nextType);
    setError(null);
    if (nextType === "new-series") {
      setSeriesId("");
    } else {
      setNewSeriesTitle("");
      setNewSeriesDescription("");
    }
  };

  const resetForm = useCallback(() => {
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
    setType("new-series");
    setStep("details");
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  }, []);

  const publishVideo = useCallback(() => {
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
        let activeAccessToken = accessToken;
        let activeUserId = sessionUserId;

        if (!activeAccessToken || !activeUserId) {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            throw new Error("ログイン状態の再確認に失敗しました。時間をおいて再度お試しください。");
          }

          const refreshedSession = data.session ?? null;
          activeAccessToken = refreshedSession?.access_token ?? null;
          activeUserId = refreshedSession?.user?.id ?? null;

          if (!activeAccessToken || !activeUserId) {
            throw new Error("アップロードにはログインが必要です。再ログインしてください。");
          }

          setSessionUserId(activeUserId);
          setAccessToken(activeAccessToken);
        }

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
              Authorization: `Bearer ${activeAccessToken}`,
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
        const videoPath = `${activeUserId}/${uploadId}-${file.name}`;
        const { error: uploadError } = await storage.upload(videoPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPaths.push(videoPath);

        const thumbnailPath = `${activeUserId}/thumbnails/${uploadId}-${thumbnailFile.name}`;
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
            Authorization: `Bearer ${activeAccessToken}`,
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
        resetForm();
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "アップロードに失敗しました。";
        setError(message);
      }
    });
  }, [
    accessToken,
    description,
    file,
    mosaicConfirmed,
    newSeriesDescription,
    newSeriesTitle,
    noRepost,
    resetForm,
    seriesId,
    sessionUserId,
    supabase,
    tags,
    thumbnailFile,
    title,
    type,
    isAdult,
  ]);

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step === "details") {
      if (!canProceed) {
        setError("必須項目をすべて入力してください。");
        return;
      }
      setError(null);
      setStep("confirm");
      return;
    }

    if (!canPublish) {
      setError("公開前の注意事項すべてにチェックを入れてください。");
      return;
    }

    publishVideo();
  };

  const handleBackToDetails = () => {
    setStep("details");
    setError(null);
  };

  if (!isSessionResolved) {
    return (
      <div className="auth-required" role="status">
        <p className="auth-required__message">ログイン状態を確認しています...</p>
      </div>
    );
  }

  if (!sessionUserId) {
    const redirectTo = encodeURIComponent("/upload");
    return (
      <div className="auth-required">
        <p className="auth-required__message">動画をアップロードするにはログインが必要です。</p>
        <div className="auth-required__actions">
          <Link href={`/auth/login?redirectTo=${redirectTo}`} className="button">
            ログイン
          </Link>
          <Link href={`/auth/register?redirectTo=${redirectTo}`} className="button button--ghost">
            新規登録
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="upload-form" onSubmit={handleFormSubmit}>
      <input
        ref={videoInputRef}
        className="upload-form__hidden-input"
        type="file"
        accept="video/mp4,video/*"
        onChange={handleVideoChange}
      />
      <input
        ref={thumbnailInputRef}
        className="upload-form__hidden-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleThumbnailChange}
      />

      {!file ? (
        <div className="upload-form__select">
          {message && <p className="upload-form__message message-banner message-banner--success">{message}</p>}
          <h2 className="upload-form__select-title">動画を選択してください</h2>
          <p className="upload-form__select-description">
            追加ボタンを押すとカメラロールが開きます。公開したい動画を選んで、詳細入力に進みましょう。
          </p>
          <button type="button" className="button" onClick={openVideoPicker}>
            カメラロールを開く
          </button>
        </div>
      ) : (
        <div className="upload-form__content">
          {message && <p className="upload-form__message message-banner message-banner--success">{message}</p>}

          <section className="upload-form__video">
            <div className="upload-form__video-preview">
              {videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="upload-form__video-element"
                />
              ) : (
                <div className="upload-form__video-fallback">プレビューを読み込めませんでした</div>
              )}
            </div>
            <div className="upload-form__video-meta">
              <p className="upload-form__video-name">{file.name}</p>
              <button
                type="button"
                className="button button--ghost"
                onClick={openVideoPicker}
                disabled={isPending}
              >
                動画を選び直す
              </button>
            </div>
          </section>

          {step === "details" ? (
            <div className="upload-form__details">
              <label className="upload-form__field">
                <span className="upload-form__field-label">タイトル</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="作品のタイトルを入力"
                />
              </label>

              <div className="upload-form__thumbnail">
                <span className="upload-form__field-label">サムネイル</span>
                <div className="upload-form__thumbnail-preview" role="presentation">
                  {thumbnailPreviewUrl ? (
                    <img src={thumbnailPreviewUrl} alt="選択したサムネイル" />
                  ) : (
                    <div className="upload-form__thumbnail-empty">16:9 推奨（1280×720px 以上）</div>
                  )}
                </div>
                <div className="upload-form__thumbnail-actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={openThumbnailPicker}
                    disabled={isPending}
                  >
                    サムネイルを選択
                  </button>
                </div>
                <small className="upload-form__hint">推奨: 16:9 / 1280×720px 以上</small>
              </div>

              <div className="upload-form__scenarios">
                <div
                  className={`upload-form__scenario ${
                    type === "new-series" ? "upload-form__scenario--active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="upload-form__scenario-toggle"
                    onClick={() => handleSelectType("new-series")}
                    aria-pressed={type === "new-series"}
                  >
                    ＋ 新規エピソードを作成
                  </button>
                  {type === "new-series" && (
                    <div className="upload-form__scenario-body">
                      <label className="upload-form__field">
                        <span className="upload-form__field-label">エピソード名</span>
                        <input
                          type="text"
                          value={newSeriesTitle}
                          onChange={(event) => setNewSeriesTitle(event.target.value)}
                          placeholder="シリーズまたはエピソードの名前"
                        />
                      </label>
                      <label className="upload-form__field">
                        <span className="upload-form__field-label">説明（任意）</span>
                        <textarea
                          value={newSeriesDescription}
                          onChange={(event) => setNewSeriesDescription(event.target.value)}
                          rows={3}
                          placeholder="視聴者に伝えたい概要を入力"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div
                  className={`upload-form__scenario ${
                    type === "existing-series" ? "upload-form__scenario--active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="upload-form__scenario-toggle"
                    onClick={() => handleSelectType("existing-series")}
                    aria-pressed={type === "existing-series"}
                  >
                    既存のエピソードに追加
                  </button>
                  {type === "existing-series" && (
                    <div className="upload-form__scenario-body">
                      {seriesOptions.length > 0 ? (
                        <label className="upload-form__field">
                          <span className="upload-form__field-label">追加先を選択</span>
                          <select
                            value={seriesId}
                            onChange={(event) => setSeriesId(event.target.value)}
                          >
                            <option value="">選択してください</option>
                            {seriesOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p className="upload-form__scenario-empty">
                          まだエピソードがありません。まずは新規エピソードを作成してください。
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <label className="upload-form__field">
                <span className="upload-form__field-label">説明</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="視聴者に作品のポイントを伝えましょう"
                />
              </label>

              <label className="upload-form__field">
                <span className="upload-form__field-label">タグ（カンマ区切り）</span>
                <input
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="例: アクション, ファンタジー"
                />
              </label>

              {error && (
                <p className="upload-form__error" role="alert">
                  {error}
                </p>
              )}

              <div className="upload-form__actions">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={openVideoPicker}
                  disabled={isPending}
                >
                  動画を変更
                </button>
                <button type="submit" className="button" disabled={!canProceed || isPending}>
                  進む
                </button>
              </div>
            </div>
          ) : (
            <div className="upload-form__confirm">
              <h2 className="upload-form__section-title">公開前の注意事項</h2>
              <p className="upload-form__section-description">
                以下の項目すべてに同意すると「公開する」を押せます。
              </p>
              <div className="upload-form__checks">
                <label className="upload-form__checkbox">
                  <input
                    type="checkbox"
                    checked={noRepost}
                    onChange={(event) => setNoRepost(event.target.checked)}
                  />
                  <span>私は転載禁止に同意します。</span>
                </label>
                <label className="upload-form__checkbox">
                  <input
                    type="checkbox"
                    checked={mosaicConfirmed}
                    onChange={(event) => setMosaicConfirmed(event.target.checked)}
                  />
                  <span>局部にはモザイクが入っています。</span>
                </label>
                <label className="upload-form__checkbox">
                  <input
                    type="checkbox"
                    checked={isAdult}
                    onChange={(event) => setIsAdult(event.target.checked)}
                  />
                  <span>この作品は18禁であり、私は18歳以上です。</span>
                </label>
              </div>

              {error && (
                <p className="upload-form__error" role="alert">
                  {error}
                </p>
              )}

              <div className="upload-form__actions upload-form__actions--confirm">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleBackToDetails}
                  disabled={isPending}
                >
                  戻る
                </button>
                <button type="submit" className="button" disabled={!canPublish || isPending}>
                  {isPending ? "公開処理中..." : "公開する"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
