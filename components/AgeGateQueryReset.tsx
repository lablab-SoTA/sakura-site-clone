"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AGE_VERIFIED_QUERY_PARAM, AGE_VERIFIED_QUERY_VALUE } from "@/lib/constants";

export default function AgeGateQueryReset() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    if (searchParams.get(AGE_VERIFIED_QUERY_PARAM) !== AGE_VERIFIED_QUERY_VALUE) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete(AGE_VERIFIED_QUERY_PARAM);
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
