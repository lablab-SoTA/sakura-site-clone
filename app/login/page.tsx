import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ログイン｜xanime",
  description:
    "クリエイター向けの xanime アカウントにログインして、プロフィール編集や動画投稿を行うためのページです。",
};

export default function LoginPage() {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-header">
          <h1 className="page-title">ログイン</h1>
          <p className="page-lede">
            クリエイター向けのダッシュボードにアクセスし、プロフィールの更新や作品のアップロード、視聴データの確認を行うためのログインページです。視聴のみをお楽しみの方はログイン不要で作品をご覧いただけます。
          </p>
        </div>
        <form className="auth-form" aria-label="ログインフォーム">
          <label className="auth-field">
            <span className="auth-label">メールアドレス</span>
            <input
              className="auth-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="example@xanime.net"
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">パスワード</span>
            <input
              className="auth-input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="8文字以上のパスワード"
              required
            />
          </label>
          <div className="auth-actions">
            <button type="button" className="auth-submit">
              ログイン
            </button>
            <div className="auth-links">
              <Link href="/register">アカウントを作成する</Link>
              <Link href="mailto:support@xanime.net">パスワードをお忘れの方</Link>
            </div>
          </div>
        </form>
        <p className="auth-note">
          ※ 現在ログイン処理は開発中です。ログインに関するサポートが必要な場合は
          <Link href="mailto:support@xanime.net">support@xanime.net</Link>
          までご連絡ください。視聴者の方はログインなしでコンテンツをお楽しみいただけます。
        </p>
      </section>
    </div>
  );
}
