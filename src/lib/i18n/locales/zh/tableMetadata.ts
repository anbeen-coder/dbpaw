export const tableMetadata = {
  title: "表元数据",
  loading: "加载中",
  error: "错误",
  common: {
    yes: "YES",
    no: "NO",
  },
  copy: {
    copy: "复制",
    copied: "已复制",
    copiedShort: "已复制",
    failed: "复制失败",
  },
  columns: {
    title: "列信息",
    columnName: "列名",
    type: "类型",
    nullable: "可空",
    defaultValue: "默认值",
    keys: "PK/FK",
    description: "描述",
    empty: "暂无列信息",
    pk: "PK",
    fk: "FK",
  },
  specialTypes: {
    title: "复杂类型",
    column: "列",
    category: "类别",
    type: "类型",
    length: "长度",
    memoryUsage: "内存占用",
    notes: "备注",
    unavailable: "暂无",
    categories: {
      bitmap: "Bitmap",
      geo: "Geo",
      hyperloglog: "HyperLogLog",
    },
  },
  clickhouse: {
    title: "ClickHouse",
    engine: "引擎",
    partitionKey: "分区键",
    sortingKey: "排序键",
    primaryKeyExpr: "主键表达式",
    samplingKey: "采样键",
    ttl: "TTL",
  },
  cassandra: {
    title: "Cassandra",
    partitionKey: "分区键",
    clusteringColumn: "聚类列",
    compactionStrategy: "压缩策略",
    bloomFilterFpChance: "布隆过滤器误判率",
    gcGraceSeconds: "GC 宽限期",
    defaultTimeToLive: "默认 TTL",
  },
  indexes: {
    title: "索引",
    indexName: "索引名",
    unique: "唯一",
    type: "类型",
    columns: "列",
    empty: "暂无索引信息",
  },
  foreignKeys: {
    title: "外键",
    fkName: "外键名",
    localColumn: "本地列",
    references: "引用",
    onUpdate: "更新时",
    onDelete: "删除时",
    empty: "暂无外键信息",
  },
  ddl: {
    title: "建表 SQL",
    loading: "正在加载 DDL...",
    empty: "暂无 DDL",
  },
} as const;

export const routineMetadata = {
  title: "Routine 定义",
  loading: "正在加载定义...",
  empty: "暂无定义",
  type: {
    procedure: "存储过程",
    function: "函数",
  },
  copy: {
    copy: "复制",
    copied: "已复制",
    copiedShort: "已复制",
    failed: "复制失败",
  },
} as const;

export const createTable = {
  tab: {
    title: "新建数据表 ({{database}})",
  },
  form: {
    tableName: "数据表名",
    tableNamePlaceholder: "例如 users",
    columns: "列定义",
    addColumn: "添加列",
    noColumns: "暂无列定义，点击「添加列」开始。",
    columnName: "列名",
    columnType: "类型",
    columnLength: "长度",
    columnNotNull: "非空",
    columnPrimaryKey: "主键",
    columnAutoIncrement: "自增",
    columnDefault: "默认值",
    columnComment: "备注",
    remove: "删除",
  },
  sqlPreview: {
    title: "SQL 预览",
    copy: "复制",
    copied: "已复制！",
  },
  actions: {
    execute: "创建数据表",
    executing: "创建中...",
    cancel: "取消",
  },
  starrocks: {
    distributionTitle: "分布方式",
    distributionType: "分布类型",
    distributionHash: "HASH",
    distributionRandom: "RANDOM",
    distributionColumns: "分布键（列）",
    distributionColumnsPlaceholder: "选择用于 HASH 分布的列",
    distributionBuckets: "分桶数",
    distributionBucketsPlaceholder: "例如 10 或 AUTO",
    distributionColumnRequired: "HASH 分布至少需要选择一列",
  },
  validation: {
    tableNameRequired: "请填写数据表名",
    noColumns: "至少需要定义一列",
    columnNameRequired: "第 {{index}} 行列名不能为空",
    columnTypeRequired: "第 {{index}} 行列类型不能为空",
    duplicateColumnName: "列名重复：{{name}}",
    starrocksHashColumnsRequired: "HASH 分布至少需要选择一个分布列",
    multipleAutoIncrement: "每张表只能有一个 AUTO_INCREMENT 列",
    varcharNeedsLength:
      "列「{{name}}」是 VARCHAR/CHAR 类型但未填写长度，例如应填写 VARCHAR(255)",
    varcharZeroLength:
      "列「{{name}}」的长度为 0，VARCHAR/CHAR 不允许长度为 0",
    decimalScaleExceedsPrecision:
      "列「{{name}}」的小数位数超过了精度，例如 DECIMAL(2,5) 是无效的",
    indexTextColumn:
      "列「{{col}}」是 TEXT/BLOB 类型 — MySQL 要求为此类型指定前缀长度才能建索引，请改用 VARCHAR 或将其从索引中移除。",
    indexDuplicateColumn: "索引「{{index}}」中列「{{col}}」重复出现",
    autoIncrementNeedsKey:
      "列「{{name}}」设置了 AUTO_INCREMENT 但不是 PRIMARY KEY — AUTO_INCREMENT 列必须是主键或索引",
  },
  toast: {
    success: "数据表「{{table}}」创建成功",
    error: "创建数据表失败",
  },
} as const;

export const alterTable = {
  tab: {
    title: "修改字段：{{table}}",
  },
  form: {
    tableName: "数据表名",
  },
  sqlPreview: {
    noChanges: "— 未检测到任何变更 —",
  },
  actions: {
    execute: "应用变更",
    executing: "应用中...",
  },
  unsupported: {
    title: "以下操作当前数据库不支持：",
  },
  toast: {
    loadError: "加载表结构失败",
    success: "数据表「{{table}}」修改成功",
    error: "应用变更失败",
  },
} as const;

export const manageIndexes = {
  form: {
    indexes: "索引",
    addIndex: "新增索引",
    noIndexes: "暂无索引。",
    indexName: "索引名称",
    unique: "唯一",
    columns: "列",
    method: "类型",
    clustered: "聚簇",
    concurrently: "并发",
  },
  unsupported: {
    message: "当前数据库引擎不支持索引管理。",
  },
} as const;
