import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "クリエイターの方へ｜xanime",
  description:
    "視聴者はログイン不要で作品を楽しめ、クリエイターはログインしてアップロードできるようにするためのガイドです。",
};

export default function CreatorPage() {
  return (
    <div className="creator-page">
      <header className="creator-hero">
        <h1 className="page-title">クリエイターの方へ</h1>
        <p className="page-lede">
          xanime では視聴者の皆さまにログイン不要で作品をご覧いただけます。一方で、作品のアップロードやプロフィール管理などのクリエイター向け機能をご利用いただくにはアカウントが必要です。
        </p>
      </header>

      <div className="creator-grid">
        <section className="creator-card" id="viewer-info">
          <h2 className="creator-card__title">視聴者の方の動線</h2>
          <p className="creator-card__lead">
            ログインや会員登録を行わなくても、年齢確認が完了すればすべての公開作品を再生できます。
          </p>
          <ul className="creator-list">
            <li>トップページの「人気作品」「作品一覧」からすぐに視聴を開始できます。</li>
            <li>各エピソードの再生ページでは関連作品への遷移や評価機能をご利用いただけます。</li>
            <li>気になる作品はブラウザのお気に入りに追加することで、いつでもアクセスできます。</li>
          </ul>
          <div className="creator-actions">
            <Link href="/#popular-episodes-heading" className="button">
              人気作品をみる
            </Link>
            <Link href="/#all-content-heading" className="button button--ghost">
              作品一覧を表示
            </Link>
          </div>
        </section>

        <section className="creator-card creator-card--accent">
          <h2 className="creator-card__title">クリエイターの方の動線</h2>
          <p className="creator-card__lead">
            作品を公開するにはアカウントを作成し、ログインした状態でアップロード申請を行ってください。
          </p>
          <ol className="creator-steps">
            <li>まずは無料のクリエイターアカウントを登録します。</li>
            <li>登録完了後にクリエイターダッシュボードへログインします。</li>
            <li>作品のメタデータと動画ファイルをアップロードすると、審査後に配信が開始されます。</li>
          </ol>
          <div className="creator-actions">
            <Link href="/register" className="button">
              クリエイター登録
            </Link>
            <Link href="/login" className="button button--ghost">
              ログインページへ
            </Link>
          </div>
        </section>
      </div>

      <section className="creator-faq">
        <h2 className="creator-faq__title">よくある質問</h2>
        <dl className="creator-faq__list">
          <div className="creator-faq__item">
            <dt>視聴者でもアカウントを作成できますか？</dt>
            <dd>
              現在はクリエイター機能に特化しているため、視聴のみをご希望の場合はアカウント不要でお楽しみください。将来的な視聴者向け機能の追加については公式ブログでお知らせします。
            </dd>
          </div>
          <div className="creator-faq__item">
            <dt>アップロード前に必要な準備はありますか？</dt>
            <dd>
              作品情報（タイトル・サムネイル・あらすじ）と 1080p 以上の動画ファイルをご用意ください。ファイルの最適化に関するガイドラインは登録後のダッシュボードで確認できます。
            </dd>
          </div>
          <div className="creator-faq__item">
            <dt>商業利用は可能ですか？</dt>
            <dd>
              クリエイター規約に沿う限り、広告収益や投げ銭などのマネタイズ機能をご利用いただけます。詳細はサポートチームまでお問い合わせください。
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
