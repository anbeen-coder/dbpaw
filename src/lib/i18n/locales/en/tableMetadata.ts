export const tableMetadata = {
  title: "Table Metadata",
  loading: "Loading",
  error: "Error",
  common: {
    yes: "YES",
    no: "NO",
  },
  copy: {
    copy: "Copy",
    copied: "Copied",
    copiedShort: "Copied",
    failed: "Copy failed",
  },
  columns: {
    title: "Columns",
    columnName: "Column Name",
    type: "Type",
    nullable: "Nullable",
    defaultValue: "Default Value",
    keys: "PK/FK",
    description: "Description",
    empty: "No column information",
    pk: "PK",
    fk: "FK",
  },
  specialTypes: {
    title: "Special Types",
    column: "Column",
    category: "Category",
    type: "Type",
    length: "Length",
    memoryUsage: "Memory Usage",
    notes: "Notes",
    unavailable: "N/A",
    categories: {
      bitmap: "Bitmap",
      geo: "Geo",
      hyperloglog: "HyperLogLog",
    },
  },
  clickhouse: {
    title: "ClickHouse",
    engine: "Engine",
    partitionKey: "Partition Key",
    sortingKey: "Sorting Key",
    primaryKeyExpr: "Primary Key Expr",
    samplingKey: "Sampling Key",
    ttl: "TTL",
  },
  cassandra: {
    title: "Cassandra",
    partitionKey: "Partition Key",
    clusteringColumn: "Clustering Column",
    compactionStrategy: "Compaction Strategy",
    bloomFilterFpChance: "Bloom Filter FP Chance",
    gcGraceSeconds: "GC Grace Seconds",
    defaultTimeToLive: "Default TTL",
  },
  indexes: {
    title: "Indexes",
    indexName: "Index Name",
    unique: "Unique",
    type: "Type",
    columns: "Columns",
    empty: "No index information",
  },
  foreignKeys: {
    title: "Foreign Keys",
    fkName: "FK Name",
    localColumn: "Local Column",
    references: "References",
    onUpdate: "On Update",
    onDelete: "On Delete",
    empty: "No foreign key information",
  },
  ddl: {
    title: "Create Table SQL",
    loading: "Loading DDL...",
    empty: "No DDL available",
  },
} as const;

export const routineMetadata = {
  title: "Routine Definition",
  loading: "Loading definition...",
  empty: "No definition available",
  type: {
    procedure: "Procedure",
    function: "Function",
  },
  copy: {
    copy: "Copy",
    copied: "Copied",
    copiedShort: "Copied",
    failed: "Copy failed",
  },
} as const;

export const createTable = {
  tab: {
    title: "New Table ({{database}})",
  },
  form: {
    tableName: "Table Name",
    tableNamePlaceholder: "e.g. users",
    columns: "Columns",
    addColumn: "Add Column",
    noColumns: 'No columns defined. Click "Add Column" to get started.',
    columnName: "Name",
    columnType: "Type",
    columnLength: "Length",
    columnNotNull: "Not Null",
    columnPrimaryKey: "PK",
    columnAutoIncrement: "AI",
    columnDefault: "Default",
    columnComment: "Comment",
    remove: "Remove",
  },
  sqlPreview: {
    title: "SQL Preview",
    copy: "Copy",
    copied: "Copied!",
  },
  actions: {
    execute: "Create Table",
    executing: "Creating...",
    cancel: "Cancel",
  },
  starrocks: {
    distributionTitle: "Distribution",
    distributionType: "Distribution Type",
    distributionHash: "HASH",
    distributionRandom: "RANDOM",
    distributionColumns: "Distribution Key (columns)",
    distributionColumnsPlaceholder: "Select columns for HASH distribution",
    distributionBuckets: "Buckets",
    distributionBucketsPlaceholder: "e.g. 10 or AUTO",
    distributionColumnRequired:
      "HASH distribution requires at least one column",
  },
  validation: {
    tableNameRequired: "Table name is required",
    noColumns: "At least one column is required",
    columnNameRequired: "Column name is required (row {{index}})",
    columnTypeRequired: "Column type is required (row {{index}})",
    duplicateColumnName: "Duplicate column name: {{name}}",
    starrocksHashColumnsRequired:
      "HASH distribution requires at least one distribution column",
    multipleAutoIncrement:
      "Only one AUTO_INCREMENT column is allowed per table",
    varcharNeedsLength:
      'Column "{{name}}" is VARCHAR/CHAR but has no length specified — e.g. VARCHAR(255)',
    varcharZeroLength:
      'Column "{{name}}" has a length of 0, which is not allowed for VARCHAR/CHAR',
    decimalScaleExceedsPrecision:
      'Column "{{name}}" has scale greater than precision — e.g. DECIMAL(2,5) is invalid',
    indexTextColumn:
      'Column "{{col}}" is a TEXT/BLOB type — MySQL requires a prefix length to index it. Use VARCHAR instead or remove it from the index.',
    indexDuplicateColumn:
      'Index "{{index}}" contains duplicate column "{{col}}"',
    autoIncrementNeedsKey:
      'Column "{{name}}" has AUTO_INCREMENT but is not a PRIMARY KEY — AUTO_INCREMENT columns must be a key',
  },
  toast: {
    success: 'Table "{{table}}" created successfully',
    error: "Failed to create table",
  },
} as const;

export const alterTable = {
  tab: {
    title: "Modify Fields: {{table}}",
  },
  form: {
    tableName: "Table Name",
  },
  sqlPreview: {
    noChanges: "— No changes detected —",
  },
  actions: {
    execute: "Apply Changes",
    executing: "Applying...",
  },
  unsupported: {
    title: "Some operations are not supported by this database:",
  },
  toast: {
    loadError: "Failed to load table metadata",
    success: 'Table "{{table}}" updated successfully',
    error: "Failed to apply changes",
  },
} as const;

export const manageIndexes = {
  form: {
    indexes: "Indexes",
    addIndex: "Add Index",
    noIndexes: "No indexes defined.",
    indexName: "Index Name",
    unique: "Unique",
    columns: "Columns",
    method: "Method",
    clustered: "Clustered",
    concurrently: "Concurrently",
  },
  unsupported: {
    message: "Index management is not supported for this database engine.",
  },
} as const;
