#!/usr/bin/env bash
set -euo pipefail

coverage_dir="$(mktemp -d)"
trap 'rm -rf "$coverage_dir"' EXIT

bun test \
  src/lib/queryExecutionState.unit.test.ts \
  src/components/business/Editor/hooks/useSqlExecution.unit.test.ts \
  src/components/business/Editor/hooks/useSqlResults.unit.test.ts \
  --coverage \
  --coverage-reporter=lcov \
  --coverage-dir="$coverage_dir"

awk '
  BEGIN {
    reducer = "src/lib/queryExecutionState.ts"
    execution = "src/components/business/Editor/hooks/useSqlExecution.ts"
    results = "src/components/business/Editor/hooks/useSqlResults.ts"
    required[reducer] = 1
    required[execution] = 1
    required[results] = 1
  }

  /^SF:/ {
    current = substr($0, 4)
    next
  }
  current in required && /^FNF:/ {
    split($0, value, ":")
    functions_found[current] = value[2]
  }
  current in required && /^FNH:/ {
    split($0, value, ":")
    functions_hit[current] = value[2]
  }
  current in required && /^LF:/ {
    split($0, value, ":")
    lines_found[current] = value[2]
  }
  current in required && /^LH:/ {
    split($0, value, ":")
    lines_hit[current] = value[2]
  }
  current in required && $0 == "end_of_record" {
    found[current] = 1
    current = ""
  }

  END {
    for (file in required) {
      if (!found[file]) {
        printf "Required SQL editor source was missing from coverage: %s\n",
          file > "/dev/stderr"
        failed = 1
      }
    }

    if (found[reducer] && \
        (functions_found[reducer] != functions_hit[reducer] || \
         lines_found[reducer] != lines_hit[reducer])) {
      printf \
        "SQL execution reducer coverage must remain 100%% (functions %d/%d, lines %d/%d).\n",
        functions_hit[reducer],
        functions_found[reducer],
        lines_hit[reducer],
        lines_found[reducer] > "/dev/stderr"
      failed = 1
    } else if (found[reducer]) {
      printf \
        "SQL execution reducer coverage: 100%% functions (%d/%d), 100%% lines (%d/%d).\n",
        functions_hit[reducer],
        functions_found[reducer],
        lines_hit[reducer],
        lines_found[reducer]
    }

    check_line_threshold(execution, "useSqlExecution", 95)
    check_line_threshold(results, "useSqlResults", 95)

    exit failed ? 1 : 0
  }

  function check_line_threshold(file, label, minimum, percentage) {
    if (!found[file]) return
    percentage = lines_found[file] == 0 \
      ? 100 \
      : (100 * lines_hit[file] / lines_found[file])
    if (percentage + 0.00001 < minimum) {
      printf \
        "%s line coverage must be at least %d%% (%.2f%%, %d/%d).\n",
        label,
        minimum,
        percentage,
        lines_hit[file],
        lines_found[file] > "/dev/stderr"
      failed = 1
      return
    }
    printf \
      "%s line coverage: %.2f%% (%d/%d), required >= %d%%.\n",
      label,
      percentage,
      lines_hit[file],
      lines_found[file],
      minimum
  }
' "$coverage_dir/lcov.info"
