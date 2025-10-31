import type { MetadataRoute } from "next";

const SITE_URL = "https://xanime.net";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "xanime",
    short_name: "xanime",
    description: "xanime（エックスアニメ）は日本で最高のヘンタイアニメをお届けします。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f0b1d",
    theme_color: "#ff5fa2",
    lang: "ja-JP",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "最新動画",
        short_name: "最新動画",
        url: "/feed",
        description: "最新のインディーアニメをすばやくチェック",
      },
      {
        name: "アップロード",
        short_name: "アップロード",
        url: "/upload",
        description: "作品をアップロードして共有",
      },
    ],
    id: SITE_URL,
  };
}
