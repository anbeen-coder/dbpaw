import { mock } from "bun:test";

mock.module("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

mock.module("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ open, children }: any) =>
    open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: any) => (
    <div role="alertdialog">{children}</div>
  ),
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { SqlRiskConfirmDialog } from "./SqlRiskConfirmDialog";
import type { PendingSqlRiskConfirmation } from "./hooks/useSqlRiskConfirmation";

function pending(): PendingSqlRiskConfirmation {
  return {
    analysis: {
      risk: "write",
      requiresConfirmation: true,
      statementCount: 1,
      reasons: ["write_statement", "missing_where"],
    },
    snapshot: {
      executionId: "q-7-risk",
      tabId: "tab-1",
      target: "selection",
      sql: "UPDATE users SET active = false",
      context: {
        connectionId: 7,
        database: "app",
        schema: "public",
        driver: "postgres",
        contextRevision: 2,
      },
      documentRevision: 4,
      startedAt: 0,
    },
  };
}

describe("SqlRiskConfirmDialog", () => {
  test("shows exact SQL, context, and risk reasons", () => {
    const { container } = render(
      <SqlRiskConfirmDialog
        pending={pending()}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(
      Array.from(container.getElementsByTagName("div")).some(
        (element) => element.getAttribute("role") === "alertdialog",
      ),
    ).toBe(true);
    expect(container.textContent).toContain("UPDATE users SET active = false");
    expect(container.textContent).toContain("sqlEditor.risk.connection");
    expect(container.textContent).toContain(
      "sqlEditor.risk.reason.missing_where",
    );
  });

  test("routes cancel and confirm actions", () => {
    const cancel = mock();
    const confirm = mock();
    const { container } = render(
      <SqlRiskConfirmDialog
        pending={pending()}
        onCancel={cancel}
        onConfirm={confirm}
      />,
    );

    const buttons = Array.from(container.getElementsByTagName("button"));
    const cancelButton = buttons.find(
      (button) => button.textContent === "common.cancel",
    );
    const confirmButton = buttons.find(
      (button) => button.textContent === "sqlEditor.risk.confirm",
    );
    if (!cancelButton || !confirmButton) {
      throw new Error("risk confirmation actions were not rendered");
    }

    fireEvent.click(cancelButton);
    expect(cancel).toHaveBeenCalled();

    fireEvent.click(confirmButton);
    expect(confirm).toHaveBeenCalled();
  });
});
