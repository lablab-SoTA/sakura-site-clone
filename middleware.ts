import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  AGE_VERIFIED_COOKIE_NAME,
  AGE_VERIFIED_COOKIE_VALUE,
  AGE_VERIFIED_QUERY_PARAM,
  AGE_VERIFIED_QUERY_VALUE,
} from "./lib/constants";

const AGE_GATE_PATH = "/age-gate";

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/docs/") ||
    pathname.startsWith("/data/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  const destination = request.headers.get("sec-fetch-dest");
  const accept = request.headers.get("accept") ?? "";
  const isDocumentRequest =
    destination === "document" || (!destination && accept.includes("text/html"));

  if (!isDocumentRequest) {
    return NextResponse.next();
  }

  if (pathname === AGE_GATE_PATH) {
    return NextResponse.next();
  }

  const hasAgeVerificationFlag =
    request.nextUrl.searchParams.get(AGE_VERIFIED_QUERY_PARAM) === AGE_VERIFIED_QUERY_VALUE;
  const hasAgeVerificationCookie =
    request.cookies.get(AGE_VERIFIED_COOKIE_NAME)?.value === AGE_VERIFIED_COOKIE_VALUE;

  if (!hasAgeVerificationFlag && !hasAgeVerificationCookie) {
    const url = request.nextUrl.clone();
    url.pathname = AGE_GATE_PATH;
    const redirectTo = `${pathname}${request.nextUrl.search}`;
    url.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
