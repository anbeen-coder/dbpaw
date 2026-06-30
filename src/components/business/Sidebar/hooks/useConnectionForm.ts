import { useMemo, useState, type FormEvent } from "react";
import { api, isTauri } from "@/services/api";
import type { ConnectionForm, Driver } from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Connection } from "../connection-list/types";
import {
  buildConnectionFormDefaults,
  normalizeConnectionFormInput,
} from "@/lib/connection-form/rules";
import { validateConnectionFormInput } from "@/lib/connection-form/validate";
import { buildFormFromConnection } from "../connection-list/helpers";
import { mapSavedConnection } from "./useConnectionCrud";
import { supportsSSLCA } from "@/lib/driver-registry";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { errorMessage } from "@/lib/errors";

const defaultConnectionDriver: Driver = "postgres";

export function useConnectionForm(params: {
  connections: Connection[];
  setConnections: (fn: (prev: Connection[]) => Connection[]) => void;
  fetchConnections: () => Promise<void>;
  onConnect?: (form: ConnectionForm) => void;
}) {
  const { connections, setConnections, fetchConnections, onConnect } = params;
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [createStep, setCreateStep] = useState<"type" | "details">("type");
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(
    null,
  );
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [testMsg, setTestMsg] = useState<{
    ok: boolean;
    text: string;
    latency?: number;
  } | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [form, setForm] = useState<ConnectionForm>(
    buildConnectionFormDefaults(defaultConnectionDriver),
  );

  const normalizedForm = useMemo(
    () => normalizeConnectionFormInput(form),
    [form],
  );
  const validationIssues = useMemo(
    () =>
      validateConnectionFormInput(
        normalizedForm,
        dialogMode === "edit" ? "edit" : "create",
      ),
    [normalizedForm, dialogMode],
  );
  const requiredOk = useMemo(() => {
    return validationIssues.length === 0;
  }, [validationIssues]);

  const validateSslSettings = () => {
    if (!form.ssl || !supportsSSLCA(form.driver)) {
      return null;
    }
    if (form.sslMode === "verify_ca" && !(form.sslCaCert || "").trim()) {
      return t("connection.dialog.sslValidation.caRequired");
    }
    return null;
  };

  const getFirstValidationMessage = () => {
    if (validationIssues.length === 0) {
      return null;
    }
    const issue = validationIssues[0];
    return t(issue.key);
  };

  const pickSingleFile = async (params: {
    title: string;
    filters?: { name: string; extensions: string[] }[];
  }) => {
    if (!isTauri()) {
      toast.info(t("connection.toast.fileBrowserDesktopOnly"));
      return null;
    }
    try {
      const selected = await open({
        title: params.title,
        multiple: false,
        filters: params.filters,
      });
      if (selected && typeof selected === "string") {
        return selected;
      }
      return null;
    } catch (e) {
      toast.error(t("connection.toast.openFileDialogFailed"), {
        description: errorMessage(e),
      });
      return null;
    }
  };

  const handlePickSslCaCertFile = async () => {
    const selectedPath = await pickSingleFile({
      title: t("connection.dialog.sslCaFileDialogTitle"),
      filters: [
        {
          name: t("connection.dialog.fileFilterCert"),
          extensions: ["pem", "crt", "cer"],
        },
        { name: t("connection.dialog.fileFilterAll"), extensions: ["*"] },
      ],
    });
    if (!selectedPath) return;
    try {
      const content = await readTextFile(selectedPath);
      setForm((f) => ({ ...f, sslCaCert: content }));
    } catch (e) {
      toast.error(t("connection.toast.readFileFailed"), {
        description: errorMessage(e),
      });
    }
  };

  const handlePickSshKeyFile = async () => {
    const selectedPath = await pickSingleFile({
      title: t("connection.dialog.sshKeyFileDialogTitle"),
    });
    if (!selectedPath) return;
    setForm((f) => ({ ...f, sshKeyPath: selectedPath }));
  };

  const handlePickDatabaseFile = async (driver: Driver) => {
    const selected = await pickSingleFile({
      title:
        driver === "duckdb"
          ? t("connection.dialog.fileDialogTitleDuckdb")
          : t("connection.dialog.fileDialogTitle"),
      filters: [
        {
          name:
            driver === "duckdb"
              ? t("connection.dialog.fileFilterDuckdb")
              : t("connection.dialog.fileFilterSqlite"),
          extensions:
            driver === "duckdb"
              ? ["duckdb", "db"]
              : ["sqlite", "db", "sqlite3", "db3"],
        },
        {
          name: t("connection.dialog.fileFilterAll"),
          extensions: ["*"],
        },
      ],
    });
    if (!selected) return;
    setForm((current) => ({ ...current, filePath: selected }));
  };

  const handleTestConnection = async () => {
    try {
      setValidationMsg(null);
      const fieldValidationError = getFirstValidationMessage();
      if (fieldValidationError) {
        setValidationMsg(fieldValidationError);
        return;
      }
      const sslError = validateSslSettings();
      if (sslError) {
        setValidationMsg(sslError);
        return;
      }
      setIsTesting(true);
      setTestMsg(null);
      const res =
        dialogMode === "edit" && editingConnectionId
          ? await api.connections.testSavedEdit(
              Number(editingConnectionId),
              normalizedForm,
            )
          : await api.connections.testEphemeral(normalizedForm);
      setTestMsg({
        ok: res.success,
        text: res.message,
        latency: res.latencyMs,
      });
    } catch (e: any) {
      setTestMsg({ ok: false, text: String(e?.message || e) });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!requiredOk) {
      setValidationMsg(getFirstValidationMessage());
      return;
    }
    setValidationMsg(null);
    const sslError = validateSslSettings();
    if (sslError) {
      setValidationMsg(sslError);
      return;
    }
    setIsConnecting(true);
    try {
      const res = await api.connections.create(normalizedForm);
      setConnections((prev) => [
        mapSavedConnection(res, t("common.unknown")),
        ...prev,
      ]);
      setIsDialogOpen(false);
      setCreateStep("type");
      setForm(buildConnectionFormDefaults(defaultConnectionDriver));
      if (onConnect) onConnect(normalizedForm);
    } catch (e: any) {
      setValidationMsg(String(e?.message || e));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingConnectionId) return;
    if (!requiredOk) {
      setValidationMsg(getFirstValidationMessage());
      return;
    }

    setValidationMsg(null);
    const sslError = validateSslSettings();
    if (sslError) {
      setValidationMsg(sslError);
      return;
    }
    setIsSavingEdit(true);
    try {
      await api.connections.update(Number(editingConnectionId), normalizedForm);
      await fetchConnections();
      setIsDialogOpen(false);
      setDialogMode("create");
      setCreateStep("type");
      setEditingConnectionId(null);
      setForm(buildConnectionFormDefaults(defaultConnectionDriver));
    } catch (e: any) {
      setValidationMsg(String(e?.message || e));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDialogSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (dialogMode === "edit") {
      void handleSaveEdit();
      return;
    }
    void handleConnect();
  };

  const resetConnectionDialogFeedback = () => {
    setValidationMsg(null);
    setTestMsg(null);
  };

  const closeConnectionDialog = () => {
    setIsDialogOpen(false);
    setDialogMode("create");
    setCreateStep("type");
    setEditingConnectionId(null);
    resetConnectionDialogFeedback();
    setForm(buildConnectionFormDefaults(defaultConnectionDriver));
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setCreateStep("type");
    setEditingConnectionId(null);
    resetConnectionDialogFeedback();
    setForm(buildConnectionFormDefaults(defaultConnectionDriver));
    setIsDialogOpen(true);
  };

  const openEditDialog = (connectionId: string) => {
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn) return;

    setDialogMode("edit");
    setCreateStep("details");
    setEditingConnectionId(connectionId);
    resetConnectionDialogFeedback();
    setForm(buildFormFromConnection(conn));
    setIsDialogOpen(true);
  };

  const handleCreateDriverSelect = (driver: Driver) => {
    setForm((current) =>
      buildConnectionFormDefaults(driver, {
        name: current.name,
      }),
    );
    resetConnectionDialogFeedback();
    setCreateStep("details");
  };

  return {
    isDialogOpen,
    setIsDialogOpen,
    isImportDialogOpen,
    setIsImportDialogOpen,
    dialogMode,
    createStep,
    setCreateStep,
    form,
    setForm,
    validationMsg,
    testMsg,
    requiredOk,
    isTesting,
    isConnecting,
    isSavingEdit,
    handleTestConnection,
    handleConnect,
    handleSaveEdit,
    handleDialogSubmit,
    resetConnectionDialogFeedback,
    closeConnectionDialog,
    openCreateDialog,
    openEditDialog,
    handleCreateDriverSelect,
    handlePickSslCaCertFile,
    handlePickSshKeyFile,
    handlePickDatabaseFile,
    pickSingleFile,
  };
}
