# xanime-site

## 必要な環境変数

`.env.local` に以下を設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=
TERMS_VERSION=2025-10-01
```

## 初期セットアップの流れ

1. Supabase プロジェクトを用意し、リポジトリの `data/anime.json`（シリーズ/シーズン/エピソードの階層構造）を確認します。
2. [SQL エディタ](https://supabase.com/) で `supabase-schema.sql` を開き、全文を貼り付けて一度だけ実行します。
3. Storage で `video` バケットを作成し、パブリックアクセスを許可します。
4. `npm install` で依存関係を取得し、`npm run import-hierarchy` で JSON の階層データを Supabase に同期します（要 `SUPABASE_SERVICE_ROLE`）。
5. `npm run dev` で開発サーバーを起動します。

### データの追加
- `npm run add-video` を実行すると、階層構造に沿った新規シリーズ + 第1話のエントリを作成できます。

## 複数エージェントでの並行開発（git worktree）

同じリポジトリで複数の開発者やAIエージェントが同時作業する場合は、`git worktree` を使うと安全にブランチを分離できます。初期化用スクリプトは `scripts/create_worktrees.sh` に用意しました。

### 事前に一度だけ実行
```bash
chmod +x scripts/create_worktrees.sh   # 初回のみ
./scripts/create_worktrees.sh
```

- `../worktrees/wt-frontend` などのディレクトリに `feature/<agent>/base` ブランチが作成されます。
- 各ワークツリーで作業ブランチを切り替え、`git push origin feature/<agent>/<task>` → PR 作成 → `develop` にマージするフローを推奨します。

### よく使うコマンド
```bash
git worktree list                           # 作成済みワークツリーの一覧
git worktree add ../worktrees/wt-qa feature/qa/base     # 既存ブランチを別ディレクトリに展開
git worktree remove ../worktrees/wt-frontend-temp       # 不要になったワークツリーを削除
git worktree prune                          # 参照が残ったワークツリー情報を整理
```

### 運用のベストプラクティス
- 作業開始前に `git fetch origin` → `git rebase origin/develop` で最新状態を取り込む
- コミットメッセージの末尾に `[by frontend-agent]` のように担当を明記すると追跡しやすくなります
- `main` / `develop` への直接 push は禁止し、必ず PR + CI を経由して統合してください
