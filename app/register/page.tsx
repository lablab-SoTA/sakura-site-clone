import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "新規登録｜xanime",
  description:
    "クリエイターとして作品を投稿するための xanime アカウントを作成するページです。視聴のみの場合は登録不要です。",
};

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-header">
          <h1 className="page-title">新規登録</h1>
          <p className="page-lede">
            無料のクリエイターアカウントを作成すると、作品のアップロードやコメント管理、フォロワーへの告知機能などクリエイター向けツールをご利用いただけます。視聴のみをご希望の方は登録不要でコンテンツをお楽しみください。
          </p>
        </div>
        <form className="auth-form" aria-label="新規登録フォーム">
          <label className="auth-field">
            <span className="auth-label">表示名</span>
            <input
              className="auth-input"
              type="text"
              name="displayName"
              autoComplete="nickname"
              placeholder="xanime クリエイター"
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">メールアドレス</span>
            <input
              className="auth-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="creator@xanime.net"
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">パスワード</span>
            <input
              className="auth-input"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="英数字記号を含めて8文字以上"
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">パスワード（確認）</span>
            <input
              className="auth-input"
              type="password"
              name="passwordConfirm"
              autoComplete="new-password"
              placeholder="同じパスワードを再入力"
              required
            />
          </label>
          <label className="auth-checkbox">
            <input type="checkbox" name="terms" required />
            <span>
              <Link href="/docs/terms">利用規約</Link>と<Link href="/docs/privacy">プライバシーポリシー</Link>
              に同意します。
            </span>
          </label>
          <div className="auth-actions">
            <button type="button" className="auth-submit">
              アカウントを作成
            </button>
            <div className="auth-links">
              <Link href="/login">すでにアカウントをお持ちですか？</Link>
            </div>
          </div>
        </form>
        <p className="auth-note">
          ※ 現在登録処理は準備中です。お急ぎの方は
          <Link href="mailto:creator@xanime.net">creator@xanime.net</Link>
          までお問い合わせください。視聴のみの場合はこの手続きは不要です。
        </p>
      </section>
    </div>
  );
}
