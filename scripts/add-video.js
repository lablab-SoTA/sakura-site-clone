#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rootDir = process.cwd();
const dataFilePath = path.join(rootDir, "data", "anime.json");
const videosDir = path.join(rootDir, "public", "videos");
const thumbnailsDir = path.join(rootDir, "public", "images", "thumbnails");

function loadSeriesList() {
  if (!fs.existsSync(dataFilePath)) {
    throw new Error(`データファイルが見つかりません: ${dataFilePath}`);
  }

  const raw = fs.readFileSync(dataFilePath, "utf-8");
  return JSON.parse(raw);
}

function saveSeriesList(list) {
  const json = JSON.stringify(list, null, 2);
  fs.writeFileSync(dataFilePath, `${json}\n`);
}

function generateUuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return ([1e7].toString() + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.randomBytes(1)[0] & (15 >> (c / 4)))).toString(16),
  );
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTitle(input) {
  return input
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/【[^】]*】/g, "")
    .replace(/「[^」]*」/g, "")
    .replace(/『[^』]*』/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/^第\d+話[:：]?\s*/g, "")
    .replace(/^Episode\s+\d+[:：]?\s*/gi, "")
    .replace(/^EP\d+[:：]?\s*/gi, "")
    .replace(/^\d+[:：]\s*/g, "")
    .trim();
}

function generateEpisodeNumberStr(num) {
  return `第${num}話`;
}

function askFactory(rl) {
  return (question, { defaultValue, required } = {}) =>
    new Promise((resolve) => {
      const suffix = defaultValue ? ` (${defaultValue})` : "";
      rl.question(`${question}${suffix}: `, (answer) => {
        const trimmed = answer.trim();
        if (!trimmed && defaultValue) {
          resolve(defaultValue);
          return;
        }
        if (required && !trimmed) {
          console.log("必須項目です。値を入力してください。");
          resolve(askFactory(rl)(question, { defaultValue, required }));
          return;
        }
        resolve(trimmed);
      });
    });
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function copyFileWorkflow(ask, sourcePrompt, defaultFileName, destinationDir, baseSrcPath) {
  const shouldCopy = (await ask("ローカルファイルをコピーしますか？ (y/N)")).toLowerCase().startsWith("y");
  if (!shouldCopy) {
    const directPath = await ask("既存の URL またはパスを入力してください", { required: true });
    return directPath;
  }

  let sourcePath = await ask(sourcePrompt, { required: true });
  while (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    console.log("指定したファイルが見つかりません。パスを確認してください。");
    sourcePath = await ask(sourcePrompt, { required: true });
  }

  const sourceExt = path.extname(sourcePath) || path.extname(defaultFileName) || ".dat";
  const defaultName = defaultFileName.endsWith(sourceExt) ? defaultFileName : `${defaultFileName}${sourceExt}`;
  const destFileName = await ask("保存ファイル名を入力してください", { defaultValue: defaultName, required: true });

  ensureDir(destinationDir);
  const destPath = path.join(destinationDir, destFileName);
  fs.copyFileSync(sourcePath, destPath);
  console.log(`ファイルをコピーしました: ${destPath}`);
  return `${baseSrcPath}/${destFileName}`;
}

async function main() {
  const seriesList = loadSeriesList();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = askFactory(rl);

  try {
    const titleRaw = await ask("作品タイトル（title_raw）", { required: true });
    const titleClean = normalizeTitle(titleRaw);
    const defaultSlug = slugify(titleClean || titleRaw) || "new-series";
    let slug = await ask("シリーズスラッグ（URL 用）", { defaultValue: defaultSlug, required: true });
    slug = slugify(slug);
    if (!slug) {
      throw new Error("スラッグの生成に失敗しました。");
    }

    const slugExists = seriesList.some((item) => item.slug === slug);
    if (slugExists) {
      throw new Error(`同じスラッグが既に存在します: ${slug}`);
    }

    const synopsis = await ask("シリーズ概要", { required: true });
    const yearInput = await ask("公開年（例: 2025）", { defaultValue: String(new Date().getFullYear()), required: true });
    const year = Number.parseInt(yearInput, 10);
    if (Number.isNaN(year)) {
      throw new Error("公開年は数値で入力してください。");
    }

    const rating = await ask("年齢区分（例: G / PG12 / R18）", { defaultValue: "G", required: true });
    const genresInput = await ask("ジャンル（カンマ区切り）", { required: true });
    const genres = genresInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (genres.length === 0) {
      throw new Error("ジャンルを 1 つ以上入力してください。");
    }

    const creator = await ask("クリエイター名（任意）");
    const director = await ask("監督名（任意）");
    const studio = await ask("制作スタジオ（任意）");
    const castInput = await ask("キャスト（カンマ区切り・任意）");
    const cast = castInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const ownerIdDefault = generateUuid();
    const ownerId = await ask("シリーズ所有者UUID（任意）", { defaultValue: ownerIdDefault });

    const videoTypeInput = await ask("動画タイプ（mp4 または hls）", { defaultValue: "mp4", required: true });
    const videoType = videoTypeInput.toLowerCase() === "hls" ? "hls" : "mp4";

    const videoSrc = await copyFileWorkflow(
      ask,
      "動画ファイルのローカルパスを入力してください",
      `${slug}.${videoType === "mp4" ? "mp4" : "m3u8"}`,
      videosDir,
      "/videos",
    );

    const posterSrc = await copyFileWorkflow(
      ask,
      "ポスターファイルのローカルパスを入力してください",
      `${slug}.jpg`,
      thumbnailsDir,
      "/images/thumbnails",
    );

    const episodeTitleRaw =
      (await ask("第1話のタイトル（title_raw）", { defaultValue: "第1話" })) || "第1話";
    const episodeTitleClean = normalizeTitle(episodeTitleRaw);
    const episodeSynopsis =
      (await ask("第1話の概要（未入力の場合はシリーズ概要を利用）")) || synopsis;
    const episodeDurationMinutes = Number.parseFloat(
      await ask("第1話の再生時間（分単位、例: 24.5）", { required: true }),
    );
    if (Number.isNaN(episodeDurationMinutes) || episodeDurationMinutes <= 0) {
      throw new Error("再生時間は 0 より大きい数値で入力してください。");
    }
    const episodeDurationSec = Math.round(episodeDurationMinutes * 60);

    const seriesId = generateUuid();
    const seasonId = generateUuid();
    const episodeId = generateUuid();
    const videoFileId = generateUuid();
    const nowIso = new Date().toISOString();

    const seriesEntry = {
      id: seriesId,
      owner_id: ownerId || ownerIdDefault,
      title_raw: titleRaw,
      title_clean: titleClean || titleRaw,
      slug,
      description: synopsis,
      cover_url: posterSrc,
      metadata: {
        year,
        rating,
        genres,
        creator: creator || null,
        director: director || null,
        studio: studio || null,
        cast: cast.length > 0 ? cast : null,
        metrics: {
          views: 0,
          likes: 0,
        },
        total_duration_sec: episodeDurationSec,
      },
      created_at: nowIso,
      updated_at: nowIso,
      seasons: [
        {
          id: seasonId,
          series_id: seriesId,
          season_number: 0,
          name: "メイン",
          slug: `${slug}-main`,
          description: null,
          created_at: nowIso,
          updated_at: nowIso,
          episodes: [
            {
              id: episodeId,
              season_id: seasonId,
              episode_number_int: 1,
              episode_number_str: generateEpisodeNumberStr(1),
              episode_type: "regular",
              title_raw: episodeTitleRaw,
              title_clean: episodeTitleClean || episodeTitleRaw,
              slug: `${slug}-main-episode-1`,
              description: episodeSynopsis,
              release_date: nowIso.slice(0, 10),
              duration_sec: episodeDurationSec,
              tags: genres,
              thumbnail_url: posterSrc,
              created_at: nowIso,
              updated_at: nowIso,
              video_file: {
                id: videoFileId,
                episode_id: episodeId,
                owner_id: ownerId || ownerIdDefault,
                file_path: videoSrc,
                public_url: videoSrc,
                width: null,
                height: null,
                duration_sec: episodeDurationSec,
                thumbnail_url: posterSrc,
                is_adult: rating.toUpperCase().includes("R"),
                mosaic_confirmed: false,
                no_repost: true,
                visibility: "PUBLIC",
                status: "PUBLISHED",
                view_count: 0,
                like_count: 0,
                published_at: nowIso,
                created_at: nowIso,
                updated_at: nowIso,
              },
            },
          ],
        },
      ],
    };

    seriesList.push(seriesEntry);
    saveSeriesList(seriesList);

    console.log("\n--- 追加完了 ---");
    console.log(`シリーズ slug: ${slug}`);
    console.log(`エピソード slug: ${seriesEntry.seasons[0].episodes[0].slug}`);
    console.log(`video_file.public_url: ${videoSrc}`);
    console.log(`metadata.total_duration_sec: ${episodeDurationSec}`);
    console.log("data/anime.json に階層データを追加しました。");
  } catch (error) {
    console.error(`エラー: ${(error && error.message) || error}`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

void main();
