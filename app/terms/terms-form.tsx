"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type TermsFormProps = {
  version: string;
};

type CheckboxState = {
  noRepost: boolean;
  mosaic: boolean;
  adult: boolean;
};

export default function TermsForm({ version }: TermsFormProps) {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const [state, setState] = useState<CheckboxState>({
    noRepost: false,
    mosaic: false,
    adult: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggle = (key: keyof CheckboxState) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!state.noRepost || !state.mosaic || !state.adult) {
      setError("すべてのチェック項目に同意してください。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      setError("同意にはログインが必要です。ログイン後に再度お試しください。");
      setIsSubmitting(false);
      return;
    }

    if (!data.session.user.email_confirmed_at) {
      setError("メールアドレスの確認が完了していません。受信メールのリンクを開くか、再送信してください。");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/terms/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        version,
        noRepost: state.noRepost,
        mosaic: state.mosaic,
        adult: state.adult,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "同意に失敗しました。" }));
      setError(payload.message ?? "同意に失敗しました。");
      return;
    }

    router.replace("/upload");
  };

  const disabled = isSubmitting || !state.noRepost || !state.mosaic || !state.adult;

  return (
    <form className="terms-form" onSubmit={handleSubmit}>
      <label className="terms-form__item">
        <input
          type="checkbox"
          checked={state.noRepost}
          onChange={() => toggle("noRepost")}
          required
        />
        <span>私は転載禁止に同意します。</span>
      </label>
      <label className="terms-form__item">
        <input
          type="checkbox"
          checked={state.mosaic}
          onChange={() => toggle("mosaic")}
          required
        />
        <span>局部にはモザイクが入っています。</span>
      </label>
      <label className="terms-form__item">
        <input
          type="checkbox"
          checked={state.adult}
          onChange={() => toggle("adult")}
          required
        />
        <span>この作品は18禁であり、私は18歳以上です。</span>
      </label>
      {error && (
        <p className="terms-form__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={disabled}>
        {isSubmitting ? "送信中..." : "同意して進む"}
      </button>
    </form>
  );
}
