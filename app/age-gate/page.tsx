import Link from "next/link";

import { verifyAgeAction } from "./actions";

type AgeGatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AgeGatePage({ searchParams }: AgeGatePageProps) {
  const params = (await searchParams) ?? {};
  const rawError = params.error;
  const errorParam = Array.isArray(rawError) ? rawError[0] : rawError;
  const hasError = errorParam === "consent_required";

  const rawRedirect = params.redirectTo;
  const redirectToParam = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;
  const redirectValue =
    redirectToParam && redirectToParam.startsWith("/") ? redirectToParam : "/";

  return (
    <div className="age-gate">
      <div className="age-gate__panel">
        <div>
          <h1 className="age-gate__title">年齢確認</h1>
          <p className="age-gate__description">
            SAKURA では、クリエイターによる個人制作アニメを配信しています。
            一部の作品には年齢制限が含まれる場合があるため、視聴前に年齢確認への同意をお願いしています。
          </p>
        </div>
        <form action={verifyAgeAction} className="age-gate__actions">
          <input type="hidden" name="redirectTo" value={redirectValue} />
          <button type="submit" name="agree" value="true" className="button">
            18歳以上です
          </button>
        </form>
        {hasError && (
          <p className="age-gate__secondary" role="alert">
            年齢確認に同意してください。
          </p>
        )}
        <p className="age-gate__secondary">
          18歳未満の方、または同意いただけない場合は <Link href="https://google.com">こちら</Link>
          から離脱してください。
        </p>
      </div>
    </div>
  );
}
