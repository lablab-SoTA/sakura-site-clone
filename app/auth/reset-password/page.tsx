import { Suspense } from "react";

import ResetPasswordForm from "./reset-password-form";

export const metadata = {
  title: "新しいパスワードを設定 | xanime",
};

export default function ResetPasswordPage() {
  return (
    <div className="auth auth--center">
      <div className="auth__panel">
        <h1 className="auth__title">新しいパスワードを設定</h1>
        <p className="auth__lead">メールリンク経由でサインイン済みの状態で、パスワードを再設定できます。</p>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
