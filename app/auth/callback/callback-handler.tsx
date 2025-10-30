"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type CallbackHandlerProps = {
  code: string | null;
  type: string | null;
  redirectTo: string;
};

type HandlerState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialState: HandlerState = {
  status: "idle",
  message: "",
};

export default function CallbackHandler({ code, type, redirectTo }: CallbackHandlerProps) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [state, setState] = useState<HandlerState>(initialState);

  useEffect(() => {
    if (!code) {
      setState({
        status: "error",
        message: "認証コードが見つかりませんでした。メール内のリンクを再度開いてください。",
      });
      return;
    }

    const normalizedType = (type ?? "").toLowerCase();
    if (!normalizedType) {
      setState({
        status: "error",
        message: "リンクの種類を判別できませんでした。お手数ですが再度お試しください。",
      });
      return;
    }

    let isMounted = true;

    const handleCallback = async () => {
      setState({
        status: "loading",
        message: "メールリンクを検証しています...",
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        setState({
          status: "error",
          message: "リンクの有効期限が切れているか無効です。再度メールを送信してお試しください。",
        });
        return;
      }

      if (normalizedType === "recovery") {
        setState({
          status: "success",
          message: "パスワードの再設定を続けてください。",
        });
        router.replace(`/auth/reset-password?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      if (normalizedType === "email_change") {
        setState({
          status: "success",
          message: "メールアドレスの変更が完了しました。",
        });
        router.replace(redirectTo);
        return;
      }

      setState({
        status: "success",
        message: "メール確認が完了しました。リダイレクトしています...",
      });
      router.replace(redirectTo);
    };

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [code, redirectTo, router, supabase, type]);

  const { status, message } = state;

  return (
    <div className="auth auth--center">
      <div className="auth__panel">
        <h1 className="auth__title">
          {status === "error" ? "リンクエラー" : status === "success" ? "認証完了" : "確認中"}
        </h1>
        <p className="auth__lead">{message}</p>
        {status === "error" && (
          <div className="auth__actions">
            <p className="auth-form__message">
              メールを再送するには、登録ページからもう一度手続きを行ってください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
