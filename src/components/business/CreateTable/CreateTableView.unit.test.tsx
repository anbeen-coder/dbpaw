import { mock } from "bun:test";

const mockT = (s: string) => s;

mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

mock.module("sonner", () => ({
  toast: { success: () => {}, error: () => {} },
}));

mock.module("@/services/api", () => ({
  api: { query: { execute: () => Promise.resolve() } },
}));

mock.module("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, ...rest }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  ),
}));

mock.module("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, className, ...rest }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  ),
}));

mock.module("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

mock.module("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-select-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <div data-item-value={value}>{children}</div>
  ),
  SelectValue: () => <span />,
}));

mock.module("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, open }: any) => (
    <div data-open={open}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: any) => (
    <div>{children}</div>
  ),
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
}));

mock.module("./IndexEditorSection", () => ({
  IndexEditorSection: ({ defs, onAdd }: any) => (
    <div data-testid="index-editor">
      <span>index-editor-mock</span>
      <span>index-count:{defs.length}</span>
      <button onClick={onAdd}>add-index</button>
    </div>
  ),
}));

mock.module("@/lib/sql-gen/createTable", () => ({
  TYPE_PRESETS: {
    postgres: ["BIGINT", "BOOLEAN", "TEXT", "INTEGER", "VARCHAR"],
    mysql: ["BIGINT", "TINYINT", "TEXT", "INT", "VARCHAR"],
  },
  generateCreateTableSQL: () => "CREATE TABLE test_table ();",
  supportsAutoIncrement: (driver: string) =>
    driver === "mysql" || driver === "mariadb",
}));

mock.module("@/lib/sql-gen/manageIndexes", () => ({
  generateManageIndexSQL: () => ({ sql: "", statements: [] }),
  newIndexId: () => "idx-test-1",
  supportsIndexManagement: () => true,
}));

mock.module("@/lib/sql-gen/ddlUtils", () => ({
  CUSTOM_TYPE_SENTINEL: "__custom__",
  columnGridTemplate: () => "20px 1fr 1fr 80px 60px 60px 100px 100px 64px",
  splitSqlStatements: (sql: string) => [sql],
}));

mock.module("@/lib/sql-gen/tableValidation", () => ({
  validateColumns: () => [],
  validateIndexDefs: () => [],
}));

mock.module("@/lib/errors", () => ({
  errorMessage: (e: unknown) => String(e),
}));

import { describe, test, expect } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { CreateTableView } from "./CreateTableView";

function getInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.getElementsByTagName("input")).filter(
    (i) => i.type !== "checkbox",
  );
}

function getButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.getElementsByTagName("button"));
}

const defaultProps = {
  connectionId: 1,
  database: "testdb",
  schema: "public",
  driver: "postgres",
  onSuccess: () => {},
  onCancel: () => {},
};

describe("CreateTableView", () => {
  describe("page contract", () => {
    test("renders table name input with correct placeholder", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const input = getInputs(container).find(
        (i) => i.placeholder === "createTable.form.tableNamePlaceholder",
      );
      expect(input).toBeDefined();
    });

    test("renders column section header", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("createTable.form.columns");
    });

    test("renders add column button", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("createTable.form.addColumn");
    });

    test("renders one default empty column row", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const nameInput = getInputs(container).find(
        (i) => i.placeholder === "createTable.form.columnName",
      );
      expect(nameInput).toBeDefined();
    });

    test("renders SQL preview section", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("createTable.sqlPreview.title");
    });

    test("renders cancel and execute buttons", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("createTable.actions.cancel");
      expect(container.textContent).toContain("createTable.actions.execute");
    });

    test("renders database name in action bar", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("testdb");
    });

    test("renders schema prefix when schema is provided", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("public.");
    });

    test("renders column grid headers", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain(
        "createTable.form.columnNotNull",
      );
      expect(container.textContent).toContain(
        "createTable.form.columnPrimaryKey",
      );
      expect(container.textContent).toContain(
        "createTable.form.columnDefault",
      );
      expect(container.textContent).toContain(
        "createTable.form.columnComment",
      );
    });
  });

  describe("add column", () => {
    test("clicking add column increases column count", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const addBtn = getButtons(container).find((b) =>
        b.textContent?.includes("createTable.form.addColumn"),
      );
      expect(addBtn).toBeDefined();

      fireEvent.click(addBtn!);

      const nameInputs = getInputs(container).filter(
        (i) => i.placeholder === "createTable.form.columnName",
      );
      expect(nameInputs.length).toBe(2);
    });

    test("adding multiple columns creates correct number of rows", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const addBtn = getButtons(container).find((b) =>
        b.textContent?.includes("createTable.form.addColumn"),
      )!;

      fireEvent.click(addBtn);
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);

      const nameInputs = getInputs(container).filter(
        (i) => i.placeholder === "createTable.form.columnName",
      );
      expect(nameInputs.length).toBe(4);
    });
  });

  describe("delete column", () => {
    test("clicking delete button removes a column", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const addBtn = getButtons(container).find((b) =>
        b.textContent?.includes("createTable.form.addColumn"),
      )!;
      fireEvent.click(addBtn);

      const nameInputsBefore = getInputs(container).filter(
        (i) => i.placeholder === "createTable.form.columnName",
      );
      expect(nameInputsBefore.length).toBe(2);

      const trashButtons = getButtons(container).filter(
        (b) => b.title === "createTable.form.remove" && !b.innerHTML.includes("rotate-180"),
      );
      expect(trashButtons.length).toBeGreaterThanOrEqual(2);
      fireEvent.click(trashButtons[0]);

      const nameInputsAfter = getInputs(container).filter(
        (i) => i.placeholder === "createTable.form.columnName",
      );
      expect(nameInputsAfter.length).toBe(1);
    });
  });

  describe("move column", () => {
    test("first column's move-up button is disabled", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const moveUpButtons = getButtons(container).filter(
        (b) => b.title === "Move up",
      );

      expect(moveUpButtons.length).toBeGreaterThanOrEqual(1);
      expect(moveUpButtons[0].disabled).toBe(true);
    });

    test("last column's move-down button is disabled", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const moveDownButtons = getButtons(container).filter(
        (b) =>
          b.title === "createTable.form.remove" &&
          b.innerHTML.includes("rotate-180"),
      );

      expect(moveDownButtons.length).toBeGreaterThanOrEqual(1);
      expect(moveDownButtons[moveDownButtons.length - 1].disabled).toBe(true);
    });

    test("move-up enables after adding a second column", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const addBtn = getButtons(container).find((b) =>
        b.textContent?.includes("createTable.form.addColumn"),
      )!;
      fireEvent.click(addBtn);

      const moveUpButtons = getButtons(container).filter(
        (b) => b.title === "Move up",
      );

      expect(moveUpButtons[0].disabled).toBe(true);
      expect(moveUpButtons[1].disabled).toBe(false);
    });
  });

  describe("index section", () => {
    test("renders index editor section", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("index-editor-mock");
    });

    test("starts with zero indexes", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("index-count:0");
    });
  });

  describe("copy SQL", () => {
    test("copy button exists in SQL preview", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).toContain("createTable.sqlPreview.copy");
    });
  });

  describe("execute button", () => {
    test("execute button exists and is clickable", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      const executeBtn = getButtons(container).find((b) =>
        b.textContent?.includes("createTable.actions.execute"),
      );

      expect(executeBtn).toBeDefined();
      expect(executeBtn!.disabled).toBe(false);
      fireEvent.click(executeBtn!);
    });

    test("cancel button calls onCancel", () => {
      let cancelled = false;
      const { container } = render(
        <CreateTableView
          {...defaultProps}
          onCancel={() => {
            cancelled = true;
          }}
        />,
      );
      const cancelBtn = getButtons(container).find((b) =>
        b.textContent?.includes("createTable.actions.cancel"),
      );

      expect(cancelBtn).toBeDefined();
      fireEvent.click(cancelBtn!);
      expect(cancelled).toBe(true);
    });
  });

  describe("MySQL driver", () => {
    test("shows auto-increment column for mysql", () => {
      const { container } = render(
        <CreateTableView {...defaultProps} driver="mysql" />,
      );
      expect(container.textContent).toContain(
        "createTable.form.columnAutoIncrement",
      );
    });

    test("hides auto-increment column for postgres", () => {
      const { container } = render(<CreateTableView {...defaultProps} />);
      expect(container.textContent).not.toContain(
        "createTable.form.columnAutoIncrement",
      );
    });
  });
});
