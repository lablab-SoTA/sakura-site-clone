import RegisterForm from "./register-form";

export const metadata = {
  title: "アカウント登録 | xanime",
};

export default function RegisterPage() {
  return (
    <div className="auth auth--center">
      <div className="auth__panel">
        <h1 className="auth__title">アカウント登録</h1>
        <p className="auth__lead">メールアドレスとパスワードで登録します。</p>
        <RegisterForm />
      </div>
    </div>
  );
}
