import type { TreeConfig, TreeCallbacks } from "./tree-adapters/types.tsx";
import { createSqlTreeConfig } from "./tree-adapters/sql-adapter.tsx";
import { createRedisTreeConfig } from "./tree-adapters/redis-adapter.tsx";
import { createElasticsearchTreeConfig } from "./tree-adapters/elasticsearch-adapter.tsx";
import { createMongodbTreeConfig } from "./tree-adapters/mongodb-adapter.tsx";
import { createCassandraTreeConfig } from "./tree-adapters/cassandra-adapter.tsx";
import type { Driver } from "./driver-metadata";

type TreeEntry = TreeConfig | ((callbacks: TreeCallbacks) => TreeConfig);

export const DRIVER_TREE_MAP: Partial<Record<Driver, TreeEntry>> = {
  postgres: (callbacks) =>
    createSqlTreeConfig(callbacks, { supportsSchemaNode: true }, "postgres"),
  mysql: (callbacks) => createSqlTreeConfig(callbacks, undefined, "mysql"),
  mariadb: (callbacks) => createSqlTreeConfig(callbacks, undefined, "mariadb"),
  tidb: (callbacks) => createSqlTreeConfig(callbacks, undefined, "tidb"),
  starrocks: (callbacks) => createSqlTreeConfig(callbacks, undefined, "starrocks"),
  doris: (callbacks) => createSqlTreeConfig(callbacks, undefined, "doris"),
  sqlite: (callbacks) => createSqlTreeConfig(callbacks, undefined, "sqlite"),
  duckdb: (callbacks) => createSqlTreeConfig(callbacks, undefined, "duckdb"),
  clickhouse: (callbacks) => createSqlTreeConfig(callbacks),
  mssql: (callbacks) =>
    createSqlTreeConfig(callbacks, { supportsSchemaNode: true }),
  oracle: (callbacks) =>
    createSqlTreeConfig(callbacks, { supportsSchemaNode: true }),
  db2: (callbacks) =>
    createSqlTreeConfig(callbacks, { supportsSchemaNode: true }),
  redis: (callbacks) => createRedisTreeConfig(callbacks),
  elasticsearch: (callbacks) => createElasticsearchTreeConfig(callbacks),
  mongodb: (callbacks) => createMongodbTreeConfig(callbacks),
  cassandra: (callbacks) => createCassandraTreeConfig(callbacks),
};

export const getTreeConfig = (
  driver: Driver,
  callbacks?: TreeCallbacks,
): TreeConfig => {
  const entry = DRIVER_TREE_MAP[driver];
  if (!entry) {
    throw new Error(`No treeConfig defined for driver: ${driver}`);
  }
  if (typeof entry === "function") {
    return entry(callbacks || {});
  }
  return entry;
};
