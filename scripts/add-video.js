#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rootDir = process.cwd();
const dataFilePath = path.join(rootDir, "data", "anime.json");
const videosDir = path.join(rootDir, "public", "videos");
const thumbnailsDir = path.join(rootDir, "public", "images", "thumbnails");

function loadAnimeList() {
  if (!fs.existsSync(dataFilePath)) {
    throw new Error(`データファイルが見つかりません: ${dataFilePath}`);
  }

  const raw = fs.readFileSync(dataFilePath, "utf-8");
  return JSON.parse(raw);
}

function saveAnimeList(list) {
  const json = JSON.stringify(list, null, 2);
  fs.writeFileSync(dataFilePath, `${json}\n`);
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
  const animeList = loadAnimeList();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = askFactory(rl);

  try {
    const title = await ask("作品タイトル", { required: true });
    const defaultSlug = slugify(title) || "new-video";
    let slug = await ask("スラッグ（URL に使われます）", { defaultValue: defaultSlug, required: true });
    slug = slugify(slug);
    if (!slug) {
      throw new Error("スラッグの生成に失敗しました。");
    }

    const slugExists = animeList.some((item) => item.slug === slug);
    if (slugExists) {
      throw new Error(`同じスラッグが既に存在します: ${slug}`);
    }

    const synopsis = await ask("あらすじ", { required: true });
    const yearInput = await ask("公開年（例: 2025）", { defaultValue: new Date().getFullYear().toString(), required: true });
    const year = Number.parseInt(yearInput, 10);
    if (Number.isNaN(year)) {
      throw new Error("公開年は数値で入力してください。");
    }

    const rating = await ask("年齢区分（例: G, PG12, R18）", { defaultValue: "G", required: true });
    const durationInput = await ask("上映時間（分単位で入力、例: 24.5）", { required: true });
    const durationMinutes = Number.parseFloat(durationInput);
    if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      throw new Error("上映時間は 0 より大きい数値で入力してください。");
    }
    const durationSeconds = Math.round(durationMinutes * 60);

    const genresInput = await ask("ジャンル（カンマ区切り）", { required: true });
    const genres = genresInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (genres.length === 0) {
      throw new Error("ジャンルを 1 つ以上入力してください。");
    }

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

    const director = await ask("監督名（任意）");
    const studio = await ask("制作スタジオ（任意）");
    const castInput = await ask("キャスト（カンマ区切り・任意）");
    const cast = castInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const newEntry = {
      slug,
      title,
      synopsis,
      thumbnail: posterSrc,
      duration: durationSeconds,
      year,
      rating,
      genres,
      video: {
        type: videoType,
        src: videoSrc,
        poster: posterSrc,
      },
    };

    if (director || studio || cast.length > 0) {
      newEntry.credits = {};
      if (director) newEntry.credits.director = director;
      if (studio) newEntry.credits.studio = studio;
      if (cast.length > 0) newEntry.credits.cast = cast;
    }

    animeList.push(newEntry);
    saveAnimeList(animeList);

    console.log("\n--- 追加完了 ---");
    console.log(`slug: ${slug}`);
    console.log(`video.src: ${videoSrc}`);
    console.log(`poster: ${posterSrc}`);
    console.log(`data/anime.json に作品を追加しました。`);
  } catch (error) {
    console.error(`エラー: ${(error && error.message) || error}`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

void main();
