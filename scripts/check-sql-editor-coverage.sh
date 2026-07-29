#!/usr/bin/env bash
set -euo pipefail

coverage_dir="$(mktemp -d)"
trap 'rm -rf "$coverage_dir"' EXIT

bun test src/lib/queryExecutionState.unit.test.ts \
  --coverage \
  --coverage-reporter=lcov \
  --coverage-dir="$coverage_dir"

awk '
  $0 == "SF:src/lib/queryExecutionState.ts" {
    target = 1
    next
  }
  target && /^FNF:/ { split($0, value, ":"); functions_found = value[2] }
  target && /^FNH:/ { split($0, value, ":"); functions_hit = value[2] }
  target && /^LF:/ { split($0, value, ":"); lines_found = value[2] }
  target && /^LH:/ { split($0, value, ":"); lines_hit = value[2] }
  target && $0 == "end_of_record" {
    found = 1
    if (functions_found != functions_hit || lines_found != lines_hit) {
      printf \
        "SQL execution reducer coverage must remain 100%% (functions %d/%d, lines %d/%d).\n",
        functions_hit,
        functions_found,
        lines_hit,
        lines_found > "/dev/stderr"
      exit 1
    }
    printf \
      "SQL execution reducer coverage: 100%% functions (%d/%d), 100%% lines (%d/%d).\n",
      functions_hit,
      functions_found,
      lines_hit,
      lines_found
    exit 0
  }
  END {
    if (!found) {
      print "SQL execution reducer was missing from the coverage report." > "/dev/stderr"
      exit 2
    }
  }
' "$coverage_dir/lcov.info"
