import {
  FileSearch,
  Database,
  Plus,
  RefreshCw,
  FolderOpen,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import type { TreeConfig, TreeMenuItem, DatabaseContext, LeafContext } from "./types";

export function createElasticsearchTreeConfig(
  callbacks: {
    onCreateIndex?: (ctx: DatabaseContext) => void;
    onOpenIndex?: (ctx: LeafContext) => void;
    onIndexAction?: (
      ctx: LeafContext,
      action: "refresh" | "open" | "close" | "delete",
    ) => void;
  },
): TreeConfig {
  return {
    supportsSavedQueries: false,
    databaseExpandable: true,
    supportsSchemaNode: false,
    leafNodeType: "index",
    leafNodeIcon: () => <FileSearch className="w-4 h-4" />,
    databaseNodeIcon: () => <Database className="w-4 h-4" />,
    virtualDatabases: ["Indices"],

    getDatabaseActions: (ctx) => {
      if (!callbacks.onCreateIndex) return undefined;
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <button
            className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            title="New index"
            onClick={() => callbacks.onCreateIndex!(ctx)}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      );
    },

    onLeafActivate: callbacks.onOpenIndex
      ? (ctx) => callbacks.onOpenIndex!(ctx)
      : undefined,

    getDatabaseContextMenuItems: (ctx) => {
      const items: TreeMenuItem[] = [];

      if (callbacks.onCreateIndex) {
        items.push({
          key: "new-index",
          label: "New index",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => callbacks.onCreateIndex!(ctx),
        });
      }

      return items;
    },

    getLeafContextMenuItems: (ctx) => {
      const items: TreeMenuItem[] = [];

      if (callbacks.onIndexAction) {
        items.push({
          key: "refresh",
          label: "Refresh index",
          icon: <RefreshCw className="mr-2 h-4 w-4" />,
          onClick: () => callbacks.onIndexAction!(ctx, "refresh"),
        });

        items.push({
          key: "open",
          label: "Open index",
          icon: <FolderOpen className="mr-2 h-4 w-4" />,
          onClick: () => callbacks.onIndexAction!(ctx, "open"),
        });

        items.push({
          key: "close",
          label: "Close index",
          icon: <TableIcon className="mr-2 h-4 w-4" />,
          onClick: () => callbacks.onIndexAction!(ctx, "close"),
        });

        items.push({
          key: "delete",
          label: "Delete index",
          icon: <Trash2 className="mr-2 h-4 w-4" />,
          destructive: true,
          onClick: () => callbacks.onIndexAction!(ctx, "delete"),
        });
      }

      return items;
    },
  };
}
