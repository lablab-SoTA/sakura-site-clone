"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type ProfileState = {
  display_name: string;
  bio: string;
  sns_x: string;
  sns_instagram: string;
  sns_youtube: string;
};

const INITIAL_STATE: ProfileState = {
  display_name: "",
  bio: "",
  sns_x: "",
  sns_instagram: "",
  sns_youtube: "",
};

export default function ProfileForm() {
  const supabase = getBrowserSupabaseClient();
  const [form, setForm] = useState<ProfileState>(INITIAL_STATE);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (targetUserId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, bio, sns_x, sns_instagram, sns_youtube")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profile) {
        setForm({
          display_name: profile.display_name ?? "",
          bio: profile.bio ?? "",
          sns_x: profile.sns_x ?? "",
          sns_instagram: profile.sns_instagram ?? "",
          sns_youtube: profile.sns_youtube ?? "",
        });
      } else {
        setForm(INITIAL_STATE);
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
          setMessage(null);
          setError("ログイン状態の確認に失敗しました。再度お試しください。");
          return;
        }

        if (!data.session) {
          setUserId(null);
          setForm(INITIAL_STATE);
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
      const { error: upsertError } = await supabase.from("profiles").upsert({
        user_id: userId,
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

      setMessage("プロフィールを保存しました。");
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
