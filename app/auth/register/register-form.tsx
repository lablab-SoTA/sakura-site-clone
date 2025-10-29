"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type FormState = {
  email: string;
  password: string;
};

export default function RegisterForm() {
  const supabase = getBrowserSupabaseClient();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setMessage("確認メールを送信しました。メール内のリンクから認証してください。");
        return;
      }

      router.replace("/terms");
    });
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
      {message && <p className="auth-form__message">{message}</p>}
      <button type="submit" className="button" disabled={disableSubmit}>
        {isPending ? "登録処理中..." : "登録する"}
      </button>
      <p className="auth-form__hint">
        すでにアカウントをお持ちですか？ <Link href="/auth/login">ログインはこちら</Link>
      </p>
    </form>
  );
}
