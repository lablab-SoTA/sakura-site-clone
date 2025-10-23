# xanime Video Site — Architecture Overview

## 今回行った変更
- Next.js App Router プロジェクトを初期化し、`@opennextjs/cloudflare` + `wrangler` を利用した Workers/R2 デプロイ構成を追加。
- 年齢確認フロー（`middleware.ts`、`app/age-gate/*`、クエリフラグ管理）を実装し、未同意ユーザーを `/age-gate` に誘導。
- 作品メタデータ (`data/anime.json`) と取得ユーティリティ (`lib/anime.ts`) を整備、トップページと視聴ページを動的生成。
- HLS 対応のクライアントプレイヤー (`components/Player.tsx`) とカード UI (`components/VideoCard.tsx`) を作成。
- Cloudflare 向け設定 (`wrangler.jsonc`、`open-next.config.ts`、`public/_headers`、`next.config.ts`) とアーキテクチャドキュメントを整備。

## 次のコマンド（ローカル動作確認・デプロイ）
```bash
npm install                         # 未実行であれば依存パッケージを取得
npm run dev                         # ローカル開発サーバー（年齢ゲート込み）を起動
npm run preview                     # OpenNext ビルド後、wrangler で本番相当をローカル検証
npm run deploy                      # Cloudflare Workers へデプロイ
npm run upload                      # キャッシュ/アセットを R2 へ一括アップロード
```
- 初回デプロイ前に `wrangler r2 bucket create sakura-open-next-cache` などでバケットを作成。
- `wrangler login` または API Token 設定を完了させてから `deploy` / `upload` を実行。

## 技術スタック
- **Next.js App Router** (React 19) — SSR とサーバーアクションで年齢ゲートと作品リストを提供
- **OpenNext for Cloudflare (`@opennextjs/cloudflare`)** — Workers/R2 をターゲットにしたビルド & デプロイ
- **Cloudflare Wrangler** — `wrangler dev/preview/deploy` コマンドを利用
- **Cloudflare R2** — OpenNext のインクリメンタルキャッシュを保存
- **hls.js** — HLS ストリームを HTML5 `<video>` コンポーネントで再生

## フォルダ構成
```
app/                # Next.js App Router エントリ
  age-gate/         # 年齢確認ページとサーバーアクション
  watch/[slug]/     # 作品視聴ページ
  layout.tsx        # 共通レイアウト
  page.tsx          # 一覧トップ
components/         # UI コンポーネント (Player, VideoCard)
data/               # 作品メタデータ(JSON)
lib/                # 共通ユーティリティ (定数、データ取得)
public/_headers     # Cloudflare Pages/Workers 用キャッシュ制御
wrangler.jsonc      # Workers デプロイ設定 (.open-next/* はビルド生成物)
open-next.config.ts # OpenNext 設定 (R2 インクリメンタルキャッシュ)
```

## 年齢確認フロー
1. `middleware.ts` がクエリ `age=verified` を検査し、未設定なら `/age-gate` にリダイレクト。
2. `/age-gate` のフォーム送信で `verifyAgeAction` がサーバーアクションとして呼び出され、リダイレクト先に `age=verified` クエリを付与。
3. 同意後は元の URL (クエリ `redirectTo`) にリダイレクト。

## データ取得
- `app/page.tsx` と `app/watch/[slug]/page.tsx` は `fetch('/data/anime.json', { cache: 'no-store' })` 相当を `lib/anime.ts` 経由で実行。
- `headers()` から `host` / `proto` を取得し、Workers や開発時でも自サイトの JSON にアクセスできるように調整。
- 今後 R2 から JSON を配信する場合は `NEXT_PUBLIC_SITE_URL` を `wrangler.jsonc` や環境変数で上書き可能。

## 動画プレイヤー
- `components/Player.tsx` は Client Component。`src` が `.m3u8` の場合に hls.js を初期化。
- Safari ネイティブ再生に対応するため、HLS 未対応でも `<video>` に直接 `src` を設定。

## ビルド & デプロイフロー
```bash
npm run dev      # Next.js 開発サーバー (Workers context 初期化付き)
npm run preview  # OpenNext build -> wrangler preview
npm run deploy   # OpenNext build -> wrangler deploy
npm run upload   # OpenNext build -> キャッシュ/アセットアップロード
```
- OpenNext のビルド成果物は `.open-next/` 以下に生成され、Workers から `wrangler.jsonc` 設定で参照。
- R2 バケット `sakura-open-next-cache` を事前に作成 (`wrangler r2 bucket create sakura-open-next-cache`)。

## 簡易アップロードツール
- `npm run add-video` で対話式ウィザードを起動。作品タイトルやスラッグ、ジャンル等を入力すると `data/anime.json` に自動追記する。
- 動画ファイルやポスターのローカルパスを指定すると `public/videos/` や `public/images/thumbnails/` にコピーし、`video.src` と `thumbnail` を更新。
- R2 など外部に配置済みの動画を使う場合はコピーをスキップし、直接 URL を入力する。
- 追加後は通常通り `npm run dev` や `npm run deploy`、`npm run upload` で反映する。

## 今後の拡張
- `data/anime.json` を CI/CD で更新し、複数作品へ拡充。
- R2 に実動画を配置し、`video.src` を署名付き URL に切り替える。
- Tailwind もしくはデザインシステム導入、レスポンシブ調整強化。
- 視聴履歴（KV/Durable Object）やお気に入り機能の追加。
