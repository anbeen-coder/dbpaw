export type ImportDriverCapability =
  | "supported"
  | "read_only_not_supported"
  | "unsupported";

const DRIVER_IDS = [
  "postgres",
  "mysql",
  "mariadb",
  "tidb",
  "starrocks",
  "doris",
  "sqlite",
  "duckdb",
  "clickhouse",
  "mssql",
  "oracle",
  "db2",
  "redis",
  "elasticsearch",
  "mongodb",
  "cassandra",
] as const;

export type Driver = (typeof DRIVER_IDS)[number];
export type DriverKind = "sql" | "kv" | "document" | "search" | "widecolumn";

export interface DriverMetadata {
  id: Driver;
  label: string;
  kind: DriverKind;
  defaultPort: number | null;
  isFileBased: boolean;
  isMysqlFamily: boolean;
  isDatabaseScoped: boolean;
  defaultSchema: string;
  unqualifiedSchemas: string[];
  identifierQuote: "double" | "backtick" | "bracket";
  supportsSSLCA: boolean;
  supportsSchemaBrowsing: boolean;
  supportsCreateDatabase: boolean;
  importCapability: ImportDriverCapability;
}

export const DRIVER_METADATA: DriverMetadata[] = [
  {
    id: "postgres",
    label: "PostgreSQL",
    kind: "sql",
    defaultPort: 5432,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "public",
    unqualifiedSchemas: [],
    identifierQuote: "double",
    supportsSSLCA: true,
    supportsSchemaBrowsing: true,
    supportsCreateDatabase: true,
    importCapability: "supported",
  },
  {
    id: "mysql",
    label: "MySQL",
    kind: "sql",
    defaultPort: 3306,
    isFileBased: false,
    isMysqlFamily: true,
    isDatabaseScoped: true,
    defaultSchema: "",
    unqualifiedSchemas: [],
    identifierQuote: "backtick",
    supportsSSLCA: true,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: true,
    importCapability: "supported",
  },
  {
    id: "mariadb",
    label: "MariaDB",
    kind: "sql",
    defaultPort: 3306,
    isFileBased: false,
    isMysqlFamily: true,
    isDatabaseScoped: true,
    defaultSchema: "",
    unqualifiedSchemas: [],
    identifierQuote: "backtick",
    supportsSSLCA: true,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: true,
    importCapability: "supported",
  },
  {
    id: "tidb",
    label: "TiDB",
    kind: "sql",
    defaultPort: 4000,
    isFileBased: false,
    isMysqlFamily: true,
    isDatabaseScoped: true,
    defaultSchema: "",
    unqualifiedSchemas: [],
    identifierQuote: "backtick",
    supportsSSLCA: true,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: true,
    importCapability: "supported",
  },
  {
    id: "starrocks",
    label: "StarRocks",
    kind: "sql",
    defaultPort: 9030,
    isFileBased: false,
    isMysqlFamily: true,
    isDatabaseScoped: true,
    defaultSchema: "",
    unqualifiedSchemas: [],
    identifierQuote: "backtick",
    supportsSSLCA: true,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: true,
    importCapability: "unsupported",
  },
  {
    id: "doris",
    label: "Apache Doris",
    kind: "sql",
    defaultPort: 9030,
    isFileBased: false,
    isMysqlFamily: true,
    isDatabaseScoped: true,
    defaultSchema: "",
    unqualifiedSchemas: [],
    identifierQuote: "backtick",
    supportsSSLCA: true,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: true,
    importCapability: "unsupported",
  },
  {
    id: "sqlite",
    label: "SQLite",
    kind: "sql",
    defaultPort: null,
    isFileBased: true,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "main",
    unqualifiedSchemas: ["", "main", "public"],
    identifierQuote: "double",
    supportsSSLCA: false,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: false,
    importCapability: "supported",
  },
  {
    id: "duckdb",
    label: "DuckDB",
    kind: "sql",
    defaultPort: null,
    isFileBased: true,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "main",
    unqualifiedSchemas: ["", "main", "public"],
    identifierQuote: "double",
    supportsSSLCA: false,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: false,
    importCapability: "supported",
  },
  {
    id: "clickhouse",
    label: "ClickHouse",
    kind: "sql",
    defaultPort: 8123,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: true,
    defaultSchema: "",
    unqualifiedSchemas: [],
    identifierQuote: "backtick",
    supportsSSLCA: false,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: true,
    importCapability: "read_only_not_supported",
  },
  {
    id: "mssql",
    label: "SQL Server",
    kind: "sql",
    defaultPort: 1433,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "dbo",
    unqualifiedSchemas: [],
    identifierQuote: "bracket",
    supportsSSLCA: false,
    supportsSchemaBrowsing: true,
    supportsCreateDatabase: true,
    importCapability: "supported",
  },
  {
    id: "oracle",
    label: "Oracle",
    kind: "sql",
    defaultPort: 1521,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "public",
    unqualifiedSchemas: [],
    identifierQuote: "double",
    supportsSSLCA: false,
    supportsSchemaBrowsing: true,
    supportsCreateDatabase: false,
    importCapability: "supported",
  },
  {
    id: "db2",
    label: "IBM Db2",
    kind: "sql",
    defaultPort: 50000,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "public",
    unqualifiedSchemas: [],
    identifierQuote: "double",
    supportsSSLCA: false,
    supportsSchemaBrowsing: true,
    supportsCreateDatabase: false,
    importCapability: "supported",
  },
  {
    id: "redis",
    label: "Redis",
    kind: "kv",
    defaultPort: 6379,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "public",
    unqualifiedSchemas: [],
    identifierQuote: "double",
    supportsSSLCA: false,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: false,
    importCapability: "unsupported",
  },
  {
    id: "elasticsearch",
    label: "Elasticsearch",
    kind: "search",
    defaultPort: 9200,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "public",
    unqualifiedSchemas: [],
    identifierQuote: "double",
    supportsSSLCA: true,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: false,
    importCapability: "unsupported",
  },
  {
    id: "mongodb",
    label: "MongoDB",
    kind: "document",
    defaultPort: 27017,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "public",
    unqualifiedSchemas: [],
    identifierQuote: "double",
    supportsSSLCA: false,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: false,
    importCapability: "unsupported",
  },
  {
    id: "cassandra",
    label: "Cassandra",
    kind: "widecolumn",
    defaultPort: 9042,
    isFileBased: false,
    isMysqlFamily: false,
    isDatabaseScoped: false,
    defaultSchema: "public",
    unqualifiedSchemas: [],
    identifierQuote: "double",
    supportsSSLCA: false,
    supportsSchemaBrowsing: false,
    supportsCreateDatabase: true,
    importCapability: "unsupported",
  },
];

export const getDriverConfig = (driver: Driver): DriverMetadata =>
  DRIVER_METADATA.find((d) => d.id === driver)!;

export const getDefaultPort = (driver: Driver): number | null =>
  getDriverConfig(driver).defaultPort;

export const isFileBasedDriver = (driver: Driver): boolean =>
  getDriverConfig(driver).isFileBased;

export const isMysqlFamilyDriver = (driver: Driver): boolean =>
  getDriverConfig(driver).isMysqlFamily;

export const isRegisteredDriver = (
  driver: string | undefined,
): driver is Driver => DRIVER_METADATA.some((config) => config.id === driver);

export const isDatabaseScopedDriver = (
  driver: Driver | string | undefined,
): boolean =>
  isRegisteredDriver(driver) ? getDriverConfig(driver).isDatabaseScoped : false;

export const getDefaultSchema = (
  driver: Driver | string | undefined,
): string =>
  isRegisteredDriver(driver) ? getDriverConfig(driver).defaultSchema : "public";

export const resolveTableScope = (
  driver: Driver | string | undefined,
  database?: string,
  schemaOverride?: string,
): { schema: string; dbParam: string | undefined } => {
  if (isDatabaseScopedDriver(driver)) {
    return { schema: database || "", dbParam: undefined };
  }

  const schema = schemaOverride?.trim() || getDefaultSchema(driver);
  return { schema, dbParam: database };
};

export const quoteIdentifierForDriver = (
  driver: Driver | string | undefined,
  name: string,
): string => {
  const quoteStyle = isRegisteredDriver(driver)
    ? getDriverConfig(driver).identifierQuote
    : "double";

  if (quoteStyle === "backtick") {
    return `\`${name}\``;
  }
  if (quoteStyle === "bracket") {
    return `[${name.replace(/]/g, "]]")}]`;
  }
  return `"${name}"`;
};

export const shouldQualifyTableSchema = (
  driver: Driver | string | undefined,
  schema: string,
): boolean => {
  if (isDatabaseScopedDriver(driver)) {
    return false;
  }

  const unqualifiedSchemas = isRegisteredDriver(driver)
    ? getDriverConfig(driver).unqualifiedSchemas
    : [];
  return !unqualifiedSchemas.includes(schema.trim().toLowerCase());
};

export const getQualifiedTableName = (
  driver: Driver | string | undefined,
  schema: string,
  table: string,
): string => {
  if (!shouldQualifyTableSchema(driver, schema)) {
    return quoteIdentifierForDriver(driver, table);
  }
  return `${quoteIdentifierForDriver(driver, schema)}.${quoteIdentifierForDriver(
    driver,
    table,
  )}`;
};

export const supportsSSLCA = (driver: Driver): boolean =>
  getDriverConfig(driver).supportsSSLCA;

export const supportsCreateDatabase = (driver: Driver): boolean =>
  getDriverConfig(driver).supportsCreateDatabase;

export const supportsSchemaBrowsing = (driver: Driver): boolean =>
  getDriverConfig(driver).supportsSchemaBrowsing;

export const getDriverKind = (driver: Driver): DriverKind =>
  getDriverConfig(driver).kind;

export const isKeyValueDriver = (driver: Driver): boolean =>
  getDriverConfig(driver).kind === "kv";

export const getImportDriverCapability = (
  driver: string,
): ImportDriverCapability => {
  const normalized = driver.trim().toLowerCase();
  const id =
    normalized === "postgresql" || normalized === "pgsql" ? "postgres" : normalized;
  const config = DRIVER_METADATA.find((d) => d.id === id);
  return config?.importCapability ?? "unsupported";
};
