"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { resolveRedirectPath } from "@/lib/navigation";

const DEFAULT_REDIRECT_AFTER_RESET = "/settings/profile";

export default function ResetPasswordForm() {
  const supabase = getBrowserSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectPath = useMemo(
    () => resolveRedirectPath(searchParams.get("redirectTo"), DEFAULT_REDIRECT_AFTER_RESET),
    [searchParams],
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const resolveSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (sessionError || !data.session) {
        setIsSessionValid(false);
      } else {
        setIsSessionValid(true);
      }
      setIsSessionResolved(true);
    };

    void resolveSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || "パスワードの更新に失敗しました。時間をおいて再試行してください。");
        return;
      }

      setMessage("パスワードを更新しました。数秒後に遷移します。");
      setTimeout(() => {
        router.replace(redirectPath);
      }, 1500);
    });
  };

  if (!isSessionResolved) {
    return (
      <div className="auth-form__message" role="status">
        認証状態を確認しています...
      </div>
    );
  }

  if (!isSessionValid) {
    return (
      <div className="auth-form">
        <p className="auth-form__message" role="alert">
          有効なセッションが見つかりませんでした。メールに記載されたリンクからアクセスし直すか、再度メールを送信してください。
        </p>
        <Link href="/auth/forgot-password" className="auth-form__hint-link">
          パスワード再設定メールを送信する
        </Link>
      </div>
    );
  }

  const disableSubmit = isPending || newPassword.length === 0 || confirmPassword.length === 0;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">
        <span className="auth-form__label">新しいパスワード</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="auth-form__input"
        />
      </label>
      <label className="auth-form__field">
        <span className="auth-form__label">新しいパスワード（確認）</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
        <p className="auth-form__message message-banner message-banner--success" role="status">
          {message}
        </p>
      )}
      <button type="submit" className="button" disabled={disableSubmit}>
        {isPending ? "更新中..." : "パスワードを更新"}
      </button>
    </form>
  );
}
