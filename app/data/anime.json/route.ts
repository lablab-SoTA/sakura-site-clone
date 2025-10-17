import { NextResponse } from "next/server";

import animeData from "@/data/anime.json";
import type { Anime } from "@/lib/anime";

export async function GET() {
  return NextResponse.json(animeData as Anime[], {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
