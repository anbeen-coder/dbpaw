export const app = {
  window: {
    openSettings: "Open settings",
    settingsTooltip: "Settings (Cmd/Ctrl+,)",
    hideAiPanel: "Hide AI Panel (Cmd/Ctrl+\\)",
    showAiPanel: "Show AI Panel (Cmd/Ctrl+\\)",
    hideAiPanelAria: "Hide AI panel",
    showAiPanelAria: "Show AI panel",
  },
  empty: {
    hint: "Select a table or create a new query from the sidebar",
  },
  tab: {
    unsavedChanges: "Unsaved changes",
    closeAria: "Close {{title}}",
    closeTab: "Close Tab",
    closeOtherTabs: "Close Other Tabs",
    queryTitle: "Query ({{database}})",
    defaultDatabase: "Default",
    ddlTitle: "DDL: {{table}}",
  },
  dialog: {
    unsavedTitle: "Unsaved changes",
    unsavedDescription:
      "This SQL tab has unsaved changes. Do you want to save before closing?",
    dontSave: "Don't Save",
  },
  error: {
    selectConnectionFirst: "Please select a connection first",
    loadSchemaOverview: "Failed to load schema overview",
    loadTableData: "Failed to load table data",
    exportFailed: "Export failed",
    refreshTable: "Failed to refresh table",
    changePage: "Failed to change page",
    changePageSize: "Failed to change page size",
    sortTable: "Failed to sort table",
    filterTable: "Failed to filter table",
    saveQuery: "Failed to save query",
  },
  success: {
    exportCompleted: "Export completed ({{count}} rows)",
  },
} as const;
