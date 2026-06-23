export const app = {
  window: {
    openSettings: "打开设置",
    settingsTooltip: "设置 (Cmd/Ctrl+,)",
    hideAiPanel: "隐藏 AI 面板 (Cmd/Ctrl+\\)",
    showAiPanel: "显示 AI 面板 (Cmd/Ctrl+\\)",
    hideAiPanelAria: "隐藏 AI 面板",
    showAiPanelAria: "显示 AI 面板",
  },
  empty: {
    hint: "请从侧边栏选择数据表或新建查询",
  },
  tab: {
    unsavedChanges: "未保存更改",
    closeAria: "关闭 {{title}}",
    closeTab: "关闭标签页",
    closeOtherTabs: "关闭其他标签页",
    queryTitle: "查询（{{database}}）",
    defaultDatabase: "默认",
    ddlTitle: "DDL: {{table}}",
  },
  dialog: {
    unsavedTitle: "未保存更改",
    unsavedDescription: "当前 SQL 标签页有未保存内容，关闭前是否保存？",
    dontSave: "不保存",
  },
  error: {
    selectConnectionFirst: "请先选择连接",
    loadSchemaOverview: "加载 Schema 概览失败",
    loadTableData: "加载表数据失败",
    exportFailed: "导出失败",
    refreshTable: "刷新表失败",
    changePage: "分页切换失败",
    changePageSize: "每页条数切换失败",
    sortTable: "表排序失败",
    filterTable: "表过滤失败",
    saveQuery: "保存查询失败",
  },
  success: {
    exportCompleted: "导出完成（{{count}} 行）",
  },
} as const;
