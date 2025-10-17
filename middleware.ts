import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AGE_COOKIE_NAME } from "./lib/constants";

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

  const hasAgeCookie = request.cookies.get(AGE_COOKIE_NAME)?.value === "1";

  if (!hasAgeCookie) {
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
