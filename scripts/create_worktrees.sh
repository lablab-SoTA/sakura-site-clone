#!/usr/bin/env bash
set -euo pipefail

# 作成するworktreeを配置する親ディレクトリ（環境変数で上書き可能）
WORKTREES_ROOT="${WORKTREES_ROOT:-../worktrees}"

# 並行開発に参加するエージェント一覧
AGENTS=(frontend backend schema qa)

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Gitリポジトリ内で実行してください。" >&2
  exit 1
fi

git fetch origin

# ベースとするブランチを決定（環境変数 WORKTREE_BASE_REF があれば優先）
if [ -n "${WORKTREE_BASE_REF:-}" ]; then
  if git rev-parse --verify "${WORKTREE_BASE_REF}" >/dev/null 2>&1; then
    BASE_REF="${WORKTREE_BASE_REF}"
  else
    echo "指定された WORKTREE_BASE_REF='${WORKTREE_BASE_REF}' は存在しません。" >&2
    exit 1
  fi
else
  BASE_REF=""
  for candidate in origin/develop origin/main develop main; do
    if git rev-parse --verify "$candidate" >/dev/null 2>&1; then
      BASE_REF="$candidate"
      break
    fi
  done

  if [ -z "$BASE_REF" ]; then
    echo "ベースとなるブランチが見つかりませんでした。develop または main を作成してください。" >&2
    exit 1
  fi
fi

echo "ベースブランチ: $BASE_REF"

mkdir -p "$WORKTREES_ROOT"

for agent in "${AGENTS[@]}"; do
  dir="$WORKTREES_ROOT/wt-$agent"
  branch="feature/$agent/base"

  if [ -d "$dir" ]; then
    if git -C "$dir" rev-parse >/dev/null 2>&1; then
      current_branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
      if [ "$current_branch" != "$branch" ]; then
        echo "[warn] $dir は既に存在します (現在のブランチ: ${current_branch:-不明})。必要に応じて整理してください。"
      else
        echo "[skip] $dir は既に存在します。"
      fi
    else
      echo "[warn] $dir は存在しますがGit管理ディレクトリではないようです。手動で確認してください。"
    fi
    continue
  fi

  echo "[create] $dir を $BASE_REF から追加します (ブランチ: ${branch})"
  git worktree add -b "$branch" "$dir" "$BASE_REF"
done

echo "完了しました。現在のworktree:"
git worktree list
