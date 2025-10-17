# PROJECT BRIEF — Sakura Video Site (Workers + R2 + JSON)

## Context
- 個人制作アニメを無料公開するサイト。
- 年齢確認: 必須（/age-gate + cookie）。
- 一覧 → 作品選択 → 再生（HLS or MP4）。
- アップロードは作者のみ（当面は手動で R2 に置く）。
- メタデータは repo の `data/anime.json` で管理（バックエンド無し）。

## Tech Stack & Targets
- Next.js (App Router)
- Cloudflare Workers へデプロイ（**OpenNext: @opennextjs/cloudflare** + **wrangler**）
- ストレージ: Cloudflare R2（当面は公開URL、将来は署名付きURL）
- プレイヤー: HTML5 video + hls.js
- CSS: Tailwind（導入は任意。クラスが混入していてもOK）

## High-level Goals
1. 年齢ゲート導入（middleware + /age-gate + cookie）
2. 一覧ページ: `data/anime.json` からカード生成
3. 再生ページ: `/watch/[slug]` + `<video>`（HLS対応）
4. OpenNext/Workers で動くビルド＆デプロイ設定（wrangler）
5. 最小のキャッシュ・lint調整・README（運用手順）追加

## File Tasks
- 新規 or 追記（なければ作成）:
  - `data/anime.json`（サンプル1件）
  - `middleware.ts`（未承認は /age-gate へ）
  - `app/age-gate/actions.ts`（cookie set → redirect）
  - `app/age-gate/page.tsx`
  - `components/Player.tsx`（hls.js 付与）
  - `components/VideoCard.tsx`
  - `app/watch/[slug]/page.tsx`
  - `app/page.tsx`
  - `public/_headers`（静的アセットキャッシュ）
  - `wrangler.jsonc`（Workers設定）
  - `next.config.ts`（devで OpenNext 初期化）
  - `README-ARCH.md`（この設計の要約）

## Implementation Notes
- `app/page.tsx` は `fetch('/data/anime.json', { cache: 'no-store' })` で最新を取得。
- HLS のときは `.m3u8` なら hls.js を使い、Safari ならネイティブ再生。
- 画像や動画パスは後で差し替えやすいよう変数/propsを意識。
- コミットメッセージ例: `feat: age-gate, player, OpenNext(Workers) setup`

## Scripts to add (package.json)
- `"dev": "next dev"`
- `"build": "next build"`
- `"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`
- `"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`
- `"upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload"`

## Acceptance Criteria
- `/age-gate` が表示され、承認後に `/` へ遷移する
- `/` にサンプル作品カードが1件出る
- `/watch/sample-1` でプレイヤーが表示される（srcはダミーでOK）
- `npm run preview` or WorkersのGit連携で本番相当の挙動が確認できる
