import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "react-i18next";
import type { TableExportFormat, DatabaseExportFormat } from "./types";

interface TableExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  format: TableExportFormat;
  setFormat: (f: TableExportFormat) => void;
  isExporting: boolean;
  onConfirm: () => void;
  tableName?: string;
}

interface DatabaseExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isExporting: boolean;
  onConfirm: () => void;
  databaseName?: string;
  format: DatabaseExportFormat;
  onFormatChange: (format: DatabaseExportFormat) => void;
}

export function TableExportDialog({
  isOpen,
  onClose,
  format,
  setFormat,
  isExporting,
  onConfirm,
  tableName,
}: TableExportDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("connection.tableExportDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("connection.tableExportDialog.description", {
              table: tableName || "",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <RadioGroup
            value={format}
            onValueChange={(value: TableExportFormat) => setFormat(value)}
          >
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem value="csv" id="table-export-csv" />
              <div className="grid gap-1">
                <Label htmlFor="table-export-csv" className="cursor-pointer">
                  {t("connection.tableExportDialog.formatCsv")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.tableExportDialog.formatCsvDesc")}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem value="json" id="table-export-json" />
              <div className="grid gap-1">
                <Label htmlFor="table-export-json" className="cursor-pointer">
                  {t("connection.tableExportDialog.formatJson")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.tableExportDialog.formatJsonDesc")}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem value="sql_ddl" id="table-export-sql-ddl" />
              <div className="grid gap-1">
                <Label
                  htmlFor="table-export-sql-ddl"
                  className="cursor-pointer"
                >
                  {t("connection.tableExportDialog.formatSqlDdl")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.tableExportDialog.formatSqlDdlDesc")}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem value="sql_dml" id="table-export-sql-dml" />
              <div className="grid gap-1">
                <Label
                  htmlFor="table-export-sql-dml"
                  className="cursor-pointer"
                >
                  {t("connection.tableExportDialog.formatSqlDml")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.tableExportDialog.formatSqlDmlDesc")}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem value="sql_full" id="table-export-sql-full" />
              <div className="grid gap-1">
                <Label
                  htmlFor="table-export-sql-full"
                  className="cursor-pointer"
                >
                  {t("connection.tableExportDialog.formatSqlFull")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.tableExportDialog.formatSqlFullDesc")}
                </p>
              </div>
            </label>
          </RadioGroup>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={isExporting}
              onClick={() => void onConfirm()}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("connection.exportDialog.exporting")}
                </>
              ) : (
                t("connection.tableExportDialog.exportButton")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DatabaseExportDialog({
  isOpen,
  onClose,
  isExporting,
  onConfirm,
  databaseName,
  format,
  onFormatChange,
}: DatabaseExportDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("connection.exportDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("connection.exportDialog.description", {
              database: databaseName || "",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <RadioGroup
            value={format}
            onValueChange={(value: DatabaseExportFormat) =>
              onFormatChange(value)
            }
          >
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem value="sql_ddl" id="database-export-sql-ddl" />
              <div className="grid gap-1">
                <Label
                  htmlFor="database-export-sql-ddl"
                  className="cursor-pointer"
                >
                  {t("connection.exportDialog.options.sqlDdl.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.exportDialog.options.sqlDdl.description")}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem value="sql_dml" id="database-export-sql-dml" />
              <div className="grid gap-1">
                <Label
                  htmlFor="database-export-sql-dml"
                  className="cursor-pointer"
                >
                  {t("connection.exportDialog.options.sqlDml.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.exportDialog.options.sqlDml.description")}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem
                value="sql_full"
                id="database-export-sql-full"
              />
              <div className="grid gap-1">
                <Label
                  htmlFor="database-export-sql-full"
                  className="cursor-pointer"
                >
                  {t("connection.exportDialog.options.sqlFull.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("connection.exportDialog.options.sqlFull.description")}
                </p>
              </div>
            </label>
          </RadioGroup>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={isExporting}
              onClick={() => void onConfirm()}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("connection.exportDialog.exporting")}
                </>
              ) : (
                t("connection.exportDialog.confirm")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
