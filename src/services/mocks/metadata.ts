import {
  TableMetadata,
  SchemaForeignKey,
  SchemaOverview,
  ConnectionForm,
} from "../types";
import { COMMANDS } from "../commands";
import type { CommandMap, CommandArgs, CommandReturn } from "../commands";

type MetadataCommand = Extract<keyof CommandMap,
  | "list_tables"
  | "list_routines"
  | "get_table_structure"
  | "get_table_ddl"
  | "get_routine_ddl"
  | "get_table_metadata"
  | "list_tables_by_conn"
  | "list_databases"
  | "list_databases_by_id"
  | "get_schema_overview"
  | "get_schema_foreign_keys"
  | "list_events"
  | "list_sequences"
  | "list_types"
  | "list_synonyms"
  | "list_packages"
  | "get_driver_capabilities"
>;

const DriverCapabilities = {
  ROUTINES:      0b0000_0001,
  EVENTS:        0b0000_0010,
  SEQUENCES:     0b0000_0100,
  TYPES:         0b0000_1000,
  SYNONYMS:      0b0001_0000,
  PACKAGES:      0b0010_0000,
  FOREIGN_KEYS:  0b0100_0000,
  QUERY_WITH_ID: 0b1000_0000,
} as const;

export const mockTables: { schema: string; name: string; type: string }[] = [
  { schema: "public", name: "users", type: "table" },
  { schema: "public", name: "posts", type: "table" },
  { schema: "public", name: "comments", type: "table" },
  { schema: "public", name: "tags", type: "table" },
  { schema: "public", name: "orders", type: "table" },
  { schema: "public", name: "order_items", type: "table" },
  { schema: "public", name: "products", type: "table" },
  { schema: "public", name: "product_categories", type: "table" },
  { schema: "public", name: "categories", type: "table" },
  { schema: "public", name: "payments", type: "table" },
  { schema: "public", name: "refunds", type: "table" },
  { schema: "public", name: "invoices", type: "table" },
  { schema: "public", name: "addresses", type: "table" },
  { schema: "public", name: "audit_logs", type: "table" },
  { schema: "public", name: "sessions", type: "table" },
  { schema: "public", name: "roles", type: "table" },
  { schema: "public", name: "user_roles", type: "table" },
  { schema: "analytics", name: "page_views", type: "table" },
  { schema: "analytics", name: "events", type: "table" },
  { schema: "analytics", name: "funnels", type: "table" },
  // complex-type test table — SELECT * FROM json_test returns mockComplexTypeData
  { schema: "public", name: "json_test", type: "table" },
  // array-type test table — SELECT * FROM pg_arrays returns mockArrayTypeData
  { schema: "public", name: "pg_arrays", type: "table" },
  { schema: "public", name: "special_types", type: "table" },
];

export const mockTableStructure = {
  columns: [
    { name: "id", type: "integer", nullable: false },
    { name: "username", type: "varchar", nullable: false },
    { name: "email", type: "varchar", nullable: false },
    { name: "created_at", type: "timestamp", nullable: true },
    { name: "updated_at", type: "timestamp", nullable: true },
  ],
};

export const mockTableMetadata: TableMetadata = {
  columns: [
    {
      name: "id",
      type: "integer",
      nullable: false,
      primaryKey: true,
      comment: "User ID",
    },
    {
      name: "username",
      type: "varchar",
      nullable: false,
      primaryKey: false,
      comment: "Username",
    },
    {
      name: "email",
      type: "varchar",
      nullable: false,
      primaryKey: false,
      comment: "Email address",
    },
    {
      name: "password_hash",
      type: "varchar",
      nullable: false,
      primaryKey: false,
      comment: "Password hash",
    },
    {
      name: "created_at",
      type: "timestamp",
      nullable: true,
      defaultValue: "CURRENT_TIMESTAMP",
      primaryKey: false,
      comment: "Created timestamp",
    },
    {
      name: "updated_at",
      type: "timestamp",
      nullable: true,
      defaultValue: "CURRENT_TIMESTAMP",
      primaryKey: false,
      comment: "Updated timestamp",
    },
  ],
  indexes: [
    {
      name: "users_pkey",
      unique: true,
      indexType: "btree",
      columns: ["id"],
    },
    {
      name: "users_email_idx",
      unique: false,
      indexType: "btree",
      columns: ["email"],
    },
    {
      name: "users_username_idx",
      unique: false,
      indexType: "btree",
      columns: ["username"],
    },
  ],
  foreignKeys: [
    {
      name: "fk_user_role",
      column: "role_id",
      referencedTable: "roles",
      referencedColumn: "id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
  ],
  specialTypeSummaries: [],
};

export const mockSchemaForeignKeys: SchemaForeignKey[] = [
  {
    name: "fk_user_role",
    sourceTable: "users",
    sourceColumn: "role_id",
    targetTable: "roles",
    targetColumn: "id",
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  {
    name: "fk_order_user",
    sourceTable: "orders",
    sourceColumn: "user_id",
    targetTable: "users",
    targetColumn: "id",
    onUpdate: "NO ACTION",
    onDelete: "CASCADE",
  },
  {
    name: "fk_order_item_order",
    sourceTable: "order_items",
    sourceColumn: "order_id",
    targetTable: "orders",
    targetColumn: "id",
    onUpdate: "NO ACTION",
    onDelete: "CASCADE",
  },
];

export const mockSchemaOverview: SchemaOverview = {
  tables: [
    {
      schema: "public",
      name: "users",
      columns: [
        { name: "id", type: "integer" },
        { name: "username", type: "varchar" },
        { name: "email", type: "varchar" },
        { name: "created_at", type: "timestamp" },
      ],
    },
    {
      schema: "public",
      name: "posts",
      columns: [
        { name: "id", type: "integer" },
        { name: "user_id", type: "integer" },
        { name: "title", type: "varchar" },
        { name: "content", type: "text" },
        { name: "created_at", type: "timestamp" },
      ],
    },
    {
      schema: "public",
      name: "comments",
      columns: [
        { name: "id", type: "integer" },
        { name: "post_id", type: "integer" },
        { name: "user_id", type: "integer" },
        { name: "content", type: "text" },
        { name: "created_at", type: "timestamp" },
      ],
    },
  ],
};

export const mockDatabases = [
  "postgres",
  "template1",
  "template0",
  "testdb",
  "myapp_dev",
];

const mockDDL = `CREATE TABLE public.users (
  id integer NOT NULL,
  username character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  password_hash character varying(255) NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE INDEX users_email_idx ON public.users USING btree (email);
CREATE INDEX users_username_idx ON public.users USING btree (username);`;

const mockJsonTestTableMetadata: TableMetadata = {
  columns: [
    { name: "id", type: "integer", nullable: false, primaryKey: true },
    { name: "label", type: "text", nullable: false, primaryKey: false },
    { name: "payload", type: "jsonb", nullable: true, primaryKey: false },
    { name: "notes", type: "text", nullable: true, primaryKey: false },
  ],
  indexes: [],
  foreignKeys: [],
  specialTypeSummaries: [],
};

const mockArrayTestTableMetadata: TableMetadata = {
  columns: [
    { name: "id", type: "integer", nullable: false, primaryKey: true },
    { name: "tags", type: "text[]", nullable: true, primaryKey: false },
    { name: "scores", type: "int4[]", nullable: true, primaryKey: false },
    { name: "flags", type: "bool[]", nullable: true, primaryKey: false },
    { name: "readings", type: "float8[]", nullable: true, primaryKey: false },
    {
      name: "metadata_list",
      type: "jsonb[]",
      nullable: true,
      primaryKey: false,
    },
  ],
  indexes: [],
  foreignKeys: [],
  specialTypeSummaries: [],
};

const mockSpecialTypeTableMetadata: TableMetadata = {
  columns: [
    { name: "id", type: "integer", nullable: false, primaryKey: true },
    { name: "user_bitmap", type: "BITMAP", nullable: true, primaryKey: false },
    { name: "region_geo", type: "GEOMETRY", nullable: true, primaryKey: false },
    { name: "uv_hll", type: "HLL", nullable: true, primaryKey: false },
  ],
  indexes: [],
  foreignKeys: [],
  specialTypeSummaries: [
    {
      columnName: "user_bitmap",
      category: "bitmap",
      typeName: "BITMAP",
      declaredLength: null,
      memoryUsageBytes: null,
      memoryUsageDisplay: null,
      rawType: "BITMAP",
      notes: "Memory usage is not exposed by the current metadata driver.",
    },
    {
      columnName: "region_geo",
      category: "geo",
      typeName: "GEOMETRY",
      declaredLength: null,
      memoryUsageBytes: null,
      memoryUsageDisplay: null,
      rawType: "GEOMETRY",
      notes: "Memory usage is not exposed by the current metadata driver.",
    },
    {
      columnName: "uv_hll",
      category: "hyperloglog",
      typeName: "HLL",
      declaredLength: null,
      memoryUsageBytes: null,
      memoryUsageDisplay: null,
      rawType: "HLL",
      notes: "Memory usage is not exposed by the current metadata driver.",
    },
  ],
};

export async function mockListTables(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<{ schema: string; name: string; type: string }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockTables;
}

export async function mockGetTableStructure(
  _id: number,
  _schema: string,
  _table: string,
): Promise<{ columns: { name: string; type: string; nullable: boolean }[] }> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockTableStructure;
}

export async function mockGetTableDDL(
  _id: number,
  _database: string | undefined,
  _schema: string,
  _table: string,
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockDDL;
}

export async function mockListEvents(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<{ schema: string; name: string; status: string; eventType: string; executeAt: string | null; intervalValue: string | null; lastExecuted: string | null; definition: string | null }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [];
}

export async function mockListSequences(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<{ schema: string; name: string; dataType: string; startValue: string | null; increment: string | null }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [];
}

export async function mockListTypes(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<{ schema: string; name: string; category: string }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [];
}

export async function mockListSynonyms(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<{ schema: string; name: string; baseObjectType: string }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [];
}

export async function mockListPackages(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<{ schema: string; name: string; objectType: string }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [];
}

export async function mockListRoutines(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<{ schema: string; name: string; type: "procedure" | "function" }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const routines: {
    schema: string;
    name: string;
    type: "procedure" | "function";
  }[] = [
    { schema: "dbo", name: "sync_user_stats", type: "procedure" },
    { schema: "dbo", name: "format_user_name", type: "function" },
  ];
  return routines.filter((routine) => !_schema || routine.schema === _schema);
}

export async function mockGetRoutineDDL(
  _id: number,
  _database: string | undefined,
  schema: string,
  name: string,
  routineType: "procedure" | "function",
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (routineType === "procedure") {
    return `CREATE PROCEDURE [${schema}].[${name}]
AS
BEGIN
    SELECT 1 AS ok;
END;`;
  }

  return `CREATE FUNCTION [${schema}].[${name}]()
RETURNS INT
AS
BEGIN
    RETURN 1;
END;`;
}

export async function mockGetTableMetadata(
  _id: number,
  _database: string | undefined,
  _schema: string,
  _table: string,
): Promise<TableMetadata> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (_table === "json_test") return mockJsonTestTableMetadata;
  if (_table === "pg_arrays") return mockArrayTestTableMetadata;
  if (_table === "special_types") return mockSpecialTypeTableMetadata;
  return mockTableMetadata;
}

export async function mockGetSchemaForeignKeys(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<SchemaForeignKey[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockSchemaForeignKeys;
}

export async function mockListTablesByConn(
  _form: ConnectionForm,
): Promise<{ schema: string; name: string; type: string }[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockTables;
}

export async function mockListDatabases(
  _form: ConnectionForm,
): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockDatabases;
}

export async function mockListDatabasesById(_id: number): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockDatabases;
}

export async function mockGetSchemaOverview(
  _id: number,
  _database?: string,
  _schema?: string,
): Promise<SchemaOverview> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockSchemaOverview;
}

export function handleMetadata<T extends MetadataCommand>(
  cmd: T,
  args: CommandArgs<T>
): Promise<CommandReturn<T>> | null {
  switch (cmd) {
    case COMMANDS.LIST_TABLES: {
      const a = args as CommandArgs<"list_tables">;
      return mockListTables(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_ROUTINES: {
      const a = args as CommandArgs<"list_routines">;
      return mockListRoutines(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_EVENTS: {
      const a = args as CommandArgs<"list_events">;
      return mockListEvents(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_SEQUENCES: {
      const a = args as CommandArgs<"list_sequences">;
      return mockListSequences(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_TYPES: {
      const a = args as CommandArgs<"list_types">;
      return mockListTypes(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_SYNONYMS: {
      const a = args as CommandArgs<"list_synonyms">;
      return mockListSynonyms(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_PACKAGES: {
      const a = args as CommandArgs<"list_packages">;
      return mockListPackages(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.GET_TABLE_STRUCTURE: {
      const a = args as CommandArgs<"get_table_structure">;
      return mockGetTableStructure(a.id, a.schema, a.table) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.GET_TABLE_DDL: {
      const a = args as CommandArgs<"get_table_ddl">;
      return mockGetTableDDL(a.id, a.database, a.schema, a.table) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.GET_ROUTINE_DDL: {
      const a = args as CommandArgs<"get_routine_ddl">;
      return mockGetRoutineDDL(a.id, a.database, a.schema, a.name, a.routineType) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.GET_TABLE_METADATA: {
      const a = args as CommandArgs<"get_table_metadata">;
      return mockGetTableMetadata(a.id, a.database, a.schema, a.table) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_TABLES_BY_CONN: {
      const a = args as CommandArgs<"list_tables_by_conn">;
      return mockListTablesByConn(a.form) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_DATABASES: {
      const a = args as CommandArgs<"list_databases">;
      return mockListDatabases(a.form) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.LIST_DATABASES_BY_ID: {
      const a = args as CommandArgs<"list_databases_by_id">;
      return mockListDatabasesById(a.id) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.GET_SCHEMA_OVERVIEW: {
      const a = args as CommandArgs<"get_schema_overview">;
      return mockGetSchemaOverview(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.GET_SCHEMA_FOREIGN_KEYS: {
      const a = args as CommandArgs<"get_schema_foreign_keys">;
      return mockGetSchemaForeignKeys(a.id, a.database, a.schema) as Promise<CommandReturn<T>>;
    }
    case COMMANDS.GET_DRIVER_CAPABILITIES:
      return Promise.resolve(
        DriverCapabilities.ROUTINES | DriverCapabilities.EVENTS | DriverCapabilities.FOREIGN_KEYS
      ) as Promise<CommandReturn<T>>;
    default:
      return null;
  }
}
