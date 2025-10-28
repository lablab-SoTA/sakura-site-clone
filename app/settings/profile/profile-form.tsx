"use client";

import { useEffect, useState, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setUserId(null);
        return;
      }

      setUserId(data.session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, bio, sns_x, sns_instagram, sns_youtube")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      if (profile) {
        setForm({
          display_name: profile.display_name ?? "",
          bio: profile.bio ?? "",
          sns_x: profile.sns_x ?? "",
          sns_instagram: profile.sns_instagram ?? "",
          sns_youtube: profile.sns_youtube ?? "",
        });
      }
    };

    fetchProfile();
  }, [supabase]);

  const handleChange = (
    field: keyof ProfileState,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      setError("プロフィールの更新にはログインが必要です。");
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);

      const { error } = await supabase.from("profiles").upsert({
        user_id: userId,
        display_name: form.display_name || null,
        bio: form.bio || null,
        sns_x: form.sns_x || null,
        sns_instagram: form.sns_instagram || null,
        sns_youtube: form.sns_youtube || null,
      });

      if (error) {
        setError("プロフィールの保存に失敗しました。");
        return;
      }

      setMessage("プロフィールを保存しました。");
    });
  };

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
      <button type="submit" className="button" disabled={isPending}>
        {isPending ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
