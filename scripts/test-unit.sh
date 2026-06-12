#!/usr/bin/env bash
set -euo pipefail

files=()
while IFS= read -r file; do
  files+=("$file")
done < <(find src -type f \( -name "*.unit.test.ts" -o -name "*.unit.test.tsx" \) | sort)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "[skip] no unit test files found (*.unit.test.ts / *.unit.test.tsx)"
  exit 0
fi

echo "[run] unit tests (${#files[@]} files)"

failed=0
for file in "${files[@]}"; do
  if ! bun test "$file"; then
    failed=1
  fi
done

if [[ $failed -eq 1 ]]; then
  exit 1
fi
