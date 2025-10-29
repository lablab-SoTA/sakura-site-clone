"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type ProfileState = {
  avatar_url: string;
  display_name: string;
  bio: string;
  sns_x: string;
  sns_instagram: string;
  sns_youtube: string;
};

const INITIAL_STATE: ProfileState = {
  avatar_url: "",
  display_name: "",
  bio: "",
  sns_x: "",
  sns_instagram: "",
  sns_youtube: "",
};

type ProfileFormProps = {
  onSaved?: () => void;
};

const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? "avatars";

export default function ProfileForm({ onSaved }: ProfileFormProps) {
  const supabase = getBrowserSupabaseClient();
  const [form, setForm] = useState<ProfileState>(INITIAL_STATE);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (targetUserId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, display_name, bio, sns_x, sns_instagram, sns_youtube")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profile) {
        setForm({
          avatar_url: profile.avatar_url ?? "",
          display_name: profile.display_name ?? "",
          bio: profile.bio ?? "",
          sns_x: profile.sns_x ?? "",
          sns_instagram: profile.sns_instagram ?? "",
          sns_youtube: profile.sns_youtube ?? "",
        });
        setAvatarPreview(profile.avatar_url ?? null);
      } else {
        setForm(INITIAL_STATE);
        setAvatarPreview(null);
      }
    };

    const resolveSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }

        if (sessionError) {
          console.error("セッションの取得に失敗しました", sessionError);
          setUserId(null);
          setForm(INITIAL_STATE);
          setAvatarPreview(null);
          setAvatarFile(null);
          setMessage(null);
          setError("ログイン状態の確認に失敗しました。再度お試しください。");
          return;
        }

        if (!data.session) {
          setUserId(null);
          setForm(INITIAL_STATE);
          setAvatarPreview(null);
          setAvatarFile(null);
          setMessage(null);
          setError(null);
          return;
        }

        setUserId(data.session.user.id);
        setError(null);
        await loadProfile(data.session.user.id);
      } catch (unknownError) {
        console.error("セッションの取得中にエラーが発生しました", unknownError);
        if (!isMounted) {
          return;
        }
        setUserId(null);
        setForm(INITIAL_STATE);
        setAvatarPreview(null);
        setAvatarFile(null);
        setMessage(null);
        setError("ログイン状態の確認に失敗しました。時間をおいて再度お試しください。");
      } finally {
        if (isMounted) {
          setIsSessionResolved(true);
        }
      }
    };

    resolveSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      try {
        if (!session) {
          setUserId(null);
          setForm(INITIAL_STATE);
          setAvatarPreview(null);
          setAvatarFile(null);
          setMessage(null);
          setError(null);
          return;
        }

        setUserId(session.user.id);
        setError(null);
        await loadProfile(session.user.id);
      } catch (unknownError) {
        console.error("認証状態の更新処理でエラーが発生しました", unknownError);
        if (!isMounted) {
          return;
        }
        setUserId(null);
        setForm(INITIAL_STATE);
        setAvatarPreview(null);
        setAvatarFile(null);
        setMessage(null);
        setError("ログイン状態の確認に失敗しました。再度お試しください。");
      } finally {
        if (isMounted) {
          setIsSessionResolved(true);
        }
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleChange = (
    field: keyof ProfileState,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarButtonClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      setError("プロフィールの更新にはログインが必要です。");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      let resolvedAvatarUrl = form.avatar_url || null;

      if (avatarFile) {
        const extension = avatarFile.name.split(".").pop() ?? "jpg";
        const filePath = `${userId}/${Date.now()}.${extension}`;
        console.log("アバターアップロード直前", {
          bucket: AVATAR_BUCKET,
          userId,
          fileName: avatarFile.name,
        });
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            contentType: avatarFile.type,
          });

        if (uploadError) {
          console.error("アバター画像のアップロードに失敗しました", uploadError);
          if (uploadError.message.includes("Bucket not found")) {
            setError(`アバター用ストレージバケット「${AVATAR_BUCKET}」が見つかりません。Supabase の Storage でバケットを作成し、適切な権限を付与してください。`);
          } else {
            setError("アバター画像のアップロードに失敗しました。時間をおいて再度お試しください。");
          }
          return;
        }

        const { data: publicUrlData } = await supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
        resolvedAvatarUrl = publicUrlData.publicUrl;
      }

      const { error: upsertError } = await supabase.from("profiles").upsert({
        user_id: userId,
        avatar_url: resolvedAvatarUrl,
        display_name: form.display_name || null,
        bio: form.bio || null,
        sns_x: form.sns_x || null,
        sns_instagram: form.sns_instagram || null,
        sns_youtube: form.sns_youtube || null,
      });

      if (upsertError) {
        console.error("プロフィールの保存に失敗しました", upsertError);
        setError("プロフィールの保存に失敗しました。");
        return;
      }

      setForm((prev) => ({
        ...prev,
        avatar_url: resolvedAvatarUrl ?? "",
      }));
      setAvatarFile(null);
      setAvatarPreview(resolvedAvatarUrl ?? null);
      setMessage("プロフィールを保存しました。");
      onSaved?.();
    } catch (unknownError) {
      console.error("プロフィールの保存処理でエラーが発生しました", unknownError);
      setError("プロフィールの保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSessionResolved) {
    return (
      <div className="auth-required" role="status">
        <p className="auth-required__message">ログイン状態を確認しています...</p>
      </div>
    );
  }

  if (!userId) {
    const redirectTo = encodeURIComponent("/settings/profile");
    return (
      <div className="auth-required">
        <p className="auth-required__message">プロフィールを編集するにはログインが必要です。</p>
        <div className="auth-required__actions">
          <Link href={`/auth/login?redirectTo=${redirectTo}`} className="button">
            ログイン
          </Link>
          <Link
            href={`/auth/register?redirectTo=${redirectTo}`}
            className="button button--ghost"
          >
            新規登録
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <div className="profile-form__avatar">
        <button type="button" className="profile-form__avatar-button" onClick={handleAvatarButtonClick}>
          {avatarPreview ? (
            <Image src={avatarPreview} alt="アバター画像" fill sizes="96px" />
          ) : (
            <span className="profile-form__avatar-placeholder">画像を選択</span>
          )}
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="profile-form__avatar-input"
        />
        <p className="profile-form__avatar-note">画像をタップして変更できます</p>
      </div>
      <label className="profile-form__field">
        <span>表示名</span>
        <input
          type="text"
          value={form.display_name}
          onChange={(event) => handleChange("display_name", event.target.value)}
        />
      </label>
      <label className="profile-form__field">
        <span>自己紹介</span>
        <textarea
          value={form.bio}
          onChange={(event) => handleChange("bio", event.target.value)}
          rows={4}
        />
      </label>
      <label className="profile-form__field">
        <span>X (Twitter) URL</span>
        <input
          type="url"
          placeholder="https://x.com/username"
          value={form.sns_x}
          onChange={(event) => handleChange("sns_x", event.target.value)}
        />
      </label>
      <label className="profile-form__field">
        <span>Instagram URL</span>
        <input
          type="url"
          placeholder="https://www.instagram.com/username"
          value={form.sns_instagram}
          onChange={(event) => handleChange("sns_instagram", event.target.value)}
        />
      </label>
      <label className="profile-form__field">
        <span>YouTube URL</span>
        <input
          type="url"
          placeholder="https://www.youtube.com/@channel"
          value={form.sns_youtube}
          onChange={(event) => handleChange("sns_youtube", event.target.value)}
        />
      </label>
      {error && (
        <p className="profile-form__error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="profile-form__message">{message}</p>}
      <button type="submit" className="button" disabled={isSaving}>
        {isSaving ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
