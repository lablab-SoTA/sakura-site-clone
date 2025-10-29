"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const redirect = searchParams.get("redirectTo") ?? "/terms";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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
      <p className="auth-form__hint">
        アカウントをお持ちでない場合は <Link href="/auth/register">新規登録</Link>
      </p>
    </form>
  );
}
