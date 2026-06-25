export const sqlEditor = {
  database: {
    ariaLabel: "Switch database",
    placeholder: "Select database",
  },
  schema: {
    ariaLabel: "Switch schema",
    placeholder: "Select schema",
  },
  result: {
    failed: "Result: Execution failed.",
    success: "Result: Execution successful.",
    rowsSuffix: " ({{count}} row)",
    rowsSuffixPlural: " ({{count}} rows)",
  },
  tooltip: {
    runSql: "Run SQL (Cmd/Ctrl+Enter)",
    formatSql: "Format SQL (Shift+Alt+F)",
    cancelQuery: "Cancel Query",
    saveQuery: "Save Query (Cmd/Ctrl+S)",
    clearEditor: "Clear Editor",
  },
  export: {
    result: "Export Result",
    runWithSavedConnection:
      "Please run query with a saved connection to export.",
    desktopOnly: "Export dialog is only available in Tauri desktop mode.",
    saveFileTitle: "Save Export File",
    openSaveDialogFailed: "Failed to open save dialog",
    completed: "Export completed ({{count}} rows)",
    failed: "Export failed",
  },
  error: {
    executingQuery: "Error executing query:",
    formatFailed: "Failed to format SQL",
  },
  save: {
    success: "Query saved successfully",
    failed: "Failed to save query",
  },
  untitled: "Untitled",
} as const;

export const saveQueryDialog = {
  title: "Save Query",
  name: "Query Name",
  namePlaceholder: "My Query",
  description: "Description (Optional)",
  descriptionPlaceholder: "What does this query do?",
} as const;
