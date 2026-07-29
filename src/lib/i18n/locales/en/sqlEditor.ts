export const sqlEditor = {
  database: {
    ariaLabel: "Switch database",
    placeholder: "Select database",
  },
  schema: {
    ariaLabel: "Switch schema",
    placeholder: "Select schema",
    completionOnly:
      "Schema selection changes object completion only; it does not change the execution search path.",
  },
  result: {
    failed: "Result: Execution failed.",
    success: "Result: Execution successful.",
    rowsSuffix: " ({{count}} row)",
    rowsSuffixPlural: " ({{count}} rows)",
    closeAria: "Close result {{number}}",
    running: "Query running",
    cancelling: "Cancelling query",
    cancelled: "Query cancelled · {{time}} ms",
    cancelUnavailable: "This driver cannot cancel a running query.",
    cancelFailed: "Failed to cancel query",
    failedWithTime: "Execution failed · {{time}} ms",
    partialError:
      "Completed {{completed}} statement(s), then failed · {{time}} ms",
    rowsReturned: "Returned {{count}} row(s) · {{time}} ms",
    rowsAffected: "Affected {{count}} row(s) · {{time}} ms",
    commandCompleted: "Command completed · {{time}} ms",
    defaultLimitApplied: "Automatically limited to {{count}} rows",
    previousExecution: "Result is from a previous editor revision",
    previousContext: "Result is from {{database}} / {{schema}}",
    errorTab: "Error",
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
    rerunResult: "Rerun and Export",
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
