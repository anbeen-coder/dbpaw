export const sqlEditor = {
  database: {
    ariaLabel: "切换数据库",
    placeholder: "选择数据库",
  },
  schema: {
    ariaLabel: "切换 Schema",
    placeholder: "选择 Schema",
  },
  result: {
    failed: "结果：执行失败。",
    success: "结果：执行成功。",
    rowsSuffix: "（{{count}} 行）",
    rowsSuffixPlural: "（{{count}} 行）",
  },
  tooltip: {
    runSql: "执行 SQL（Cmd/Ctrl+Enter）",
    formatSql: "格式化 SQL（Shift+Alt+F）",
    cancelQuery: "取消查询",
    saveQuery: "保存查询（Cmd/Ctrl+S）",
    clearEditor: "清空编辑器",
  },
  export: {
    result: "导出结果",
    runWithSavedConnection: "请在已保存连接下执行查询后再导出。",
    desktopOnly: "导出对话框仅在 Tauri 桌面模式可用。",
    saveFileTitle: "保存导出文件",
    openSaveDialogFailed: "打开保存对话框失败",
    completed: "导出完成（{{count}} 行）",
    failed: "导出失败",
  },
  error: {
    executingQuery: "执行查询出错：",
    formatFailed: "格式化 SQL 失败",
  },
  save: {
    success: "查询保存成功",
    failed: "保存查询失败",
  },
  untitled: "未命名",
} as const;

export const saveQueryDialog = {
  title: "保存查询",
  name: "查询名称",
  namePlaceholder: "我的查询",
  description: "描述（可选）",
  descriptionPlaceholder: "这个查询用于做什么？",
} as const;
