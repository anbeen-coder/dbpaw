import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDefaultPort } from "@/lib/driver-registry";
import type { Driver } from "@/services/api";

interface ConnectionNetworkFieldsProps {
  driver: Driver;
  host: string;
  onHostChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  port: number | undefined;
  onPortChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filePath: string;
  onFilePathChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showHost: boolean;
  showPort: boolean;
  showFilePath: boolean;
  isMssql: boolean;
  hasElasticCloudId: boolean;
  onPickDatabaseFile: (driver: Driver) => void;
}

export function ConnectionNetworkFields({
  driver,
  host,
  onHostChange,
  port,
  onPortChange,
  filePath,
  onFilePathChange,
  showHost,
  showPort,
  showFilePath,
  isMssql,
  hasElasticCloudId,
  onPickDatabaseFile,
}: ConnectionNetworkFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      {(showHost || showPort) && !hasElasticCloudId && (
        <div className="grid gap-2 sm:grid-cols-2">
          {showHost ? (
            <div className="grid gap-2">
              <Label htmlFor="host">
                {t("connection.dialog.fields.host")}{" "}
                <span className="text-red-600">*</span>
              </Label>
              <Input
                id="host"
                placeholder={undefined}
                value={host || ""}
                onChange={onHostChange}
              />
              {isMssql && (
                <p className="text-xs text-muted-foreground">
                  {t("connection.dialog.hints.mssqlNamedInstance")}
                </p>
              )}
            </div>
          ) : null}
          {showPort ? (
            <div className="grid gap-2">
              <Label htmlFor="port">
                {t("connection.dialog.fields.port")}{" "}
                <span className="text-red-600">*</span>
              </Label>
              <Input
                id="port"
                placeholder={String(getDefaultPort(driver) ?? "")}
                value={String(port || "")}
                onChange={onPortChange}
              />
            </div>
          ) : null}
        </div>
      )}

      {showFilePath ? (
        <div className="grid gap-2">
          <Label htmlFor="filePath">
            {driver === "duckdb"
              ? t("connection.dialog.fields.duckdbFilePath")
              : t("connection.dialog.fields.sqliteFilePath")}{" "}
            <span className="text-red-600">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="filePath"
              placeholder={
                driver === "duckdb"
                  ? t("connection.dialog.placeholders.duckdbPath")
                  : t("connection.dialog.placeholders.sqlitePath")
              }
              value={filePath || ""}
              onChange={onFilePathChange}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onPickDatabaseFile(driver)}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              {t("connection.dialog.browse")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
