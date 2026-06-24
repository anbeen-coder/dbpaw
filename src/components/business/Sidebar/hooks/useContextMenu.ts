import { useState, useMemo } from "react";
import type { Connection } from "../connection-list/types";

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  connectionId: string | null;
  databaseName?: string | null;
  schemaName?: string | null;
  type: "connection" | "database" | "schema";
}

export function useContextMenu(connections: Connection[]) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    connectionId: null,
    type: "connection",
  });

  const contextMenuConnection = useMemo(
    () =>
      contextMenu.connectionId
        ? connections.find((conn) => conn.id === contextMenu.connectionId)
        : null,
    [connections, contextMenu.connectionId],
  );

  return {
    contextMenu,
    setContextMenu,
    contextMenuConnection,
  };
}
