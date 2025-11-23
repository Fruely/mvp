#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./sync-repo.sh [REPO_SSH_URL] [TARGET_DIR] [BRANCH]
# Example:
# ./sync-repo.sh git@github.com:Fruely/mvp.git "$HOME/freuly-mvp" main

REPO="${1:-git@github.com:Fruely/mvp.git}"
TARGET="${2:-$HOME/freuly-mvp}"
BRANCH="${3:-main}"

# Create parent dir
mkdir -p "$(dirname "$TARGET")"

log() { printf "[%s] %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"; }

if [ -d "$TARGET/.git" ]; then
  log "Detected existing repo at $TARGET — fetching latest $BRANCH"
  git -C "$TARGET" fetch origin "$BRANCH" --quiet
  git -C "$TARGET" reset --hard "origin/$BRANCH"
  git -C "$TARGET" clean -fd --quiet
  log "Updated $TARGET to origin/$BRANCH"
else
  log "Cloning $REPO (branch: $BRANCH) into $TARGET"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$TARGET"
  log "Cloned to $TARGET"
fi

log "Sync complete"
