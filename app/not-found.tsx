import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="age-gate">
      <div className="age-gate__panel">
        <h1 className="age-gate__title">ページが見つかりません</h1>
        <p className="age-gate__description">
          リクエストされたページは削除されたか、URL が変更されました。
        </p>
        <div className="age-gate__actions">
          <Link href="/" className="button">
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
