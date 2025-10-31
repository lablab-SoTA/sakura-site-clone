const DEFAULT_REDIRECT_PATH = "/terms";

/**
 * ユーザー入力のリダイレクト先を検証し、アプリ内パスに限定して返します。
 * スキーム付きURLや `//example.com` のようなプロトコル相対URLは拒否します。
 */
export function resolveRedirectPath(source: string | null | undefined, fallback = DEFAULT_REDIRECT_PATH): string {
  if (!source) {
    return fallback;
  }

  const trimmed = source.trim();

  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  if (trimmed.startsWith("//")) {
    return fallback;
  }

  if (trimmed.includes("://")) {
    return fallback;
  }

  return trimmed;
}

export { DEFAULT_REDIRECT_PATH };

/**
 * NEXT_PUBLIC_SITE_URL が設定されていればそれを、無ければブラウザの location.origin を返します。
 * SSR環境では空文字列を返すため、呼び出し側でフォールバックしてください。
 */
export function resolveSiteOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}
