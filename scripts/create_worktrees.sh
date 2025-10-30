#!/usr/bin/env bash
set -euo pipefail

# 作成するworktreeを配置する親ディレクトリ
WORKTREES_ROOT="../worktrees"

# 並行開発に参加するエージェント一覧
AGENTS=(frontend backend schema qa)

# ベースとするブランチ（初回はoriginのdevelopを推奨）
BASE_REF="origin/develop"

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Gitリポジトリ内で実行してください。" >&2
  exit 1
fi

git fetch origin

mkdir -p "$WORKTREES_ROOT"

for agent in "${AGENTS[@]}"; do
  dir="$WORKTREES_ROOT/wt-$agent"
  branch="feature/$agent/base"

  if [ -d "$dir" ]; then
    echo "[skip] $dir は既に存在します。"
    continue
  fi

  echo "[create] $dir を $BASE_REF から追加します（ブランチ: $branch）"
  git worktree add -b "$branch" "$dir" "$BASE_REF"
done

echo "完了しました。現在のworktree:"
git worktree list
