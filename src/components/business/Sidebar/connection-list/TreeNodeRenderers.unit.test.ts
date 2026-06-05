import React from "react";
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { Window } from "happy-dom";
import { TableNodeRenderer, type TreeNodeDeps } from "./TreeNodeRenderers";
import type { Connection, DatabaseInfo, DatasourceTreeAdapter } from "./types";

if (!globalThis.window) {
  const window = new Window();
  globalThis.window = window as unknown as Window & typeof globalThis;
  globalThis.document = window.document as unknown as Document;
  globalThis.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;
  globalThis.Node = window.Node as unknown as typeof Node;
  globalThis.MouseEvent = window.MouseEvent as unknown as typeof MouseEvent;
}

(globalThis.window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError =
  SyntaxError;
globalThis.getComputedStyle = globalThis.window.getComputedStyle.bind(
  globalThis.window,
) as typeof getComputedStyle;
if (!globalThis.DOMRect) {
  globalThis.DOMRect = class DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;

    constructor(
      x = 0,
      y = 0,
      width = 0,
      height = 0,
    ) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.right = x + width;
      this.bottom = y + height;
      this.left = x;
    }

    static fromRect(rect: Partial<DOMRectInit> = {}) {
      return new DOMRect(rect.x, rect.y, rect.width, rect.height);
    }
  } as typeof DOMRect;
}

function noop() {}

const connection: Connection = {
  id: "1",
  name: "Local MySQL",
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "",
  database: "",
  isConnected: true,
  connectState: "success",
  databases: [],
};

const database: DatabaseInfo = {
  name: "app",
  tables: [],
};

const adapter = {
  getItemIcon: () => React.createElement("span", null, "table-icon"),
} as DatasourceTreeAdapter;

function buildDeps(): TreeNodeDeps {
  return {
    connections: [connection],
    expandedTables: new Set(),
    selectedTableKey: null,
    loadingTableKeys: new Set(),
    expandedGroupNodes: new Set(),
    tableNodeRefs: { current: {} },
    getDatasourceTreeAdapter: () => adapter,
    toggleTable: noop,
    toggleGroupNode: noop,
    setLoadingTableKeys: noop as TreeNodeDeps["setLoadingTableKeys"],
    fetchAndSetTableColumns: async () => {},
    handleTableClick: noop,
    renderTableContextMenu: () => null,
    t: ((key: string) => key) as TreeNodeDeps["t"],
  };
}

describe("TableNodeRenderer", () => {
  test("stops table context menu events before they reach the connection tree container", async () => {
    let parentContextMenuCount = 0;
    const { getByText } = render(
      React.createElement(
        "div",
        {
          onContextMenu: () => {
            parentContextMenuCount += 1;
          },
        },
        React.createElement(TableNodeRenderer, {
          table: {
            schema: "app",
            name: "users",
            type: "table",
            columns: [],
          },
          tableLevel: 2,
          database,
          connection,
          deps: buildDeps(),
        }),
      ),
    );

    await act(async () => {
      fireEvent.contextMenu(getByText("users"));
    });

    expect(parentContextMenuCount).toBe(0);
  });
});
