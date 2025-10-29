import { Suspense } from "react";

import LoginForm from "./login-form";

export const metadata = {
  title: "ログイン | xanime",
};

export default function LoginPage() {
  return (
    <div className="auth auth--center">
      <div className="auth__panel">
        <h1 className="auth__title">ログイン</h1>
        <p className="auth__lead">登録済みのメールアドレスとパスワードでログインします。</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
