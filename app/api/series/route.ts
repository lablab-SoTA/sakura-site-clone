import { NextResponse } from "next/server";

import { createServiceRoleClient, getUserFromRequest } from "@/lib/supabase/server";
import { generateSeriesSlug } from "@/lib/utils/slug";

type SeriesPayload = {
  title_raw: string;
  title_clean: string;
  slug: string;
  description?: string | null;
};

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

const OWNER_CANDIDATES = ["owner_id", "user_id", "creator_id"] as const;
const TITLE_CANDIDATES = ["title_clean", "title_raw", "title", "name"] as const;

const extractMissingColumn = (error: SupabaseError) => {
  const sources = [error.message, error.details, error.hint].filter(Boolean) as string[];
  for (const text of sources) {
    const quoted = [...text.matchAll(/'([a-zA-Z0-9_.]+)'/g)].map((match) => match[1].replace(/^series\./i, ""));
    const candidate = quoted.find((value) => value !== "series" && value !== "public");
    if (candidate) {
      return candidate;
    }

    const patterns = [
      /column\s+"?([a-zA-Z0-9_.]+)"?/i,
      /'([a-zA-Z0-9_.]+)'\s+column/i,
      /column\s+([a-zA-Z0-9_.]+)\s+of/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const normalized = match[1].replace(/^series\./i, "");
        if (normalized !== "of" && normalized !== "series") {
          return normalized;
        }
      }
    }
  }
  return null;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    console.warn("シリーズAPI: Authorizationヘッダーが存在しません。");
  }

  const user = await getUserFromRequest(request);

  if (!user) {
    console.warn("シリーズAPI: ユーザー認証に失敗しました。", {
      hasAuthorizationHeader: Boolean(authHeader),
      authorizationHeaderLength: authHeader?.length ?? 0,
    });
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SeriesPayload | null;

  if (!body || !body.title_raw || !body.title_clean) {
    return NextResponse.json({ message: "シリーズ名を入力してください。" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const baseTitle = body.title_clean.trim() || body.title_raw.trim();
  const normalizedSlug = (body.slug ?? "").trim();
  const initialSlug = normalizedSlug.length > 0 ? normalizedSlug : generateSeriesSlug(baseTitle) || `series-${Date.now().toString(36)}`;

  const missingColumns = new Set<string>();
  let slugCandidate = initialSlug;

  const buildPayload = (slugValue: string | null, ownerColumn: string | null) => {
    const payload: Record<string, unknown> = {};

    if (body.description?.trim() && !missingColumns.has("description")) {
      payload.description = body.description.trim();
    }

    if (ownerColumn) {
      payload[ownerColumn] = user.id;
    }

    if (slugValue && !missingColumns.has("slug")) {
      payload.slug = slugValue;
    }

    if (!missingColumns.has("title_clean")) {
      payload.title_clean = body.title_clean;
    }

    if (!missingColumns.has("title_raw")) {
      payload.title_raw = body.title_raw;
    }

    if (!missingColumns.has("title")) {
      payload.title = baseTitle;
    } else if (!missingColumns.has("name")) {
      payload.name = baseTitle;
    }

    return payload;
  };

  const fetchInsertedSeries = async (slugValue: string | null, ownerColumn: string | null) => {
    const filters: Record<string, unknown> = {};

    if (ownerColumn) {
      filters[ownerColumn] = user.id;
    }

    if (slugValue && !missingColumns.has("slug")) {
      filters.slug = slugValue;
    } else if (!missingColumns.has("title_clean")) {
      filters.title_clean = body.title_clean;
    } else if (!missingColumns.has("title_raw")) {
      filters.title_raw = body.title_raw;
    } else if (!missingColumns.has("title")) {
      filters.title = baseTitle;
    } else if (!missingColumns.has("name")) {
      filters.name = baseTitle;
    }

    if (Object.keys(filters).length === 0) {
      return null;
    }

    const selectFields = ["id"];
    if (!missingColumns.has("slug")) {
      selectFields.push("slug");
    }

    const { data, error } = await supabase
      .from("series")
      .select(selectFields.join(", "))
      .match(filters)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("シリーズの再取得に失敗しました", error, filters);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.id) {
      return null;
    }

    return {
      id: row.id as string,
      slug: (row.slug as string) ?? slugValue,
    };
  };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const ownerColumn = OWNER_CANDIDATES.find((candidate) => !missingColumns.has(candidate)) ?? null;
    const payload = buildPayload(missingColumns.has("slug") ? null : slugCandidate, ownerColumn);

    const { data, error } = await supabase.from("series").insert(payload).select("id");

    if (!error && data) {
      const rows = Array.isArray(data) ? data : [data];
      const createdId = rows[0]?.id as string | undefined;
      if (createdId) {
        const responseSlug = missingColumns.has("slug") ? initialSlug : slugCandidate;
        return NextResponse.json({
          series: {
            id: createdId,
            title_clean: body.title_clean,
            slug: responseSlug,
          },
        });
      }
    }

    if (error) {
      const supabaseError = error as SupabaseError;

      if (supabaseError.code === "23505" && !missingColumns.has("slug") && slugCandidate) {
        slugCandidate = `${initialSlug}-${Math.floor(Math.random() * 10000)}`;
        continue;
      }

      if (supabaseError.code === "PGRST204") {
        const missingColumn = extractMissingColumn(supabaseError);
        if (missingColumn) {
          missingColumns.add(missingColumn);
          continue;
        }
      }

      if (supabaseError.code === "42703") {
        const missingColumn = extractMissingColumn(supabaseError);
        if (missingColumn) {
          missingColumns.add(missingColumn);
          continue;
        }
      }

      if (supabaseError.code === "23502") {
        const missingColumn = extractMissingColumn(supabaseError);
        if (missingColumn) {
          // NOT NULL制約違反が発生したカラムを必須として再試行
          missingColumns.delete(missingColumn);
          continue;
        }
      }

      console.error("シリーズの作成に失敗しました", supabaseError, payload);
      return NextResponse.json(
        {
          message: "シリーズの作成に失敗しました。",
          code: supabaseError.code,
          details: supabaseError.message ?? null,
        },
        { status: 500 },
      );
    }

    const fallback = await fetchInsertedSeries(missingColumns.has("slug") ? null : slugCandidate, ownerColumn);
    if (fallback) {
      const responseSlug = missingColumns.has("slug") ? initialSlug : fallback.slug;
      return NextResponse.json({
        series: {
          id: fallback.id,
          title_clean: body.title_clean,
          slug: responseSlug,
        },
      });
    }
  }

  console.error("シリーズの作成に失敗しました（最大試行回数を超えました）", initialSlug, Array.from(missingColumns));
  return NextResponse.json({ message: "シリーズの作成に失敗しました。", code: "max_attempts" }, { status: 500 });
}
