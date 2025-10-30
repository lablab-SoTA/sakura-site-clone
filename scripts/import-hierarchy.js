#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const rootDir = process.cwd();
const dataFilePath = path.join(rootDir, "data", "anime.json");

function loadHierarchy() {
  if (!fs.existsSync(dataFilePath)) {
    throw new Error(`データファイルが見つかりません: ${dataFilePath}`);
  }
  const raw = fs.readFileSync(dataFilePath, "utf-8");
  return JSON.parse(raw);
}

function ensureEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が設定されていません。環境変数を確認してください。`);
  }
  return value;
}

async function upsertHierarchy(supabase, hierarchy) {
  for (const series of hierarchy) {
    const metadata =
      typeof series.metadata === "string" ? JSON.parse(series.metadata) : series.metadata ?? {};

    const { error: seriesError } = await supabase
      .from("series")
      .upsert(
        {
          id: series.id,
          owner_id: series.owner_id,
          title_raw: series.title_raw,
          title_clean: series.title_clean,
          slug: series.slug,
          description: series.description,
          cover_url: series.cover_url,
          metadata,
          created_at: series.created_at,
          updated_at: series.updated_at,
        },
        { onConflict: "id" },
      );

    if (seriesError) {
      throw new Error(`シリーズ登録エラー: ${series.title_clean ?? series.title_raw} (${series.id}) - ${seriesError.message}`);
    }

    for (const season of series.seasons ?? []) {
      const { error: seasonError } = await supabase
        .from("seasons")
        .upsert(
          {
            id: season.id,
            series_id: season.series_id,
            season_number: season.season_number,
            name: season.name,
            slug: season.slug,
            description: season.description,
            created_at: season.created_at,
            updated_at: season.updated_at,
          },
          { onConflict: "id" },
        );

      if (seasonError) {
        throw new Error(`シーズン登録エラー: ${season.name} (${season.id}) - ${seasonError.message}`);
      }

      for (const episode of season.episodes ?? []) {
        const { video_file: videoFile, ...episodePayload } = episode;
        const { error: episodeError } = await supabase
          .from("episodes")
          .upsert(
            {
              ...episodePayload,
              created_at: episode.created_at,
              updated_at: episode.updated_at,
            },
            { onConflict: "id" },
          );

        if (episodeError) {
          throw new Error(`エピソード登録エラー: ${episode.title_clean ?? episode.title_raw} (${episode.id}) - ${episodeError.message}`);
        }

        if (videoFile) {
          const { error: videoError } = await supabase
            .from("video_files")
            .upsert(
              {
                ...videoFile,
                created_at: videoFile.created_at,
                updated_at: videoFile.updated_at,
              },
              { onConflict: "id" },
            );

          if (videoError) {
            throw new Error(`動画ファイル登録エラー: ${episode.id} (${videoFile.id}) - ${videoError.message}`);
          }
        }
      }
    }
  }
}

async function main() {
  try {
    const supabaseUrl = ensureEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = ensureEnv("SUPABASE_SERVICE_ROLE");
    const hierarchy = loadHierarchy();

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    console.log("階層データを Supabase に同期します...");
    await upsertHierarchy(supabase, hierarchy);
    console.log("同期が完了しました。");
  } catch (error) {
    console.error(`エラーが発生しました: ${(error && error.message) || error}`);
    process.exitCode = 1;
  }
}

void main();
