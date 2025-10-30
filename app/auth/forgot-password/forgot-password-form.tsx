"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { resolveRedirectPath, resolveSiteOrigin } from "@/lib/navigation";

const DEFAULT_POST_RESET_REDIRECT = "/settings/profile";

export default function ForgotPasswordForm() {
  const supabase = getBrowserSupabaseClient();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const redirectPath = useMemo(
    () => resolveRedirectPath(searchParams.get("redirectTo"), DEFAULT_POST_RESET_REDIRECT),
    [searchParams],
  );

  const buildCallbackUrl = () => {
    const base = resolveSiteOrigin();
    if (!base) {
      throw new Error("サイトURLが特定できませんでした。");
    }
    return `${base}/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      let callbackUrl: string;
      try {
        callbackUrl = buildCallbackUrl();
      } catch (unknownError) {
        setError("再設定用のリンクを生成できませんでした。時間をおいて再試行してください。");
        return;
      }

      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl,
      });

      if (requestError) {
        setError(requestError.message || "メールの送信に失敗しました。時間をおいて再試行してください。");
        return;
      }

      setMessage("再設定用のメールを送信しました。メールのリンクから操作を続けてください。");
    });
  };

  const disableSubmit = isPending || !email;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">
        <span className="auth-form__label">メールアドレス</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="auth-form__input"
        />
      </label>
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="auth-form__message message-banner message-banner--success" role="status">
          {message}
        </p>
      )}
      <button type="submit" className="button" disabled={disableSubmit}>
        {isPending ? "送信中..." : "再設定リンクを送る"}
      </button>
      <p className="auth-form__hint">
        <Link href="/auth/login" className="auth-form__hint-link">
          ログイン画面へ戻る
        </Link>
      </p>
    </form>
  );
}
