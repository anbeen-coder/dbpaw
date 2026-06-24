#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TARGET_DIR="$PROJECT_ROOT/src-tauri/target"

if [ ! -d "$TARGET_DIR" ]; then
  echo "No target directory found, nothing to clean."
  exit 0
fi

BEFORE=$(du -sh "$TARGET_DIR" 2>/dev/null | cut -f1)

cd "$PROJECT_ROOT/src-tauri"

# Remove artifacts older than 30 days
cargo sweep --age 30 2>/dev/null || true

# If still over 15GB, remove everything
SIZE_KB=$(du -sk "$TARGET_DIR" | cut -f1)
if [ "$SIZE_KB" -gt 15728640 ]; then
  echo "Target still over 15GB ($(($SIZE_KB / 1048576))GB), running full clean..."
  cargo clean
  echo "Full clean complete."
else
  echo "Sweep complete. Target: $BEFORE -> $(du -sh "$TARGET_DIR" | cut -f1)"
fi
