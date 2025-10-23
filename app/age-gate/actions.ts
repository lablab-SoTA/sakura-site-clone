"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AGE_VERIFIED_COOKIE_MAX_AGE,
  AGE_VERIFIED_COOKIE_NAME,
  AGE_VERIFIED_COOKIE_VALUE,
  AGE_VERIFIED_QUERY_PARAM,
  AGE_VERIFIED_QUERY_VALUE,
} from "@/lib/constants";

export async function verifyAgeAction(formData: FormData) {
  const agree = formData.get("agree");
  if (!agree) {
    redirect("/age-gate?error=consent_required");
  }

  const redirectTarget = formData.get("redirectTo");
  const nextLocation =
    typeof redirectTarget === "string" && redirectTarget.startsWith("/")
      ? redirectTarget
      : "/";

  const cookieStore = await cookies();
  cookieStore.set({
    name: AGE_VERIFIED_COOKIE_NAME,
    value: AGE_VERIFIED_COOKIE_VALUE,
    maxAge: AGE_VERIFIED_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  const destination = new URL(nextLocation, "https://xanime.local");
  destination.searchParams.set(AGE_VERIFIED_QUERY_PARAM, AGE_VERIFIED_QUERY_VALUE);

  redirect(`${destination.pathname}${destination.search}${destination.hash}`);
}
