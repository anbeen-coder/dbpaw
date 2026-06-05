import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Edit3,
  Copy,
  RefreshCw,
  FileCode,
  Plus,
  Trash2,
  Upload,
  Download,
  Table2 as TableIcon,
} from "lucide-react";
import { getImportDriverCapability } from "@/services/api";
import type { Driver } from "@/services/api";
import type {
  Connection,
  DatabaseInfo,
  DatasourceTreeAdapter,
} from "./types";

export function getInlineContextMenuViewportOffset(
  rect: Pick<DOMRect, "top" | "bottom">,
  viewportHeight: number,
  padding = 8,
) {
  let offset = 0;
  const bottomOverflow = rect.bottom - (viewportHeight - padding);
  if (bottomOverflow > 0) {
    offset -= bottomOverflow;
  }

  const topOverflow = padding - (rect.top + offset);
  if (topOverflow > 0) {
    offset += topOverflow;
  }

  return offset;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  connectionId: string | null;
  databaseName?: string | null;
  schemaName?: string | null;
  type: "connection" | "database" | "schema";
}

interface InlineContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  connections: Connection[];
  contextMenuConnection: Connection | null | undefined;
  contextMenuDatabaseAdapter: DatasourceTreeAdapter | null;
  onEdit: (connectionId: string) => void;
  onDuplicate: (connectionId: string) => void;
  onReconnect: (connectionId: string) => void;
  onCreateQuery: (
    connectionId: string | null | undefined,
    databaseName?: string | null,
  ) => void;
  onCreateDatabase: (connectionId: string) => void;
  onDelete: (connectionId: string | null) => void;
  supportsCreateDatabaseForDriver: (driver: Driver) => boolean;
  onRefreshDatabaseTables: (
    connectionId: string,
    databaseName: string,
  ) => void;
  onDatabaseImport: (connectionId: string, databaseName: string) => void;
  onDatabaseExport: (connection: Connection, database: DatabaseInfo) => void;
  onCreateTable?: (
    connectionId: number,
    database: string,
    schema: string,
    driver: string,
  ) => void;
}

export function InlineContextMenu({
  contextMenu,
  onClose,
  connections,
  contextMenuConnection,
  contextMenuDatabaseAdapter,
  onEdit,
  onDuplicate,
  onReconnect,
  onCreateQuery,
  onCreateDatabase,
  onDelete,
  supportsCreateDatabaseForDriver,
  onRefreshDatabaseTables,
  onDatabaseImport,
  onDatabaseExport,
  onCreateTable,
}: InlineContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [viewportOffset, setViewportOffset] = useState(0);

  useLayoutEffect(() => {
    if (!contextMenu.visible) {
      setViewportOffset(0);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const node = menuRef.current;
      if (!node || typeof window === "undefined") return;
      setViewportOffset(
        getInlineContextMenuViewportOffset(
          node.getBoundingClientRect(),
          window.innerHeight,
          8,
        ),
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [contextMenu.visible, contextMenu.x, contextMenu.y, contextMenu.type]);

  if (!contextMenu.visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[140px] bg-popover border border-border rounded-md shadow-lg py-1"
      style={{
        left: contextMenu.x,
        top: contextMenu.y,
        maxHeight: "calc(100vh - 16px)",
        overflowY: "auto",
        marginTop: viewportOffset === 0 ? undefined : viewportOffset,
      }}
    >
      {contextMenu.type === "connection" ? (
        <>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={() => {
              if (contextMenu.connectionId) {
                onEdit(contextMenu.connectionId);
              }
              onClose();
            }}
          >
            <Edit3 className="w-4 h-4" />
            {t("connection.menu.edit")}
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={async () => {
              if (contextMenu.connectionId) {
                await onDuplicate(contextMenu.connectionId);
              }
              onClose();
            }}
          >
            <Copy className="w-4 h-4" />
            {t("connection.menu.copy")}
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={async () => {
              if (contextMenu.connectionId) {
                await onReconnect(contextMenu.connectionId);
              }
              onClose();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            {t("connection.menu.refresh")}
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={() => {
              onCreateQuery(contextMenu.connectionId);
              onClose();
            }}
          >
            <FileCode className="w-4 h-4" />
            {t("connection.menu.newQuery")}
          </button>
          {contextMenuConnection &&
          supportsCreateDatabaseForDriver(contextMenuConnection.type) ? (
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => {
                onCreateDatabase(contextMenuConnection.id);
                onClose();
              }}
            >
              <Plus className="w-4 h-4" />
              {t("connection.menu.newDatabase")}
            </button>
          ) : null}
          <div className="h-px bg-border my-1" />
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent text-destructive flex items-center gap-2"
            onClick={() => {
              if (contextMenu.connectionId) {
                onDelete(contextMenu.connectionId);
              }
              onClose();
            }}
          >
            <Trash2 className="w-4 h-4" />
            {t("connection.menu.delete")}
          </button>
        </>
      ) : contextMenu.type === "database" ? (
        <>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={async () => {
              if (contextMenu.connectionId && contextMenu.databaseName) {
                await onRefreshDatabaseTables(
                  contextMenu.connectionId,
                  contextMenu.databaseName,
                );
              }
              onClose();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            {t("connection.menu.refreshTables")}
          </button>
          {contextMenuDatabaseAdapter?.renderDatabaseContextMenu &&
          contextMenu.databaseName ? (
            contextMenuDatabaseAdapter.renderDatabaseContextMenu(
              contextMenu.databaseName,
            )
          ) : (
            <>
              {contextMenu.connectionId &&
              contextMenu.databaseName &&
              contextMenuConnection &&
              getImportDriverCapability(
                contextMenuConnection.type,
              ) !== "unsupported" ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={
                    getImportDriverCapability(
                      contextMenuConnection.type,
                    ) === "read_only_not_supported"
                  }
                  onClick={async () => {
                    await onDatabaseImport(
                      contextMenu.connectionId!,
                      contextMenu.databaseName!,
                    );
                    onClose();
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {getImportDriverCapability(
                    contextMenuConnection.type,
                  ) === "read_only_not_supported"
                    ? t("connection.menu.importSqlReadOnly")
                    : t("connection.menu.importSql")}
                </button>
              ) : null}
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={async () => {
                  if (
                    contextMenu.connectionId &&
                    contextMenu.databaseName
                  ) {
                    const connection = connections.find(
                      (conn) => conn.id === contextMenu.connectionId,
                    );
                    const database = connection?.databases.find(
                      (db) => db.name === contextMenu.databaseName,
                    );
                    if (connection && database) {
                      await onDatabaseExport(connection, database);
                    }
                  }
                  onClose();
                }}
              >
                <Download className="w-4 h-4" />
                {t("connection.menu.exportDatabaseSql")}
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={() => {
                  onCreateQuery(
                    contextMenu.connectionId,
                    contextMenu.databaseName,
                  );
                  onClose();
                }}
              >
                <FileCode className="w-4 h-4" />
                {t("connection.menu.newQuery")}
              </button>
              {contextMenu.connectionId &&
              contextMenu.databaseName &&
              contextMenuConnection &&
              onCreateTable ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => {
                    onCreateTable(
                      Number(contextMenu.connectionId),
                      contextMenu.databaseName!,
                      "",
                      contextMenuConnection.type,
                    );
                    onClose();
                  }}
                >
                  <TableIcon className="w-4 h-4" />
                  {t("connection.menu.newTable")}
                </button>
              ) : null}
            </>
          )}
        </>
      ) : contextMenu.type === "schema" ? (
        <>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={async () => {
              if (contextMenu.connectionId && contextMenu.databaseName) {
                await onRefreshDatabaseTables(
                  contextMenu.connectionId,
                  contextMenu.databaseName,
                );
              }
              onClose();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            {t("connection.menu.refreshTables")}
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
            onClick={() => {
              onCreateQuery(
                contextMenu.connectionId,
                contextMenu.databaseName,
              );
              onClose();
            }}
          >
            <FileCode className="w-4 h-4" />
            {t("connection.menu.newQuery")}
          </button>
          {contextMenu.connectionId &&
          contextMenu.databaseName &&
          contextMenuConnection &&
          onCreateTable ? (
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => {
                onCreateTable(
                  Number(contextMenu.connectionId),
                  contextMenu.databaseName!,
                  contextMenu.schemaName ?? "",
                  contextMenuConnection.type,
                );
                onClose();
              }}
            >
              <TableIcon className="w-4 h-4" />
              {t("connection.menu.newTable")}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
