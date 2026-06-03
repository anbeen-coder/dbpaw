import { useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { api, getImportDriverCapability, isTauri } from "@/services/api";
import type { Driver } from "@/services/api";
import type {
  Connection,
  DatabaseInfo,
  TableInfo,
  DatabaseExportFormat,
  TableExportFormat,
} from "../connection-list/types";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getExportDefaultName, getExportFilter } from "../connection-list/helpers";
import { errorMessage } from "@/lib/errors";

export function useImportExport(params: {
  connections: Connection[];
  onExportTable?: (
    ctx: {
      connectionId: number;
      database: string;
      schema: string;
      table: string;
      driver: string;
    },
    format: "csv" | "json" | "sql_dml" | "sql_ddl" | "sql_full",
    filePath: string,
  ) => void;
  onExportDatabase?: (ctx: {
    connectionId: number;
    database: string;
    driver: string;
    format: DatabaseExportFormat;
    filePath: string;
  }) => void;
  handleRefreshDatabaseTables: (
    connectionId: string,
    databaseName: string,
  ) => Promise<void>;
}) {
  const { connections, onExportTable, onExportDatabase, handleRefreshDatabaseTables } = params;
  const { t } = useTranslation();

  const [isImportingSql, setIsImportingSql] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    connectionId: string;
    databaseName: string;
    driver: Driver;
    filePath: string;
  } | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingDatabaseExport, setPendingDatabaseExport] = useState<{
    connectionId: string;
    databaseName: string;
    driver: Driver;
    format: DatabaseExportFormat;
  } | null>(null);
  const [isDatabaseExportDialogOpen, setIsDatabaseExportDialogOpen] =
    useState(false);
  const [isExportingDatabaseSql, setIsExportingDatabaseSql] = useState(false);
  const [pendingTableExport, setPendingTableExport] = useState<{
    connection: Connection;
    database: DatabaseInfo;
    table: TableInfo;
  } | null>(null);
  const [isTableExportDialogOpen, setIsTableExportDialogOpen] = useState(false);
  const [isExportingTable, setIsExportingTable] = useState(false);
  const [tableExportFormat, setTableExportFormat] =
    useState<TableExportFormat>("csv");

  const handleTableExportDialog = (
    connection: Connection,
    database: DatabaseInfo,
    table: TableInfo,
  ) => {
    if (!onExportTable) return;
    if (!isTauri()) {
      toast.error(t("connection.toast.exportDesktopOnly"));
      return;
    }
    setPendingTableExport({ connection, database, table });
    setTableExportFormat("csv");
    setIsTableExportDialogOpen(true);
  };

  const handleTableExportConfirm = async () => {
    if (!pendingTableExport || !onExportTable) return;
    const { connection, database, table } = pendingTableExport;
    try {
      setIsExportingTable(true);
      const selected = await save({
        title: t("connection.toast.saveExportFile"),
        defaultPath: getExportDefaultName(table.name, tableExportFormat),
        filters: getExportFilter(tableExportFormat),
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;
      setIsTableExportDialogOpen(false);
      onExportTable(
        {
          connectionId: Number(connection.id),
          database: database.name,
          schema: table.schema,
          table: table.name,
          driver: connection.type,
        },
        tableExportFormat,
        filePath,
      );
      setPendingTableExport(null);
    } catch (e) {
      toast.error(t("connection.toast.openSaveDialogFailed"), {
        description: errorMessage(e),
      });
    } finally {
      setIsExportingTable(false);
    }
  };

  const handleDatabaseImport = async (
    connectionId: string,
    databaseName: string,
  ) => {
    const connection = connections.find((conn) => conn.id === connectionId);
    if (!connection) return;

    const capability = getImportDriverCapability(connection.type);
    if (capability === "read_only_not_supported") {
      toast.error(t("connection.toast.importReadOnlyDriver"));
      return;
    }

    if (capability !== "supported") {
      toast.error(t("connection.toast.importUnsupportedDriver"));
      return;
    }

    if (!isTauri()) {
      toast.error(t("connection.toast.importDesktopOnly"));
      return;
    }

    const selectedPath = await open({
      title: t("connection.toast.selectImportSqlFile"),
      filters: [{ name: "SQL", extensions: ["sql"] }],
    });
    if (!selectedPath) return;

    const filePath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
    if (!filePath) return;

    setPendingImport({
      connectionId,
      databaseName,
      driver: connection.type,
      filePath,
    });
    setIsImportConfirmOpen(true);
  };

  const handleDatabaseExport = async (
    connection: Connection,
    database: DatabaseInfo,
  ) => {
    if (!onExportDatabase) return;
    if (!isTauri()) {
      toast.error(t("connection.toast.exportDesktopOnly"));
      return;
    }

    setPendingDatabaseExport({
      connectionId: connection.id,
      databaseName: database.name,
      driver: connection.type,
      format: "sql_full",
    });
    setIsDatabaseExportDialogOpen(true);
  };

  const handleConfirmDatabaseExport = async () => {
    if (!pendingDatabaseExport || !onExportDatabase) return;
    if (!isTauri()) {
      toast.error(t("connection.toast.exportDesktopOnly"));
      return;
    }

    setIsExportingDatabaseSql(true);
    try {
      const suffix =
        pendingDatabaseExport.format === "sql_ddl"
          ? "ddl"
          : pendingDatabaseExport.format === "sql_dml"
            ? "dml"
            : "full";
      const selected = await save({
        title: t("connection.toast.saveExportFile"),
        defaultPath: getExportDefaultName(
          `${pendingDatabaseExport.databaseName}_${suffix}`,
          pendingDatabaseExport.format,
        ),
        filters: getExportFilter(pendingDatabaseExport.format),
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;

      onExportDatabase({
        connectionId: Number(pendingDatabaseExport.connectionId),
        database: pendingDatabaseExport.databaseName,
        driver: pendingDatabaseExport.driver,
        format: pendingDatabaseExport.format,
        filePath,
      });
      setIsDatabaseExportDialogOpen(false);
      setPendingDatabaseExport(null);
    } catch (e) {
      toast.error(t("connection.toast.openSaveDialogFailed"), {
        description: errorMessage(e),
      });
    } finally {
      setIsExportingDatabaseSql(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;

    setIsImportingSql(true);
    try {
      const result = await api.transfer.importSqlFile({
        id: Number(pendingImport.connectionId),
        database: pendingImport.databaseName,
        filePath: pendingImport.filePath,
        driver: pendingImport.driver,
      });

      if (result.error || result.failedAt) {
        toast.error(t("connection.toast.importFailed"), {
          description: result.error || t("common.unknown"),
        });
      } else {
        toast.success(
          t("connection.toast.importSuccess", {
            count: result.successStatements,
          }),
          {
            description: pendingImport.filePath,
          },
        );
      }

      await handleRefreshDatabaseTables(
        pendingImport.connectionId,
        pendingImport.databaseName,
      );
    } catch (e) {
      toast.error(t("connection.toast.importFailed"), {
        description: errorMessage(e),
      });
    } finally {
      setIsImportingSql(false);
      setIsImportConfirmOpen(false);
      setPendingImport(null);
    }
  };

  return {
    isImportingSql,
    setIsImportingSql,
    pendingImport,
    setPendingImport,
    isImportConfirmOpen,
    setIsImportConfirmOpen,
    pendingDatabaseExport,
    setPendingDatabaseExport,
    isDatabaseExportDialogOpen,
    setIsDatabaseExportDialogOpen,
    isExportingDatabaseSql,
    setIsExportingDatabaseSql,
    pendingTableExport,
    setPendingTableExport,
    isTableExportDialogOpen,
    setIsTableExportDialogOpen,
    isExportingTable,
    setIsExportingTable,
    tableExportFormat,
    setTableExportFormat,
    handleTableExportDialog,
    handleTableExportConfirm,
    handleDatabaseImport,
    handleDatabaseExport,
    handleConfirmDatabaseExport,
    handleConfirmImport,
  };
}
