import { Suspense } from "react";

import ForgotPasswordForm from "./forgot-password-form";

export const metadata = {
  title: "パスワードをお忘れの方 | xanime",
};

export default function ForgotPasswordPage() {
  return (
    <div className="auth auth--center">
      <div className="auth__panel">
        <h1 className="auth__title">パスワードの再設定</h1>
        <p className="auth__lead">登録済みのメールアドレスを入力すると、再設定用リンクをお送りします。</p>
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
