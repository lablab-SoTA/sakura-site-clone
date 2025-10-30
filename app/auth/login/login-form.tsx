"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { resolveRedirectPath, DEFAULT_REDIRECT_PATH } from "@/lib/navigation";

export default function LoginForm() {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const redirect = resolveRedirectPath(searchParams.get("redirectTo"), DEFAULT_REDIRECT_PATH);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.session) {
        setError("ログインに失敗しました。もう一度お試しください。");
        return;
      }

      router.replace(redirect);
    });
  };

  const disableSubmit = isPending || !email || password.length < 6;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">
        <span className="auth-form__label">メールアドレス</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          autoComplete="current-password"
          className="auth-form__input"
        />
      </label>
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={disableSubmit}>
        {isPending ? "ログイン中..." : "ログイン"}
      </button>
      <p className="auth-form__hint auth-form__hint--highlight" role="note">
        <span className="auth-form__hint-text">アカウントをお持ちでない場合は</span>
        <Link href="/auth/register" className="auth-form__hint-link">
          新規登録
        </Link>
      </p>
      <p className="auth-form__hint">
        <Link href={`/auth/forgot-password?redirectTo=${encodeURIComponent(redirect)}`} className="auth-form__hint-link">
          パスワードをお忘れの方はこちら
        </Link>
      </p>
    </form>
  );
}
