"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { resolveRedirectPath, DEFAULT_REDIRECT_PATH, resolveSiteOrigin } from "@/lib/navigation";

type FormState = {
  email: string;
  password: string;
};

export default function RegisterForm() {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const redirectPath = useMemo(
    () => resolveRedirectPath(searchParams.get("redirectTo"), DEFAULT_REDIRECT_PATH),
    [searchParams],
  );

  const buildCallbackUrl = () => {
    const base = resolveSiteOrigin();
    if (!base) {
      throw new Error("サイトURLが特定できません。");
    }
    return `${base}/auth/callback?redirectTo=${encodeURIComponent(redirectPath)}`;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResendStatus("idle");
    setResendError(null);

    startTransition(async () => {
      let redirectUrl: string;
      try {
        redirectUrl = buildCallbackUrl();
      } catch {
        setError("サイトのURLを解決できませんでした。時間をおいて再度お試しください。");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setMessage("確認メールを送信しました。メール内のリンクから本登録を完了してください。");
        return;
      }

      router.replace(redirectPath);
    });
  };

  const handleResend = async () => {
    if (!form.email) {
      setResendStatus("error");
      setResendError("メールアドレスを入力してください。");
      return;
    }

    setResendStatus("loading");
    setResendError(null);

    let redirectUrl: string;
    try {
      redirectUrl = buildCallbackUrl();
    } catch {
      setResendStatus("error");
      setResendError("サイトのURLを解決できませんでした。時間をおいて再度お試しください。");
      return;
    }

    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: form.email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (resendErr) {
      setResendStatus("error");
      setResendError(resendErr.message);
      return;
    }

    setResendStatus("success");
  };

  const disableSubmit = isPending || !form.email || form.password.length < 6;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">
        <span className="auth-form__label">メールアドレス</span>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
          className="auth-form__input"
        />
      </label>
      <label className="auth-form__field">
        <span className="auth-form__label">パスワード</span>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          autoComplete="new-password"
          className="auth-form__input"
        />
      </label>
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <div className="auth-form__message-block">
          <p className="auth-form__message message-banner">{message}</p>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleResend}
            disabled={resendStatus === "loading"}
          >
            {resendStatus === "loading" ? "再送信中..." : "確認メールを再送する"}
          </button>
          {resendStatus === "success" && (
            <p className="auth-form__message auth-form__message--success message-banner message-banner--success">
              再送信しました。
            </p>
          )}
          {resendStatus === "error" && resendError && (
            <p className="auth-form__error" role="alert">
              {resendError}
            </p>
          )}
        </div>
      )}
      <button type="submit" className="button" disabled={disableSubmit}>
        {isPending ? "登録処理中..." : "登録する"}
      </button>
      <p className="auth-form__hint auth-form__hint--highlight" role="note">
        <span className="auth-form__hint-text">すでにアカウントをお持ちですか？</span>
        <Link href="/auth/login" className="auth-form__hint-link">
          ログインはこちら
        </Link>
      </p>
    </form>
  );
}
