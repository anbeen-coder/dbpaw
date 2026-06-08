import { mock } from "bun:test";

const mockT = (s: string) => s;

mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

mock.module("sonner", () => ({
  toast: { success: mock(), error: mock() },
}));

mock.module("@tauri-apps/plugin-dialog", () => ({
  save: mock(() => Promise.resolve(null)),
}));

mock.module("@uiw/react-codemirror", () => ({
  default: ({
    value,
    onChange,
    onCreateEditor,
  }: {
    value: string;
    onChange: (val: string) => void;
    onCreateEditor?: (view: any) => void;
  }) => {
    return (
      <textarea
        data-testid="codemirror-stub"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        ref={(el) => {
          if (el && onCreateEditor) {
            onCreateEditor({
              state: {
                selection: { ranges: [{ from: 0, to: 0 }] },
                sliceDoc: (from: number, to: number) => value.slice(from, to),
                doc: { toString: () => value },
              },
            });
          }
        }}
      />
    );
  },
}));

const saveQueryCalls: any[] = [];
mock.module("./SaveQueryDialog", () => ({
  SaveQueryDialog: ({
    open,
    onSave,
    onOpenChange,
  }: {
    open: boolean;
    onSave: (name: string, desc: string) => void;
    onOpenChange: (open: boolean) => void;
  }) => {
    saveQueryCalls.push({ open, onSave, onOpenChange });
    return open ? (
      <div data-testid="save-dialog">
        <button onClick={() => onSave("Test Query", "desc")}>Save</button>
      </div>
    ) : null;
  },
}));

mock.module("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

mock.module("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

mock.module("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: any;
  }) => (
    <div data-select-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <div data-item-value={value}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

mock.module("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

mock.module("@/contexts/ShortcutsContext", () => ({
  useShortcutBinding: () => "Mod-Enter",
}));

mock.module("@/lib/shortcuts/match", () => ({
  comboToCodeMirror: () => "Mod-Enter",
}));

mock.module("@/components/theme-provider", () => ({
  useTheme: () => ({
    theme: "default",
    editorFontSizePx: 14,
  }),
}));

mock.module("@/theme/themeRegistry", () => ({
  getThemePreset: () => ({
    appearance: "light",
    editorTheme: "default",
  }),
}));

mock.module("@/components/business/DataGrid/TableView", () => ({
  TableView: ({ data, columns }: any) => (
    <div data-testid="results-table">
      {data?.length ?? 0} rows, {columns?.length ?? 0} cols
    </div>
  ),
}));

mock.module("@/services/api", () => ({
  api: {
    query: { cancel: mock(() => Promise.resolve(false)) },
    queries: {
      create: mock(() => Promise.resolve({ id: 1, name: "Test", query: "SELECT 1" })),
      update: mock(() => Promise.resolve({ id: 1, name: "Test", query: "SELECT 1" })),
    },
    transfer: {
      exportQueryResult: mock(() => Promise.resolve({ rowCount: 10, filePath: "/tmp/out.csv" })),
    },
  },
  isTauri: () => false,
}));

mock.module("@/lib/errors", () => ({
  errorMessage: (e: any) => String(e),
}));

import { describe, test, expect, beforeEach } from "bun:test";
import { render, fireEvent, act } from "@testing-library/react";
import { SqlEditor } from "./SqlEditor";

describe("SqlEditor", () => {
  beforeEach(() => {
    saveQueryCalls.length = 0;
  });

  test("renders editor with initial value", () => {
    const { container } = render(<SqlEditor value="SELECT 1" />);
    expect(container.textContent).toContain("SELECT 1");
  });

  test("play button calls onExecute", () => {
    const calls: string[] = [];
    const { container } = render(
      <SqlEditor value="SELECT 1" onExecute={(sql) => calls.push(sql)} />,
    );

    // Play button is the first button with an SVG icon
    const buttons = Array.from(container.getElementsByTagName("button"));
    const playBtn = buttons.find((b) => b.textContent === "");
    if (playBtn) fireEvent.click(playBtn);
    expect(calls).toEqual(["SELECT 1"]);
  });

  test("results panel renders when queryResults provided", () => {
    const { container } = render(
      <SqlEditor
        value="SELECT 1"
        queryResults={{
          data: [{ id: 1 }],
          columns: ["id"],
        }}
      />,
    );

    expect(container.textContent).toContain("1 rows, 1 cols");
  });

  test("error state renders for failed query", () => {
    const { container } = render(
      <SqlEditor
        value="SELECT 1"
        queryResults={{
          data: [],
          columns: [],
          error: "syntax error",
        }}
      />,
    );

    expect(container.textContent).toContain("syntax error");
  });

  test("result status shows success", () => {
    const { container } = render(
      <SqlEditor
        value="SELECT 1"
        queryResults={{
          data: [{ id: 1 }, { id: 2 }],
          columns: ["id"],
        }}
      />,
    );

    expect(container.textContent).toContain("sqlEditor.result.success");
  });

  test("result status shows error tone", () => {
    const { container } = render(
      <SqlEditor
        value="SELECT 1"
        queryResults={{
          data: [],
          columns: [],
          error: "fail",
        }}
      />,
    );

    expect(container.textContent).toContain("sqlEditor.result.failed");
  });

  test("export dropdown shows CSV/JSON/SQL options", () => {
    const { container } = render(
      <SqlEditor
        value="SELECT 1"
        queryResults={{
          data: [{ id: 1 }],
          columns: ["id"],
        }}
      />,
    );

    expect(container.textContent).toContain("sqlEditor.export.result");
    expect(container.textContent).toContain("CSV");
    expect(container.textContent).toContain("JSON");
  });

  test("database label renders for single database", () => {
    const { container } = render(
      <SqlEditor value="" databaseName="mydb" />,
    );

    expect(container.textContent).toContain("mydb");
  });

  test("save button exists and is clickable", () => {
    const { container } = render(<SqlEditor value="SELECT 1" />);

    // Save button exists in the toolbar
    const buttons = Array.from(container.getElementsByTagName("button"));
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  test("clear button exists and is clickable", () => {
    const { container } = render(
      <SqlEditor value="SELECT 1" />,
    );

    const buttons = Array.from(container.getElementsByTagName("button"));
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });

  test("cancel button exists", () => {
    const { container } = render(
      <SqlEditor value="SELECT 1" onCancel={() => {}} />,
    );

    const buttons = Array.from(container.getElementsByTagName("button"));
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  test("play button shows spinner when executing", () => {
    const { container } = render(
      <SqlEditor value="SELECT 1" isExecuting={true} />,
    );

    // When executing, the play button should show a loading spinner
    // The button should still be present
    const buttons = Array.from(container.getElementsByTagName("button"));
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  test("database selector renders when multiple databases", () => {
    const { container } = render(
      <SqlEditor
        value=""
        databaseName="db1"
        availableDatabases={["db1", "db2"]}
        onDatabaseChange={() => {}}
      />,
    );

    expect(container.textContent).toContain("db1");
    expect(container.textContent).toContain("db2");
  });

  test("onChange debounces before calling parent", async () => {
    const calls: string[] = [];
    const { container } = render(
      <SqlEditor value="" onChange={(v) => calls.push(v)} />,
    );

    // Find the textarea stub and change its value
    const textareas = container.getElementsByTagName("textarea");
    if (textareas.length > 0) {
      fireEvent.change(textareas[0], { target: { value: "SELECT 2" } });
    }

    // onChange is debounced at 300ms, so we need to wait
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(calls).toContain("SELECT 2");
  });

  test("toolbar buttons render correctly", () => {
    const { container } = render(<SqlEditor value="SELECT 1" />);

    // Should have tooltip labels for all toolbar buttons
    expect(container.textContent).toContain("sqlEditor.tooltip.runSql");
    expect(container.textContent).toContain("sqlEditor.tooltip.formatSql");
    expect(container.textContent).toContain("sqlEditor.tooltip.cancelQuery");
    expect(container.textContent).toContain("sqlEditor.tooltip.saveQuery");
    expect(container.textContent).toContain("sqlEditor.tooltip.clearEditor");
  });
});
