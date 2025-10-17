"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AGE_COOKIE_MAX_AGE_SECONDS, AGE_COOKIE_NAME } from "@/lib/constants";

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
    name: AGE_COOKIE_NAME,
    value: "1",
    maxAge: AGE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(nextLocation);
}
