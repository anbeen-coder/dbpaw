import type { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateDatabaseForm } from "./types";
import {
  postgresEncodingOptions,
  postgresLocaleOptions,
  mssqlCollationOptions,
  createDbNoneOption,
} from "../hooks/useCreateDatabase";

interface CreateDatabaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  form: CreateDatabaseForm;
  setForm: Dispatch<SetStateAction<CreateDatabaseForm>>;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean | ((prev: boolean) => boolean)) => void;
  validationMsg: string | null;
  isCreating: boolean;
  mysqlCharsets: string[];
  mysqlCollations: string[];
  loadingMysqlOptions: boolean;
  isMySqlFamily: boolean;
  isPostgres: boolean;
  isMssql: boolean;
  onCreate: () => void;
}

export function CreateDatabaseDialog({
  isOpen,
  onClose,
  form,
  setForm,
  showAdvanced,
  setShowAdvanced,
  validationMsg,
  isCreating,
  mysqlCharsets,
  mysqlCollations,
  loadingMysqlOptions,
  isMySqlFamily,
  isPostgres,
  isMssql,
  onCreate,
}: CreateDatabaseDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("connection.createDbDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="create-db-name">
              {t("connection.createDbDialog.fields.name")}{" "}
              <span className="text-red-600">*</span>
            </Label>
            <Input
              id="create-db-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("connection.createDbDialog.placeholders.name")}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-db-if-not-exists"
              checked={form.ifNotExists}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  ifNotExists: checked === true,
                }))
              }
            />
            <Label htmlFor="create-db-if-not-exists">
              {t("connection.createDbDialog.fields.ifNotExists")}
            </Label>
          </div>
          <div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-0"
              onClick={() => setShowAdvanced((prev: boolean) => !prev)}
            >
              {showAdvanced
                ? t("connection.createDbDialog.hideAdvanced")
                : t("connection.createDbDialog.showAdvanced")}
            </Button>
          </div>
          {showAdvanced && (
            <div className="border p-3 rounded-md space-y-3 bg-muted/20">
              {isMySqlFamily && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="create-db-charset">
                      {t("connection.createDbDialog.fields.charset")}
                    </Label>
                    <Select
                      value={form.charset || createDbNoneOption}
                      disabled={loadingMysqlOptions}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          charset: v === createDbNoneOption ? "" : v,
                          collation: "",
                        }))
                      }
                    >
                      <SelectTrigger id="create-db-charset">
                        <SelectValue
                          placeholder={
                            loadingMysqlOptions
                              ? t("common.loading")
                              : t(
                                  "connection.createDbDialog.placeholders.charset",
                                )
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={createDbNoneOption}>
                          {t("connection.createDbDialog.defaultOption")}
                        </SelectItem>
                        {mysqlCharsets.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-db-collation">
                      {t("connection.createDbDialog.fields.collation")}
                    </Label>
                    <Select
                      value={form.collation || createDbNoneOption}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          collation: v === createDbNoneOption ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger id="create-db-collation">
                        <SelectValue
                          placeholder={t(
                            "connection.createDbDialog.placeholders.collation",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={createDbNoneOption}>
                          {t("connection.createDbDialog.defaultOption")}
                        </SelectItem>
                        {mysqlCollations.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {isPostgres && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="create-db-encoding">
                      {t("connection.createDbDialog.fields.encoding")}
                    </Label>
                    <Select
                      value={form.encoding || createDbNoneOption}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          encoding: v === createDbNoneOption ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger id="create-db-encoding">
                        <SelectValue
                          placeholder={t(
                            "connection.createDbDialog.placeholders.encoding",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={createDbNoneOption}>
                          {t("connection.createDbDialog.defaultOption")}
                        </SelectItem>
                        {postgresEncodingOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-db-lc-collate">
                      {t("connection.createDbDialog.fields.lcCollate")}
                    </Label>
                    <Select
                      value={form.lcCollate || createDbNoneOption}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          lcCollate: v === createDbNoneOption ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger id="create-db-lc-collate">
                        <SelectValue
                          placeholder={t(
                            "connection.createDbDialog.placeholders.lcCollate",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={createDbNoneOption}>
                          {t("connection.createDbDialog.defaultOption")}
                        </SelectItem>
                        {postgresLocaleOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-db-lc-ctype">
                      {t("connection.createDbDialog.fields.lcCtype")}
                    </Label>
                    <Select
                      value={form.lcCtype || createDbNoneOption}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          lcCtype: v === createDbNoneOption ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger id="create-db-lc-ctype">
                        <SelectValue
                          placeholder={t(
                            "connection.createDbDialog.placeholders.lcCtype",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={createDbNoneOption}>
                          {t("connection.createDbDialog.defaultOption")}
                        </SelectItem>
                        {postgresLocaleOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {isMssql && (
                <div className="grid gap-2">
                  <Label htmlFor="create-db-collation">
                    {t("connection.createDbDialog.fields.collation")}
                  </Label>
                  <Select
                    value={form.collation || createDbNoneOption}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        collation: v === createDbNoneOption ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger id="create-db-collation">
                      <SelectValue
                        placeholder={t(
                          "connection.createDbDialog.placeholders.collation",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={createDbNoneOption}>
                        {t("connection.createDbDialog.defaultOption")}
                      </SelectItem>
                      {mssqlCollationOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          {validationMsg && (
            <Alert variant="destructive">
              <AlertTitle>
                {t("connection.dialog.validationFailed")}
              </AlertTitle>
              <AlertDescription>{validationMsg}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isCreating}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={isCreating}
              onClick={() => void onCreate()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("connection.createDbDialog.creating")}
                </>
              ) : (
                t("connection.createDbDialog.confirm")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
