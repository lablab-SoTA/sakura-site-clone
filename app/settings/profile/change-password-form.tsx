"use client";

import { useState, useTransition, type FormEvent } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ChangePasswordForm() {
  const supabase = getBrowserSupabaseClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!currentPassword) {
      setError("現在のパスワードを入力してください。");
      return;
    }

    if (newPassword.length < 6) {
      setError("新しいパスワードは6文字以上で設定してください。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("確認用のパスワードが一致しません。");
      return;
    }

    startTransition(async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        setError("ログイン状態の確認に失敗しました。再度ログインしてお試しください。");
        return;
      }

      const email = data.session.user.email;
      if (!email) {
        setError("メールアドレスが取得できませんでした。再度ログインしてください。");
        return;
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyError) {
        setError("現在のパスワードが正しくありません。");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || "パスワードの更新に失敗しました。時間をおいて再試行してください。");
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
      if (signOutError) {
        console.warn("他端末からのサインアウトに失敗しました", signOutError);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("パスワードを更新しました。ログイン中のこの端末は引き続き有効です。");
    });
  };

  const disableSubmit =
    isPending || currentPassword.length === 0 || newPassword.length === 0 || confirmPassword.length === 0;

  return (
    <form className="profile-password" onSubmit={handleSubmit}>
      <label className="profile-password__field">
        <span>現在のパスワード</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      <label className="profile-password__field">
        <span>新しいパスワード</span>
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      <label className="profile-password__field">
        <span>新しいパスワード（確認）</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p className="profile-password__error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="profile-password__message" role="status">
          {message}
        </p>
      )}
      <button type="submit" className="button button--ghost" disabled={disableSubmit}>
        {isPending ? "更新中..." : "パスワードを変更"}
      </button>
    </form>
  );
}
