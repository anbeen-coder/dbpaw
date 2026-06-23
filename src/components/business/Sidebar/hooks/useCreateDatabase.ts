import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { CreateDatabasePayload, Driver } from "@/services/api";
import type { Connection, CreateDatabaseForm } from "../connection-list/types";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supportsCreateDatabase, isMysqlFamilyDriver, isRegisteredDriver } from "@/lib/driver-registry";
import { errorMessage } from "@/lib/errors";

const defaultCreateDatabaseForm: CreateDatabaseForm = {
  name: "",
  ifNotExists: true,
  charset: "",
  collation: "",
  encoding: "",
  lcCollate: "",
  lcCtype: "",
};

export const createDbNoneOption = "__none__";

export const postgresEncodingOptions = [
  "UTF8",
  "SQL_ASCII",
  "BIG5",
  "EUC_CN",
  "EUC_JP",
  "EUC_JIS_2004",
  "EUC_KR",
  "EUC_TW",
  "GB18030",
  "GBK",
  "ISO_8859_5",
  "ISO_8859_6",
  "ISO_8859_7",
  "ISO_8859_8",
  "JOHAB",
  "KOI8R",
  "KOI8U",
  "LATIN1",
  "LATIN2",
  "LATIN3",
  "LATIN4",
  "LATIN5",
  "LATIN6",
  "LATIN7",
  "LATIN8",
  "LATIN9",
  "LATIN10",
  "MULE_INTERNAL",
  "SHIFT_JIS_2004",
  "SJIS",
  "UHC",
  "WIN866",
  "WIN874",
  "WIN1250",
  "WIN1251",
  "WIN1252",
  "WIN1253",
  "WIN1254",
  "WIN1255",
  "WIN1256",
  "WIN1257",
  "WIN1258",
];

export const postgresLocaleOptions = [
  "en_US.UTF-8",
  "C",
  "C.UTF-8",
  "zh_CN.UTF-8",
  "ja_JP.UTF-8",
];

export const mssqlCollationOptions = [
  "SQL_Latin1_General_CP1_CI_AS",
  "SQL_Latin1_General_CP1_CS_AS",
  "SQL_Latin1_General_CP1_CI_AI",
  "SQL_Latin1_General_CP1_CS_AI",
  "Latin1_General_CI_AS",
  "Latin1_General_CS_AS",
  "Latin1_General_BIN",
  "Latin1_General_BIN2",
  "Latin1_General_100_CI_AS",
  "Latin1_General_100_CS_AS",
  "Latin1_General_100_CI_AI",
  "Latin1_General_100_BIN2",
  "Latin1_General_100_CI_AS_SC",
  "Latin1_General_100_CS_AS_SC",
  "Latin1_General_100_CI_AI_SC",
  "Latin1_General_100_BIN2_UTF8",
  "Latin1_General_100_CI_AS_SC_UTF8",
  "Latin1_General_100_CI_AI_SC_UTF8",
  "SQL_Latin1_General_CP850_CI_AS",
  "Modern_Spanish_CI_AS",
  "Modern_Spanish_100_CI_AS",
  "French_CI_AS",
  "French_100_CI_AS",
  "German_PhoneBook_CI_AS",
  "German_PhoneBook_100_CI_AS",
  "Turkish_CI_AS",
  "Turkish_100_CI_AS",
  "Cyrillic_General_CI_AS",
  "Cyrillic_General_100_CI_AS",
  "Chinese_PRC_CI_AS",
  "Chinese_PRC_CS_AS",
  "Chinese_PRC_100_CI_AS",
  "Chinese_PRC_100_CS_AS",
  "Chinese_PRC_100_BIN2",
  "Chinese_PRC_100_CI_AS_SC",
  "Chinese_PRC_100_CI_AS_SC_UTF8",
  "Chinese_Simplified_Pinyin_100_CI_AS",
  "Chinese_Simplified_Pinyin_100_CS_AS",
  "Chinese_Traditional_Stroke_Order_100_CI_AS",
  "Japanese_CI_AS",
  "Japanese_CS_AS",
  "Japanese_BIN2",
  "Japanese_XJIS_100_CI_AS",
  "Japanese_XJIS_100_CS_AS",
  "Japanese_XJIS_100_BIN2",
  "Japanese_XJIS_140_CI_AS",
  "Japanese_XJIS_140_CI_AS_KS_WS",
  "Japanese_Bushu_Kakusu_100_CI_AS",
  "Japanese_Bushu_Kakusu_140_CI_AS",
  "Korean_Wansung_CI_AS",
  "Korean_Wansung_100_CI_AS",
  "Korean_Wansung_140_CI_AS",
  "Korean_Unicode_CI_AS",
  "Korean_Unicode_100_CI_AS",
  "Korean_Unicode_140_CI_AS",
];

export function useCreateDatabase(params: {
  connections: Connection[];
  setExpandedConnections: (fn: (prev: Set<string>) => Set<string>) => void;
  clearConnectionTreeCache: (connectionId: string) => void;
  fetchAndSetDatabases: (connectionId: string) => Promise<boolean>;
}) {
  const { connections, setExpandedConnections, clearConnectionTreeCache, fetchAndSetDatabases } = params;
  const { t } = useTranslation();

  const [isCreatingDatabase, setIsCreatingDatabase] = useState(false);
  const [createDbConnectionId, setCreateDbConnectionId] = useState<
    string | null
  >(null);
  const [isCreateDbDialogOpen, setIsCreateDbDialogOpen] = useState(false);
  const [showCreateDbAdvanced, setShowCreateDbAdvanced] = useState(false);
  const [createDbValidationMsg, setCreateDbValidationMsg] = useState<
    string | null
  >(null);
  const [createDbForm, setCreateDbForm] = useState<CreateDatabaseForm>(
    defaultCreateDatabaseForm,
  );
  const [mysqlCharsets, setMysqlCharsets] = useState<string[]>([]);
  const [mysqlCollations, setMysqlCollations] = useState<string[]>([]);
  const [loadingMysqlOptions, setLoadingMysqlOptions] = useState(false);

  const supportsCreateDatabaseForDriver = (driver: Driver) =>
    supportsCreateDatabase(driver);

  const createDbTargetConnection = useMemo(
    () => connections.find((conn) => conn.id === createDbConnectionId) || null,
    [connections, createDbConnectionId],
  );
  const createDbTargetDriver = createDbTargetConnection?.type;
  const isMySqlFamilyCreateDb = createDbTargetDriver
    ? isRegisteredDriver(createDbTargetDriver) && isMysqlFamilyDriver(createDbTargetDriver)
    : false;
  const isPostgresCreateDb = createDbTargetDriver === "postgres";
  const isMssqlCreateDb = createDbTargetDriver === "mssql";

  useEffect(() => {
    if (
      !isCreateDbDialogOpen ||
      !isMySqlFamilyCreateDb ||
      !createDbConnectionId
    )
      return;
    setLoadingMysqlOptions(true);
    api.connections
      .getMysqlCharsets(Number(createDbConnectionId))
      .then(setMysqlCharsets)
      .catch(() => setMysqlCharsets(["utf8mb4", "utf8", "latin1"]))
      .finally(() => setLoadingMysqlOptions(false));
  }, [isCreateDbDialogOpen, isMySqlFamilyCreateDb, createDbConnectionId]);

  useEffect(() => {
    if (
      !isCreateDbDialogOpen ||
      !isMySqlFamilyCreateDb ||
      !createDbConnectionId
    )
      return;
    api.connections
      .getMysqlCollations(
        Number(createDbConnectionId),
        createDbForm.charset || undefined,
      )
      .then(setMysqlCollations)
      .catch(() => setMysqlCollations([]));
  }, [
    isCreateDbDialogOpen,
    isMySqlFamilyCreateDb,
    createDbConnectionId,
    createDbForm.charset,
  ]);

  const openCreateDatabaseDialog = (connectionId: string) => {
    const connection = connections.find((conn) => conn.id === connectionId);
    if (!connection || !supportsCreateDatabaseForDriver(connection.type)) {
      return;
    }
    setCreateDbConnectionId(connectionId);
    setCreateDbValidationMsg(null);
    setShowCreateDbAdvanced(false);
    setCreateDbForm(defaultCreateDatabaseForm);
    setIsCreateDbDialogOpen(true);
  };

  const handleCreateDatabase = async () => {
    const connection = createDbTargetConnection;
    if (!connection || !supportsCreateDatabaseForDriver(connection.type))
      return;

    const name = createDbForm.name.trim();
    if (!name) {
      setCreateDbValidationMsg(
        t("connection.createDbDialog.validation.requiredName"),
      );
      return;
    }

    const payload: CreateDatabasePayload = {
      name,
      ifNotExists: createDbForm.ifNotExists,
    };
    if (isMySqlFamilyCreateDb) {
      if (createDbForm.charset.trim())
        payload.charset = createDbForm.charset.trim();
      if (createDbForm.collation.trim()) {
        payload.collation = createDbForm.collation.trim();
      }
    } else if (isPostgresCreateDb) {
      if (createDbForm.encoding.trim())
        payload.encoding = createDbForm.encoding.trim();
      if (createDbForm.lcCollate.trim()) {
        payload.lcCollate = createDbForm.lcCollate.trim();
      }
      if (createDbForm.lcCtype.trim())
        payload.lcCtype = createDbForm.lcCtype.trim();
    } else if (isMssqlCreateDb) {
      if (createDbForm.collation.trim()) {
        payload.collation = createDbForm.collation.trim();
      }
    }

    setCreateDbValidationMsg(null);
    setIsCreatingDatabase(true);
    try {
      await api.connections.createDatabase(Number(connection.id), payload);
      toast.success(t("connection.toast.createDatabaseSuccess"), {
        description: name,
      });
      setIsCreateDbDialogOpen(false);
      clearConnectionTreeCache(connection.id);
      const loaded = await fetchAndSetDatabases(connection.id);
      if (loaded) {
        setExpandedConnections((prev) => {
          const next = new Set(prev);
          next.add(connection.id);
          return next;
        });
      }
    } catch (e) {
      toast.error(t("connection.toast.createDatabaseFailed"), {
        description: errorMessage(e),
      });
    } finally {
      setIsCreatingDatabase(false);
    }
  };

  const closeCreateDbDialog = () => {
    setIsCreateDbDialogOpen(false);
    setCreateDbValidationMsg(null);
    setCreateDbConnectionId(null);
    setShowCreateDbAdvanced(false);
    setCreateDbForm(defaultCreateDatabaseForm);
    setMysqlCharsets([]);
    setMysqlCollations([]);
  };

  return {
    isCreatingDatabase,
    setIsCreatingDatabase,
    createDbConnectionId,
    setCreateDbConnectionId,
    isCreateDbDialogOpen,
    setIsCreateDbDialogOpen,
    showCreateDbAdvanced,
    setShowCreateDbAdvanced,
    createDbValidationMsg,
    setCreateDbValidationMsg,
    createDbForm,
    setCreateDbForm,
    mysqlCharsets,
    mysqlCollations,
    loadingMysqlOptions,
    supportsCreateDatabaseForDriver,
    createDbTargetConnection,
    createDbTargetDriver,
    isMySqlFamilyCreateDb,
    isPostgresCreateDb,
    isMssqlCreateDb,
    openCreateDatabaseDialog,
    handleCreateDatabase,
    closeCreateDbDialog,
    defaultCreateDatabaseForm,
    createDbNoneOption,
    postgresEncodingOptions,
    postgresLocaleOptions,
    mssqlCollationOptions,
  };
}
