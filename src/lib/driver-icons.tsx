import type { ReactNode } from "react";
import { Server } from "lucide-react";
import {
  siMysql,
  siMariadb,
  siPostgresql,
  siSqlite,
  siClickhouse,
  siDuckdb,
  siRedis,
  siApachedoris,
  siTidb,
  siElasticsearch,
  siMongodb,
  siApachecassandra,
} from "simple-icons";
import type { Driver } from "./driver-metadata";

const renderSimpleIcon = (icon: { path: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    aria-hidden="true"
    className="shrink-0"
    role="img"
  >
    <path d={icon.path} fill="currentColor" />
  </svg>
);

const renderLocalIcon = (src: string) => (
  <img
    src={src}
    alt=""
    className="h-4 w-4 object-contain shrink-0"
    aria-hidden="true"
  />
);

export const DRIVER_ICON_MAP: Record<Driver, () => ReactNode> = {
  postgres: () => renderSimpleIcon(siPostgresql),
  mysql: () => renderSimpleIcon(siMysql),
  mariadb: () => renderSimpleIcon(siMariadb),
  tidb: () => renderSimpleIcon(siTidb),
  starrocks: () => renderLocalIcon("/icons/db/starrocks.svg"),
  doris: () => renderSimpleIcon(siApachedoris),
  sqlite: () => renderSimpleIcon(siSqlite),
  duckdb: () => renderSimpleIcon(siDuckdb),
  clickhouse: () => renderSimpleIcon(siClickhouse),
  mssql: () => renderLocalIcon("/icons/db/mssql.svg"),
  oracle: () => renderLocalIcon("/icons/db/oracle.svg"),
  db2: () => renderLocalIcon("/icons/db/db2.svg"),
  redis: () => renderSimpleIcon(siRedis),
  elasticsearch: () => renderSimpleIcon(siElasticsearch),
  mongodb: () => renderSimpleIcon(siMongodb),
  cassandra: () => renderSimpleIcon(siApachecassandra),
};

export const getConnectionIcon = (
  driver: Driver | string | undefined,
): ReactNode => {
  const id = String(driver || "").trim().toLowerCase();
  const normalized =
    id === "postgresql" || id === "pgsql"
      ? "postgres"
      : id === "sqlite3"
        ? "sqlite"
        : id;
  const iconFn = DRIVER_ICON_MAP[normalized as Driver];
  if (iconFn) return iconFn();
  return <Server className="w-4 h-4" />;
};
