export const elasticsearch = {
  fields: {
    title: "字段",
    search: "搜索字段...",
    noFields: "未找到字段",
  },
  documents: {
    title: "文档",
    page: "页",
    of: "/",
    hits: "条结果",
    limit: "每页",
    sort: "排序",
    noDocuments: "暂无文档",
    showing: "显示 {{from}}-{{to}} / 共 {{total}} 条",
  },
  detail: {
    document: "文档",
    mapping: "映射",
    aggregations: "聚合",
    console: "控制台",
    documentId: "文档 ID",
    open: "打开",
    new: "新建",
    save: "保存",
    delete: "删除",
    copy: "复制",
    send: "发送",
    noAggregations: "暂无聚合结果",
    autoGenerateId: "留空则自动生成 ID",
  },
  actions: {
    refresh: "刷新",
    import: "导入 NDJSON",
    export: "导出 NDJSON",
    openIndex: "打开索引",
    closeIndex: "关闭索引",
    deleteIndex: "删除索引",
    moreActions: "更多操作",
  },
  search: {
    placeholder: "query_string，例如 status:200 AND user:kimchy",
    dslPlaceholder: '可选 JSON DSL，例如 {"query":{"match_all":{}}}',
    search: "搜索",
  },
  console: {
    method: "方法",
    path: "路径",
    body: "请求体",
    response: "响应",
    placeholder: "可选 JSON 请求体",
  },
} as const;

export const erDiagram = {
  title: "ER 图",
  noForeignKeys: "未找到外键关系",
  loading: "加载 ER 图中...",
} as const;
