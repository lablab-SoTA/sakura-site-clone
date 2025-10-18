"use server";

import { redirect } from "next/navigation";

import { AGE_VERIFIED_QUERY_PARAM, AGE_VERIFIED_QUERY_VALUE } from "@/lib/constants";

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

  const destination = new URL(nextLocation, "https://xanime.local");
  destination.searchParams.set(AGE_VERIFIED_QUERY_PARAM, AGE_VERIFIED_QUERY_VALUE);

  redirect(`${destination.pathname}${destination.search}${destination.hash}`);
}
