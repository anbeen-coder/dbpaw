# SqlEditor Component Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the 994-line SqlEditor.tsx into hooks, render components, and a thin container following the Redis browser pattern.

**Architecture:** Extract theme data to a pure module, split logic into four focused hooks (form, api, actions, results), extract toolbar and results panel as pure render components, and rewire the container to compose them. SqlEditorProps stays unchanged — zero breaking changes.

**Tech Stack:** React, TypeScript, CodeMirror 6, bun:test, @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/business/Editor/sqlThemes.ts` | Create | SQL syntax theme data + factory |
| `src/components/business/Editor/hooks/useSqlResults.ts` | Create | Result status, display data, active result set |
| `src/components/business/Editor/hooks/useSqlResults.unit.test.ts` | Create | Tests for useSqlResults |
| `src/components/business/Editor/hooks/useSqlEditorForm.ts` | Create | Controlled/uncontrolled value, debounced onChange |
| `src/components/business/Editor/hooks/useSqlEditorForm.unit.test.ts` | Create | Tests for useSqlEditorForm |
| `src/components/business/Editor/hooks/useSqlEditorApi.ts` | Create | Save, export, format operations |
| `src/components/business/Editor/hooks/useSqlEditorApi.unit.test.ts` | Create | Tests for useSqlEditorApi |
| `src/components/business/Editor/hooks/useSqlEditorActions.ts` | Create | Keybindings, execute, CodeMirror extensions |
| `src/components/business/Editor/hooks/useSqlEditorActions.unit.test.ts` | Create | Tests for useSqlEditorActions |
| `src/components/business/Editor/SqlResultsPanel.tsx` | Create | Pure render — error, result set tabs, TableView |
| `src/components/business/Editor/SqlToolbar.tsx` | Create | Pure render — database selector, buttons, status, export |
| `src/components/business/Editor/SqlEditor.tsx` | Modify | Rewire to use hooks + components, delete extracted code |

---

### Task 1: Extract sqlThemes.ts

**Files:**
- Create: `src/components/business/Editor/sqlThemes.ts`
- Modify: `src/components/business/Editor/SqlEditor.tsx`

- [ ] **Step 1: Create sqlThemes.ts**

```ts
// src/components/business/Editor/sqlThemes.ts
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@uiw/react-codemirror";
import { getThemePreset, type ThemeId } from "@/theme/themeRegistry";

export type SqlSyntaxPalette = {
  keyword: string;
  function: string;
  type: string;
  string: string;
  number: string;
  variable: string;
  operator: string;
  comment: string;
  constant: string;
};

export const createSqlSyntaxTheme = (palette: SqlSyntaxPalette): Extension[] => [
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: palette.keyword },
      { tag: t.operatorKeyword, color: palette.keyword },
      { tag: t.typeName, color: palette.type },
      { tag: t.className, color: palette.type },
      { tag: t.function(t.variableName), color: palette.function },
      { tag: t.function(t.propertyName), color: palette.function },
      { tag: t.name, color: palette.variable },
      { tag: t.propertyName, color: palette.variable },
      { tag: t.variableName, color: palette.variable },
      { tag: t.string, color: palette.string },
      { tag: t.special(t.string), color: palette.string },
      { tag: t.number, color: palette.number },
      { tag: t.bool, color: palette.constant },
      { tag: t.atom, color: palette.constant },
      { tag: t.operator, color: palette.operator },
      { tag: t.comment, color: palette.comment, fontStyle: "italic" },
    ]),
  ),
];

export const SQL_SYNTAX_THEME_MAP: Record<ThemeId, Extension[]> = {
  default: [],
  "one-dark": [oneDark],
  "github-light": createSqlSyntaxTheme({
    keyword: "#cf222e",
    function: "#8250df",
    type: "#0550ae",
    string: "#0a3069",
    number: "#0550ae",
    variable: "#24292f",
    operator: "#57606a",
    comment: "#6e7781",
    constant: "#953800",
  }),
  "github-dark": createSqlSyntaxTheme({
    keyword: "#ff7b72",
    function: "#d2a8ff",
    type: "#79c0ff",
    string: "#a5d6ff",
    number: "#79c0ff",
    variable: "#c9d1d9",
    operator: "#8b949e",
    comment: "#8b949e",
    constant: "#ffa657",
  }),
  "monokai-pro": createSqlSyntaxTheme({
    keyword: "#ff6188",
    function: "#a9dc76",
    type: "#78dce8",
    string: "#ffd866",
    number: "#ab9df2",
    variable: "#fcfcfa",
    operator: "#f8f8f2",
    comment: "#939293",
    constant: "#fc9867",
  }),
  "night-owl": createSqlSyntaxTheme({
    keyword: "#c792ea",
    function: "#82aaff",
    type: "#7fdbca",
    string: "#ecc48d",
    number: "#f78c6c",
    variable: "#d6deeb",
    operator: "#7fdbca",
    comment: "#637777",
    constant: "#ff5874",
  }),
  "shades-of-purple": createSqlSyntaxTheme({
    keyword: "#ff9d00",
    function: "#b362ff",
    type: "#9effff",
    string: "#a5ff90",
    number: "#ff628c",
    variable: "#ffffff",
    operator: "#ff9d00",
    comment: "#b9b4f5",
    constant: "#fad000",
  }),
  palenight: createSqlSyntaxTheme({
    keyword: "#c792ea",
    function: "#82aaff",
    type: "#89ddff",
    string: "#c3e88d",
    number: "#f78c6c",
    variable: "#c7cbe6",
    operator: "#89ddff",
    comment: "#7f85a3",
    constant: "#ffcb6b",
  }),
  cyberpunk: createSqlSyntaxTheme({
    keyword: "#ff2bd6",
    function: "#00f5ff",
    type: "#7df9ff",
    string: "#ffe66d",
    number: "#ff8fab",
    variable: "#f8f7ff",
    operator: "#00f5ff",
    comment: "#9f88c5",
    constant: "#faff00",
  }),
  nord: createSqlSyntaxTheme({
    keyword: "#81a1c1",
    function: "#88c0d0",
    type: "#8fbcbb",
    string: "#a3be8c",
    number: "#b48ead",
    variable: "#eceff4",
    operator: "#d8dee9",
    comment: "#616e88",
    constant: "#ebcb8b",
  }),
  dracula: createSqlSyntaxTheme({
    keyword: "#ff79c6",
    function: "#50fa7b",
    type: "#8be9fd",
    string: "#f1fa8c",
    number: "#bd93f9",
    variable: "#f8f8f2",
    operator: "#ff79c6",
    comment: "#6272a4",
    constant: "#ffb86c",
  }),
};

export function getEditorTheme(theme: string): Extension[] {
  const preset = getThemePreset(theme);
  const syntaxTheme = SQL_SYNTAX_THEME_MAP[preset.editorTheme] ?? [];
  return preset.appearance === "dark"
    ? [...syntaxTheme, sqlEditorThemeDark]
    : [...syntaxTheme, sqlEditorThemeLight];
}
```

Wait — `getEditorTheme` needs `sqlEditorThemeDark`/`sqlEditorThemeLight` from `codemirrorTheme.ts`. Let me fix that import.

- [ ] **Step 2: Update sqlThemes.ts with correct import**

Add at the top of sqlThemes.ts, after existing imports:

```ts
import { sqlEditorThemeDark, sqlEditorThemeLight } from "./codemirrorTheme";
```

And the `getEditorTheme` function at the bottom:

```ts
export function getEditorTheme(theme: string): Extension[] {
  const preset = getThemePreset(theme);
  const syntaxTheme = SQL_SYNTAX_THEME_MAP[preset.editorTheme] ?? [];
  return preset.appearance === "dark"
    ? [...syntaxTheme, sqlEditorThemeDark]
    : [...syntaxTheme, sqlEditorThemeLight];
}
```

- [ ] **Step 3: Update SqlEditor.tsx to import from sqlThemes**

In `src/components/business/Editor/SqlEditor.tsx`, replace:

```ts
import { getThemePreset, type ThemeId } from "@/theme/themeRegistry";
```

with:

```ts
import { getEditorTheme } from "./sqlThemes";
```

Remove the old imports that are no longer needed in SqlEditor.tsx:
- Remove `import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";`
- Remove `import { tags as t } from "@lezer/highlight";`
- Remove `import { oneDark } from "@codemirror/theme-one-dark";`

Replace the `editorTheme` memo (lines ~720-726):

```ts
const editorTheme = useMemo(() => {
  const preset = getThemePreset(theme);
  const syntaxTheme = SQL_SYNTAX_THEME_MAP[preset.editorTheme] ?? [];
  return preset.appearance === "dark"
    ? [...syntaxTheme, sqlEditorThemeDark]
    : [...syntaxTheme, sqlEditorThemeLight];
}, [theme]);
```

with:

```ts
const editorTheme = useMemo(() => getEditorTheme(theme), [theme]);
```

Delete the `SqlSyntaxPalette` type, `createSqlSyntaxTheme` function, and `SQL_SYNTAX_THEME_MAP` constant from SqlEditor.tsx (lines ~82-219).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Editor/sqlThemes.ts src/components/business/Editor/SqlEditor.tsx
git commit -m "refactor: extract SQL theme data to sqlThemes.ts"
```

---

### Task 2: Create useSqlResults hook

**Files:**
- Create: `src/components/business/Editor/hooks/useSqlResults.ts`
- Create: `src/components/business/Editor/hooks/useSqlResults.unit.test.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/components/business/Editor/hooks/useSqlResults.ts
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { SingleResultState } from "@/lib/queryExecutionState";

export interface SqlResultsData {
  data: any[];
  columns: string[];
  executionTime?: string;
  error?: string;
  resultSets?: SingleResultState[];
  activeResultSetIndex?: number;
}

export interface SqlResultStatus {
  text: string;
  toneClass: string;
  Icon: LucideIcon;
}

export function useSqlResults(props: { queryResults?: SqlResultsData | null }) {
  const { queryResults } = props;
  const { t } = useTranslation();
  const [activeResultSetIndex, setActiveResultSetIndex] = useState(0);

  const resultStatus = useMemo((): SqlResultStatus | null => {
    if (!queryResults) return null;
    if (queryResults.error) {
      return {
        text: t("sqlEditor.result.failed"),
        toneClass: "text-destructive",
        Icon: XCircle,
      };
    }

    const hasMultipleResults =
      queryResults.resultSets && queryResults.resultSets.length > 1;
    if (hasMultipleResults) {
      const totalRows = queryResults.resultSets!.reduce(
        (sum, rs) => sum + rs.rowCount,
        0,
      );
      return {
        text: `${t("sqlEditor.result.success")} ${queryResults.resultSets!.length} results (${totalRows} rows)`,
        toneClass: "text-emerald-600 dark:text-emerald-400",
        Icon: CheckCircle2,
      };
    }

    const returnedRows = queryResults.data.length;
    const hasResultSet = queryResults.columns.length > 0;
    const suffix = hasResultSet
      ? returnedRows === 1
        ? t("sqlEditor.result.rowsSuffix", { count: returnedRows })
        : t("sqlEditor.result.rowsSuffixPlural", { count: returnedRows })
      : "";

    return {
      text: `${t("sqlEditor.result.success")}${suffix}`,
      toneClass: "text-emerald-600 dark:text-emerald-400",
      Icon: CheckCircle2,
    };
  }, [queryResults, t]);

  const hasMultipleResults =
    queryResults?.resultSets && queryResults.resultSets.length > 1;

  const currentResultSet = useMemo((): SingleResultState | null => {
    if (!queryResults) return null;
    if (hasMultipleResults && queryResults.resultSets) {
      return queryResults.resultSets[activeResultSetIndex] || null;
    }
    return null;
  }, [queryResults, hasMultipleResults, activeResultSetIndex]);

  const displayData = currentResultSet?.data ?? queryResults?.data ?? [];
  const displayColumns =
    currentResultSet?.columns ?? queryResults?.columns ?? [];

  return {
    resultStatus,
    displayData,
    displayColumns,
    hasMultipleResults: !!hasMultipleResults,
    activeResultSetIndex,
    setActiveResultSetIndex,
    currentResultSet,
  };
}
```

- [ ] **Step 2: Create the directory**

Run: `mkdir -p src/components/business/Editor/hooks`

- [ ] **Step 3: Create the test file**

```ts
// src/components/business/Editor/hooks/useSqlResults.unit.test.ts
import { mock } from "bun:test";

const mockT = (s: string, opts?: Record<string, unknown>) => {
  if (opts?.count !== undefined) return `${s} ${opts.count}`;
  return s;
};
mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

import { describe, test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useSqlResults } from "./useSqlResults";

describe("useSqlResults", () => {
  test("returns null resultStatus when no queryResults", () => {
    const { result } = renderHook(() => useSqlResults({}));
    expect(result.current.resultStatus).toBeNull();
  });

  test("returns error status when queryResults.error exists", () => {
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data: [], columns: [], error: "syntax error" },
      }),
    );
    expect(result.current.resultStatus).not.toBeNull();
    expect(result.current.resultStatus!.toneClass).toBe("text-destructive");
  });

  test("returns success status with row count for single result set", () => {
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data: [{ id: 1 }, { id: 2 }], columns: ["id"] },
      }),
    );
    expect(result.current.resultStatus).not.toBeNull();
    expect(result.current.resultStatus!.toneClass).toContain("emerald");
  });

  test("displayData uses queryResults.data for single result", () => {
    const data = [{ id: 1 }];
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data, columns: ["id"] },
      }),
    );
    expect(result.current.displayData).toBe(data);
    expect(result.current.displayColumns).toEqual(["id"]);
  });

  test("hasMultipleResults is false for single result set", () => {
    const { result } = renderHook(() =>
      useSqlResults({
        queryResults: { data: [], columns: [] },
      }),
    );
    expect(result.current.hasMultipleResults).toBe(false);
  });

  test("activeResultSetIndex defaults to 0", () => {
    const { result } = renderHook(() => useSqlResults({}));
    expect(result.current.activeResultSetIndex).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `bun test src/components/business/Editor/hooks/useSqlResults.unit.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Editor/hooks/useSqlResults.ts src/components/business/Editor/hooks/useSqlResults.unit.test.ts
git commit -m "refactor: extract useSqlResults hook from SqlEditor"
```

---

### Task 3: Create useSqlEditorForm hook

**Files:**
- Create: `src/components/business/Editor/hooks/useSqlEditorForm.ts`
- Create: `src/components/business/Editor/hooks/useSqlEditorForm.unit.test.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/components/business/Editor/hooks/useSqlEditorForm.ts
import { useState, useCallback, useRef, useEffect } from "react";

export function useSqlEditorForm(props: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const { value, onChange } = props;
  const [internalSql, setInternalSql] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const code = value !== undefined ? value : internalSql;

  const handleSqlChange = useCallback(
    (val: string) => {
      if (value === undefined) {
        setInternalSql(val);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (onChange) {
          onChange(val);
        }
      }, 300);
    },
    [onChange, value],
  );

  return { code, handleSqlChange };
}
```

- [ ] **Step 2: Create the test file**

```ts
// src/components/business/Editor/hooks/useSqlEditorForm.unit.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useSqlEditorForm } from "./useSqlEditorForm";

describe("useSqlEditorForm", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  test("uses internal state when no value prop provided", () => {
    const { result } = renderHook(() => useSqlEditorForm({}));
    act(() => result.current.handleSqlChange("SELECT 1"));
    expect(result.current.code).toBe("SELECT 1");
  });

  test("uses controlled value when value prop provided", () => {
    const { result } = renderHook(() =>
      useSqlEditorForm({ value: "SELECT 2" }),
    );
    expect(result.current.code).toBe("SELECT 2");
  });

  test("debounces onChange callback by 300ms", () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useSqlEditorForm({ onChange }));

    act(() => result.current.handleSqlChange("SELECT 1"));
    expect(onChange).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith("SELECT 1");
  });
});
```

Wait — the test uses `jest` but the project uses `bun:test`. Let me fix the test to use bun-compatible patterns.

- [ ] **Step 3: Fix test for bun:test compatibility**

```ts
// src/components/business/Editor/hooks/useSqlEditorForm.unit.test.ts
import { describe, test, expect, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useSqlEditorForm } from "./useSqlEditorForm";

describe("useSqlEditorForm", () => {
  test("uses internal state when no value prop provided", () => {
    const { result } = renderHook(() => useSqlEditorForm({}));
    act(() => result.current.handleSqlChange("SELECT 1"));
    expect(result.current.code).toBe("SELECT 1");
  });

  test("uses controlled value when value prop provided", () => {
    const { result } = renderHook(() =>
      useSqlEditorForm({ value: "SELECT 2" }),
    );
    expect(result.current.code).toBe("SELECT 2");
  });

  test("debounces onChange callback by 300ms", async () => {
    const onChange = mock(() => {});
    const { result } = renderHook(() => useSqlEditorForm({ onChange }));

    act(() => result.current.handleSqlChange("SELECT 1"));
    expect(onChange).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 350));
    expect(onChange).toHaveBeenCalledWith("SELECT 1");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `bun test src/components/business/Editor/hooks/useSqlEditorForm.unit.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Editor/hooks/useSqlEditorForm.ts src/components/business/Editor/hooks/useSqlEditorForm.unit.test.ts
git commit -m "refactor: extract useSqlEditorForm hook from SqlEditor"
```

---

### Task 4: Create useSqlEditorApi hook

**Files:**
- Create: `src/components/business/Editor/hooks/useSqlEditorApi.ts`
- Create: `src/components/business/Editor/hooks/useSqlEditorApi.unit.test.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/components/business/Editor/hooks/useSqlEditorApi.ts
import { useState, useCallback, useRef } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api, type SavedQuery, type TransferFormat, isTauri } from "@/services/api";
import { errorMessage } from "@/lib/errors";

export function useSqlEditorApi(props: {
  code: string;
  connectionId?: number;
  databaseName?: string;
  driver?: string;
  savedQueryId?: number;
  initialName?: string;
  initialDescription?: string;
  onSaveSuccess?: (savedQuery: SavedQuery) => void;
}) {
  const {
    code,
    connectionId,
    databaseName,
    driver,
    savedQueryId,
    initialName,
    initialDescription,
    onSaveSuccess,
  } = props;
  const { t } = useTranslation();
  const [isFormatting, setIsFormatting] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const savedQueryIdRef = useRef(savedQueryId);

  // Keep ref in sync
  if (savedQueryIdRef.current !== savedQueryId) {
    savedQueryIdRef.current = savedQueryId;
  }

  const executeSave = useCallback(
    async (name: string, description: string) => {
      try {
        const currentId = savedQueryIdRef.current;
        let result: SavedQuery;
        if (currentId) {
          result = await api.queries.update(currentId, {
            name,
            description,
            query: code,
            connectionId: connectionId || undefined,
            database: databaseName,
          });
        } else {
          result = await api.queries.create({
            name,
            description,
            query: code,
            connectionId: connectionId || undefined,
            database: databaseName,
          });
        }
        toast.success(t("sqlEditor.save.success"));
        if (onSaveSuccess) {
          onSaveSuccess(result);
        }
      } catch (e) {
        console.error("Failed to save query", e);
        toast.error(t("sqlEditor.save.failed"), {
          description: errorMessage(e),
        });
      }
    },
    [code, connectionId, databaseName, onSaveSuccess, t],
  );

  const triggerSave = useCallback(() => {
    const currentId = savedQueryIdRef.current;
    if (currentId) {
      executeSave(
        initialName || t("sqlEditor.untitled"),
        initialDescription || "",
      );
    } else {
      setIsSaveDialogOpen(true);
    }
  }, [initialName, initialDescription, executeSave, t]);

  const handleExportResult = useCallback(
    async (format: TransferFormat) => {
      if (!connectionId) {
        toast.error(t("sqlEditor.export.runWithSavedConnection"));
        return;
      }
      if (!isTauri()) {
        toast.error(t("sqlEditor.export.desktopOnly"));
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const defaultPath = `query_result_${timestamp}.${format}`;
      const filters =
        format === "csv"
          ? [{ name: "CSV", extensions: ["csv"] }]
          : format === "json"
            ? [{ name: "JSON", extensions: ["json"] }]
            : [{ name: "SQL", extensions: ["sql"] }];

      let filePath: string | undefined;
      try {
        const selected = await save({
          title: t("sqlEditor.export.saveFileTitle"),
          defaultPath,
          filters,
        });
        if (!selected) return;
        filePath = Array.isArray(selected) ? selected[0] : selected;
        if (!filePath) return;
      } catch (e) {
        toast.error(t("sqlEditor.export.openSaveDialogFailed"), {
          description: errorMessage(e),
        });
        return;
      }

      try {
        const result = await api.transfer.exportQueryResult({
          id: connectionId,
          database: databaseName,
          sql: code,
          driver: driver || "postgres",
          format,
          filePath,
        });
        toast.success(
          t("sqlEditor.export.completed", { count: result.rowCount }),
          {
            description: result.filePath,
          },
        );
      } catch (e) {
        toast.error(t("sqlEditor.export.failed"), {
          description: errorMessage(e),
        });
      }
    },
    [connectionId, databaseName, code, driver, t],
  );

  const handleFormat = useCallback(async () => {
    if (isFormatting) return;

    setIsFormatting(true);
    try {
      const { format } = await import("sql-formatter");
      const dialectMap: Record<string, string> = {
        postgres: "postgresql",
        postgresql: "postgresql",
        mysql: "mysql",
        tidb: "mysql",
        mariadb: "mysql",
        starrocks: "mysql",
        sqlite: "sqlite",
        duckdb: "sqlite",
        clickhouse: "sql",
        mssql: "transactsql",
      };
      const language = ((driver && dialectMap[driver]) || "sql") as any;
      const formatted = format(code, {
        language,
        keywordCase: "upper",
        tabWidth: 2,
      });
      return formatted;
    } catch (e) {
      console.error("Format failed:", e);
      toast.error(t("sqlEditor.error.formatFailed"), {
        description: errorMessage(e),
      });
      return undefined;
    } finally {
      setIsFormatting(false);
    }
  }, [code, driver, isFormatting, t]);

  return {
    executeSave,
    triggerSave,
    handleExportResult,
    handleFormat,
    isFormatting,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
  };
}
```

Note: `handleFormat` returns the formatted string (or undefined on error) instead of calling `handleSqlChange` directly. The container will wire it to the form hook's `handleSqlChange`.

- [ ] **Step 2: Create the test file**

```ts
// src/components/business/Editor/hooks/useSqlEditorApi.unit.test.ts
import { mock } from "bun:test";

const mockT = (s: string) => s;
mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

mock.module("sonner", () => ({
  toast: { success: mock(), error: mock() },
}));

mock.module("@/lib/errors", () => ({
  errorMessage: (e: unknown) => String(e),
}));

mock.module("@tauri-apps/plugin-dialog", () => ({
  save: mock(() => Promise.resolve(null)),
}));

mock.module("@/services/api", () => ({
  api: {
    queries: {
      create: mock(() => Promise.resolve({ id: 1, name: "test" })),
      update: mock(() => Promise.resolve({ id: 1, name: "test" })),
    },
    transfer: {
      exportQueryResult: mock(() => Promise.resolve({ rowCount: 10, filePath: "/tmp/test.csv" })),
    },
  },
  isTauri: () => false,
}));

import { describe, test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useSqlEditorApi } from "./useSqlEditorApi";

describe("useSqlEditorApi", () => {
  test("isFormatting defaults to false", () => {
    const { result } = renderHook(() =>
      useSqlEditorApi({ code: "SELECT 1" }),
    );
    expect(result.current.isFormatting).toBe(false);
  });

  test("isSaveDialogOpen defaults to false", () => {
    const { result } = renderHook(() =>
      useSqlEditorApi({ code: "SELECT 1" }),
    );
    expect(result.current.isSaveDialogOpen).toBe(false);
  });

  test("setIsSaveDialogOpen toggles dialog state", () => {
    const { result } = renderHook(() =>
      useSqlEditorApi({ code: "SELECT 1" }),
    );
    result.current.setIsSaveDialogOpen(true);
    expect(result.current.isSaveDialogOpen).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `bun test src/components/business/Editor/hooks/useSqlEditorApi.unit.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/business/Editor/hooks/useSqlEditorApi.ts src/components/business/Editor/hooks/useSqlEditorApi.unit.test.ts
git commit -m "refactor: extract useSqlEditorApi hook from SqlEditor"
```

---

### Task 5: Create useSqlEditorActions hook

**Files:**
- Create: `src/components/business/Editor/hooks/useSqlEditorActions.ts`
- Create: `src/components/business/Editor/hooks/useSqlEditorActions.unit.test.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/components/business/Editor/hooks/useSqlEditorActions.ts
import { useMemo, useCallback, useRef } from "react";
import type { Extension } from "@uiw/react-codemirror";
import { sql, PostgreSQL, MySQL, SQLite, StandardSQL, type SQLNamespace } from "@codemirror/lang-sql";
import { EditorView, keymap } from "@codemirror/view";
import { acceptCompletion } from "@codemirror/autocomplete";
import { Prec } from "@codemirror/state";
import { insertTab } from "@codemirror/commands";
import { comboToCodeMirror } from "@/lib/shortcuts/match";
import { useShortcutBinding } from "@/contexts/ShortcutsContext";
import { collectSelectedSql } from "../sqlSelection";
import { buildSqlContextualCompletion } from "../sqlCompletionContext";
import { CLICKHOUSE_COMPLETIONS } from "../clickhouseKeywords";
import { getEditorTheme } from "../sqlThemes";
import type { SchemaOverview } from "@/services/api";

export function useSqlEditorActions(props: {
  driver?: string;
  schemaOverview?: SchemaOverview;
  editorFontSizePx: number;
  onExecute?: (sql: string) => void;
  handleFormat: () => Promise<string | undefined>;
  triggerSave: () => void;
  handleSqlChange: (val: string) => void;
}) {
  const {
    driver,
    schemaOverview,
    editorFontSizePx,
    onExecute,
    handleFormat,
    triggerSave,
    handleSqlChange,
  } = props;

  const editorViewRef = useRef<EditorView | null>(null);

  // Stable refs so keymap handlers never cause extensions to be rebuilt
  const executeFromEditorRef = useRef<(view: EditorView) => void>();
  const handleFormatRef = useRef(handleFormat);
  handleFormatRef.current = handleFormat;
  const triggerSaveRef = useRef(triggerSave);
  triggerSaveRef.current = triggerSave;
  const handleSqlChangeRef = useRef(handleSqlChange);
  handleSqlChangeRef.current = handleSqlChange;

  const executeFromEditorSelection = useCallback(
    (view: EditorView) => {
      if (!onExecute) return;
      const sqlToRun = collectSelectedSql({
        ranges: view.state.selection.ranges,
        sliceDoc: (from, to) => view.state.sliceDoc(from, to),
        fullDoc: () => view.state.doc.toString(),
      });
      onExecute(sqlToRun);
    },
    [onExecute],
  );
  executeFromEditorRef.current = executeFromEditorSelection;

  const handleExecute = useCallback(() => {
    if (!onExecute) return;
    const view = editorViewRef.current;
    if (view) {
      executeFromEditorSelection(view);
      return;
    }
    // Fallback: execute whatever is in the editor (no view ref means no selection context)
    // This path is not normally reached since CodeMirror always sets the view ref
  }, [onExecute, executeFromEditorSelection]);

  const handleClear = useCallback(() => {
    handleSqlChangeRef.current("");
  }, []);

  const executeBinding = useShortcutBinding("editor.execute");
  const saveBinding = useShortcutBinding("editor.save");
  const formatBinding = useShortcutBinding("editor.format");
  const acceptBinding = useShortcutBinding("editor.acceptCompletion");

  // Determine dialect
  const dialect = useMemo(() => {
    switch (driver) {
      case "postgres":
        return PostgreSQL;
      case "mysql":
      case "tidb":
      case "mariadb":
      case "starrocks":
        return MySQL;
      case "sqlite":
      case "duckdb":
        return SQLite;
      default:
        return StandardSQL;
    }
  }, [driver]);

  // Build schema for CodeMirror
  const sqlSchema = useMemo((): SQLNamespace => {
    if (!schemaOverview) return {};
    const schemaMap: SQLNamespace = {};
    schemaOverview.tables.forEach((t) => {
      const colNames = t.columns.map((c) => c.name);
      schemaMap[t.name] = colNames;
      if (t.schema) {
        schemaMap[`${t.schema}.${t.name}`] = colNames;
      }
    });
    return schemaMap;
  }, [schemaOverview]);

  // Custom completions
  const customCompletion = useMemo(() => {
    const hasSchema = !!schemaOverview;
    const isClickhouse = driver === "clickhouse";
    if (!hasSchema && !isClickhouse) return null;

    return (context: any): any => {
      const results: any[] = [];

      if (hasSchema) {
        const r = buildSqlContextualCompletion({
          textBeforeCursor: context.state.sliceDoc(0, context.pos),
          explicit: context.explicit,
          schemaOverview: schemaOverview!,
        });
        if (r) results.push(r);
      }

      if (isClickhouse) {
        const word = context.matchBefore(/\w*/);
        if (word && (word.from !== word.to || context.explicit)) {
          results.push({ from: word.from, options: CLICKHOUSE_COMPLETIONS });
        }
      }

      if (results.length === 0) return null;
      if (results.length === 1) return { ...results[0], validFor: /^[\w$]*$/ };

      const from = results.reduce(
        (min, r) => Math.min(min, r.from),
        results[0].from,
      );
      const seen = new Set<string>();
      const options: any[] = [];
      for (const result of results) {
        for (const option of result.options) {
          const key = `${option.label}::${option.type ?? ""}`;
          if (!seen.has(key)) {
            seen.add(key);
            options.push(option);
          }
        }
      }
      return { from, options, validFor: /^[\w$]*$/ };
    };
  }, [schemaOverview, driver]);

  // Assemble extensions
  const extensions = useMemo((): Extension[] => {
    const fontSizeExt = EditorView.theme({
      ".cm-scroller": {
        fontSize: `${editorFontSizePx}px`,
      },
    });
    const exts: Extension[] = [
      EditorView.lineWrapping,
      fontSizeExt,
      sql({
        dialect,
        schema: sqlSchema,
        upperCaseKeywords: true,
      }),
      Prec.high(
        keymap.of([
          {
            key: comboToCodeMirror(acceptBinding),
            run: (view) => acceptCompletion(view) || insertTab(view),
          },
          {
            key: comboToCodeMirror(executeBinding),
            run: (view) => {
              executeFromEditorRef.current?.(view);
              return true;
            },
          },
          {
            key: comboToCodeMirror(formatBinding),
            run: () => {
              void handleFormatRef.current().then((formatted) => {
                if (formatted !== undefined) {
                  handleSqlChangeRef.current(formatted);
                }
              });
              return true;
            },
          },
          {
            key: comboToCodeMirror(saveBinding),
            run: () => {
              triggerSaveRef.current();
              return true;
            },
          },
        ]),
      ),
    ];

    if (customCompletion) {
      exts.push(
        dialect.language.data.of({
          autocomplete: customCompletion,
        }),
      );
    }

    return exts;
  }, [
    dialect,
    sqlSchema,
    customCompletion,
    editorFontSizePx,
    executeBinding,
    saveBinding,
    formatBinding,
    acceptBinding,
  ]);

  // Theme
  const editorTheme = useMemo(() => {
    // This will be computed from the parent's theme
    // The container passes theme down and calls getEditorTheme
    return [] as Extension[];
  }, []);

  return {
    extensions,
    editorViewRef,
    handleExecute,
    handleClear,
    dialect,
    sqlSchema,
  };
}
```

Wait — the `editorTheme` computation needs the theme string. Let me add it as a prop.

- [ ] **Step 2: Add theme prop to useSqlEditorActions**

Update the props interface and add theme:

```ts
export function useSqlEditorActions(props: {
  driver?: string;
  schemaOverview?: SchemaOverview;
  editorFontSizePx: number;
  theme: string;
  onExecute?: (sql: string) => void;
  handleFormat: () => Promise<string | undefined>;
  triggerSave: () => void;
  handleSqlChange: (val: string) => void;
}) {
  // ... existing code ...

  // Theme
  const editorTheme = useMemo(() => getEditorTheme(props.theme), [props.theme]);

  return {
    extensions,
    editorTheme,
    editorViewRef,
    handleExecute,
    handleClear,
  };
}
```

- [ ] **Step 3: Create the test file**

```ts
// src/components/business/Editor/hooks/useSqlEditorActions.unit.test.ts
import { mock } from "bun:test";

const mockT = (s: string) => s;
mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

mock.module("@/contexts/ShortcutsContext", () => ({
  useShortcutBinding: (id: string) => id,
}));

mock.module("@/lib/shortcuts/match", () => ({
  comboToCodeMirror: (s: string) => s,
}));

import { describe, test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useSqlEditorActions } from "./useSqlEditorActions";

describe("useSqlEditorActions", () => {
  const baseProps = {
    editorFontSizePx: 14,
    theme: "default",
    handleFormat: async () => undefined,
    triggerSave: () => {},
    handleSqlChange: () => {},
  };

  test("returns extensions array", () => {
    const { result } = renderHook(() => useSqlEditorActions(baseProps));
    expect(Array.isArray(result.current.extensions)).toBe(true);
    expect(result.current.extensions.length).toBeGreaterThan(0);
  });

  test("returns editorTheme array", () => {
    const { result } = renderHook(() => useSqlEditorActions(baseProps));
    expect(Array.isArray(result.current.editorTheme)).toBe(true);
  });

  test("returns editorViewRef", () => {
    const { result } = renderHook(() => useSqlEditorActions(baseProps));
    expect(result.current.editorViewRef).toBeDefined();
    expect(result.current.editorViewRef.current).toBeNull();
  });

  test("handleExecute does not throw when no onExecute", () => {
    const { result } = renderHook(() => useSqlEditorActions(baseProps));
    expect(() => result.current.handleExecute()).not.toThrow();
  });

  test("handleClear calls handleSqlChange with empty string", () => {
    const handleSqlChange = mock(() => {});
    const { result } = renderHook(() =>
      useSqlEditorActions({ ...baseProps, handleSqlChange }),
    );
    result.current.handleClear();
    expect(handleSqlChange).toHaveBeenCalledWith("");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `bun test src/components/business/Editor/hooks/useSqlEditorActions.unit.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Editor/hooks/useSqlEditorActions.ts src/components/business/Editor/hooks/useSqlEditorActions.unit.test.ts
git commit -m "refactor: extract useSqlEditorActions hook from SqlEditor"
```

---

### Task 6: Create SqlResultsPanel component

**Files:**
- Create: `src/components/business/Editor/SqlResultsPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/business/Editor/SqlResultsPanel.tsx
import { useTranslation } from "react-i18next";
import { TableView } from "@/components/business/DataGrid/TableView";
import type { SingleResultState } from "@/lib/queryExecutionState";

interface SqlResultsPanelProps {
  queryResults: {
    data: any[];
    columns: string[];
    error?: string;
    resultSets?: SingleResultState[];
  };
  hasMultipleResults: boolean;
  activeResultSetIndex: number;
  onResultSetChange: (idx: number) => void;
  displayData: any[];
  displayColumns: string[];
}

export function SqlResultsPanel({
  queryResults,
  hasMultipleResults,
  activeResultSetIndex,
  onResultSetChange,
  displayData,
  displayColumns,
}: SqlResultsPanelProps) {
  const { t } = useTranslation();

  if (queryResults.error) {
    return (
      <div className="h-full p-4 bg-destructive/10 text-destructive overflow-auto font-mono text-sm whitespace-pre-wrap">
        <div className="font-bold mb-2">
          {t("sqlEditor.error.executingQuery")}
        </div>
        {queryResults.error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {hasMultipleResults && (
        <div className="flex border-b bg-muted/30">
          {queryResults.resultSets!.map((rs, idx) => (
            <button
              key={idx}
              className={`px-3 py-1.5 text-sm ${
                idx === activeResultSetIndex
                  ? "border-b-2 border-primary bg-background"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => onResultSetChange(idx)}
            >
              Result {idx + 1} ({rs.rowCount} rows)
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <TableView
          data={displayData}
          columns={displayColumns}
          hideHeader
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Editor/SqlResultsPanel.tsx
git commit -m "refactor: extract SqlResultsPanel component from SqlEditor"
```

---

### Task 7: Create SqlToolbar component

**Files:**
- Create: `src/components/business/Editor/SqlToolbar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/business/Editor/SqlToolbar.tsx
import { useTranslation } from "react-i18next";
import {
  Play,
  Save,
  Trash2,
  Database,
  Braces,
  Download,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SchemaOverview, TransferFormat } from "@/services/api";

interface SqlToolbarProps {
  databaseName?: string;
  availableDatabases?: string[];
  canSwitchDatabase: boolean;
  savedQueryId?: number;
  schemaOverview?: SchemaOverview;
  onDatabaseChange?: (database: string) => void;
  isExecuting?: boolean;
  isFormatting: boolean;
  onExecute: () => void;
  onFormat: () => void;
  onCancel?: () => void;
  onTriggerSave: () => void;
  onClear: () => void;
  resultStatus: {
    text: string;
    toneClass: string;
    Icon: LucideIcon;
  } | null;
  queryResults?: {
    error?: string;
  } | null;
  onExportResult: (format: TransferFormat) => void;
}

export function SqlToolbar({
  databaseName,
  availableDatabases,
  canSwitchDatabase,
  savedQueryId,
  schemaOverview,
  onDatabaseChange,
  isExecuting,
  isFormatting,
  onExecute,
  onFormat,
  onCancel,
  onTriggerSave,
  onClear,
  resultStatus,
  queryResults,
  onExportResult,
}: SqlToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
      <div className="flex items-center gap-2">
        {databaseName &&
          (canSwitchDatabase ? (
            <div className="flex items-center gap-2">
              <Database
                className={`w-3 h-3 ${schemaOverview ? "text-green-500" : "text-muted-foreground"}`}
              />
              <Select value={databaseName} onValueChange={onDatabaseChange}>
                <SelectTrigger
                  size="sm"
                  className="h-8 min-w-[180px] bg-muted/50 text-xs"
                  aria-label={t("sqlEditor.database.ariaLabel")}
                >
                  <SelectValue
                    placeholder={t("sqlEditor.database.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableDatabases?.map((database) => (
                    <SelectItem key={database} value={database}>
                      {database}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savedQueryId && (
                <span className="text-[10px] opacity-50">
                  #{savedQueryId}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded text-xs text-muted-foreground border border-border">
              <Database
                className={`w-3 h-3 ${schemaOverview ? "text-green-500" : "text-muted-foreground"}`}
              />
              <span>{databaseName}</span>
              {savedQueryId && (
                <span className="text-[10px] opacity-50 ml-1">
                  #{savedQueryId}
                </span>
              )}
            </div>
          ))}

        <div className="w-px h-4 bg-border mx-2" />

        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onExecute}
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.runSql")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onFormat}
                  disabled={isFormatting}
                >
                  <Braces className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.formatSql")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCancel}
                >
                  <span className="h-3 w-3 bg-foreground/80 rounded-[1px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.cancelQuery")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onTriggerSave}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.saveQuery")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClear}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.clearEditor")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {resultStatus && (
          <>
            <span
              className={`text-xs inline-flex items-center gap-1 ${resultStatus.toneClass}`}
            >
              <resultStatus.Icon className="w-3.5 h-3.5" />
              {resultStatus.text}
            </span>
          </>
        )}
        {queryResults && !queryResults.error && (
          <>
            <div className="w-px h-3 bg-border mx-2" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Download className="w-4 h-4" />
                  {t("sqlEditor.export.result")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onExportResult("csv")}
                >
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExportResult("json")}
                >
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExportResult("sql_dml")}
                >
                  SQL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/business/Editor/SqlToolbar.tsx
git commit -m "refactor: extract SqlToolbar component from SqlEditor"
```

---

### Task 8: Rewire SqlEditor.tsx container

**Files:**
- Modify: `src/components/business/Editor/SqlEditor.tsx`

- [ ] **Step 1: Replace SqlEditor.tsx content**

Read the current file first, then replace the entire content:

```tsx
// src/components/business/Editor/SqlEditor.tsx
import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TableView } from "@/components/business/DataGrid/TableView";
import { useTheme } from "@/components/theme-provider";
import type { SchemaOverview, SavedQuery } from "@/services/api";
import { SaveQueryDialog } from "./SaveQueryDialog";
import { useTranslation } from "react-i18next";
import { SingleResultState } from "@/lib/queryExecutionState";
import { useSqlEditorForm } from "./hooks/useSqlEditorForm";
import { useSqlEditorApi } from "./hooks/useSqlEditorApi";
import { useSqlEditorActions } from "./hooks/useSqlEditorActions";
import { useSqlResults } from "./hooks/useSqlResults";
import { SqlToolbar } from "./SqlToolbar";
import { SqlResultsPanel } from "./SqlResultsPanel";

type SqlEditorProps = {
  queryResults?: {
    data: any[];
    columns: string[];
    executionTime?: string;
    error?: string;
    resultSets?: SingleResultState[];
    activeResultSetIndex?: number;
  } | null;
  onExecute?: (sql: string) => void;
  onCancel?: () => void;
  databaseName?: string;
  availableDatabases?: string[];
  value?: string;
  onChange?: (value: string) => void;
  onDatabaseChange?: (database: string) => void;
  connectionId?: number;
  driver?: string;
  schemaOverview?: SchemaOverview;
  savedQueryId?: number;
  initialName?: string;
  initialDescription?: string;
  onSaveSuccess?: (savedQuery: SavedQuery) => void;
  isExecuting?: boolean;
};

export function SqlEditor({
  queryResults,
  onExecute,
  onCancel,
  databaseName,
  availableDatabases,
  value,
  onChange,
  onDatabaseChange,
  connectionId,
  driver,
  schemaOverview,
  savedQueryId,
  initialName,
  initialDescription,
  onSaveSuccess,
  isExecuting,
}: SqlEditorProps) {
  const { t } = useTranslation();
  const { theme, editorFontSizePx } = useTheme();

  const form = useSqlEditorForm({ value, onChange });

  const api = useSqlEditorApi({
    code: form.code,
    connectionId,
    databaseName,
    driver,
    savedQueryId,
    initialName,
    initialDescription,
    onSaveSuccess,
  });

  const results = useSqlResults({ queryResults });

  const actions = useSqlEditorActions({
    driver,
    schemaOverview,
    editorFontSizePx,
    theme,
    onExecute,
    handleFormat: api.handleFormat,
    triggerSave: api.triggerSave,
    handleSqlChange: form.handleSqlChange,
  });

  const canSwitchDatabase =
    !!databaseName &&
    !!onDatabaseChange &&
    !!availableDatabases &&
    availableDatabases.length > 1;

  const handleFormatClick = async () => {
    const formatted = await api.handleFormat();
    if (formatted !== undefined) {
      form.handleSqlChange(formatted);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <SqlToolbar
        databaseName={databaseName}
        availableDatabases={availableDatabases}
        canSwitchDatabase={canSwitchDatabase}
        savedQueryId={savedQueryId}
        schemaOverview={schemaOverview}
        onDatabaseChange={onDatabaseChange}
        isExecuting={isExecuting}
        isFormatting={api.isFormatting}
        onExecute={actions.handleExecute}
        onFormat={handleFormatClick}
        onCancel={onCancel}
        onTriggerSave={api.triggerSave}
        onClear={actions.handleClear}
        resultStatus={results.resultStatus}
        queryResults={queryResults}
        onExportResult={api.handleExportResult}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={queryResults ? 50 : 100} minSize={30}>
            <div className="h-full flex flex-col text-base">
              <CodeMirror
                value={form.code}
                height="100%"
                extensions={actions.extensions}
                theme={actions.editorTheme}
                onChange={form.handleSqlChange}
                onCreateEditor={(view) => {
                  actions.editorViewRef.current = view;
                }}
                className="h-full"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  autocompletion: true,
                }}
              />
            </div>
          </ResizablePanel>

          {queryResults && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                <SqlResultsPanel
                  queryResults={queryResults}
                  hasMultipleResults={results.hasMultipleResults}
                  activeResultSetIndex={results.activeResultSetIndex}
                  onResultSetChange={results.setActiveResultSetIndex}
                  displayData={results.displayData}
                  displayColumns={results.displayColumns}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      <SaveQueryDialog
        open={api.isSaveDialogOpen}
        onOpenChange={api.setIsSaveDialogOpen}
        onSave={api.executeSave}
        initialName={initialName}
        initialDescription={initialDescription}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run all existing tests**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 5: Commit**

```bash
git add src/components/business/Editor/SqlEditor.tsx
git commit -m "refactor: rewire SqlEditor to use extracted hooks and components"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 4: Verify line counts**

Run: `wc -l src/components/business/Editor/SqlEditor.tsx src/components/business/Editor/SqlToolbar.tsx src/components/business/Editor/SqlResultsPanel.tsx src/components/business/Editor/sqlThemes.ts src/components/business/Editor/hooks/*.ts`

Expected: SqlEditor.tsx ~200 lines, each hook ~80-150 lines, each render component ~100-200 lines

- [ ] **Step 5: Final commit if needed**

If any fixups were needed during verification, commit them.
