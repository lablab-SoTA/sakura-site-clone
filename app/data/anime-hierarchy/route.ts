import { NextResponse } from "next/server";

import animeData from "@/data/anime.json";
import type { SeriesWithHierarchy } from "@/lib/types/hierarchy";

export async function GET() {
  return NextResponse.json(animeData as SeriesWithHierarchy[], {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
