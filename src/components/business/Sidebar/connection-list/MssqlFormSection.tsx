import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormField } from "@/lib/connection-form/use-form-field";
import type { ConnectionForm } from "@/services/api";

interface MssqlFormSectionProps {
  form: ConnectionForm;
  setForm: Dispatch<SetStateAction<ConnectionForm>>;
  dialogMode: "create" | "edit";
}

export function MssqlFormSection({
  form,
  setForm,
  dialogMode,
}: MssqlFormSectionProps) {
  const { t } = useTranslation();
  const [username, onUsernameChange] = useFormField(form, setForm, "username");
  const [password, onPasswordChange] = useFormField(form, setForm, "password");

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-2">
        <Label htmlFor="authMode">
          {t("connection.dialog.fields.authMode")}
        </Label>
        <Select
          value={form.authMode || "sql_server"}
          onValueChange={(
            value:
              | "sql_server"
              | "windows"
              | "integrated"
              | "aad_token",
          ) =>
            setForm((current) => ({
              ...current,
              authMode: value,
              username:
                value === "integrated" || value === "aad_token"
                  ? ""
                  : current.username,
              password: value === "integrated" ? "" : current.password,
            }))
          }
        >
          <SelectTrigger id="authMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sql_server">
              {t("connection.dialog.authMode.sqlServer")}
            </SelectItem>
            <SelectItem value="windows">
              {t("connection.dialog.authMode.windows")}
            </SelectItem>
            <SelectItem value="integrated">
              {t("connection.dialog.authMode.integrated")}
            </SelectItem>
            <SelectItem value="aad_token">
              {t("connection.dialog.authMode.aadToken")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(form.authMode === "sql_server" || form.authMode === "windows") && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="username">
              {t("connection.dialog.fields.username")}{" "}
              <span className="text-red-600">*</span>
            </Label>
            <Input
              id="username"
              value={username || ""}
              onChange={onUsernameChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">
              {t("connection.dialog.fields.password")}{" "}
              {dialogMode === "create" ? (
                <span className="text-red-600">*</span>
              ) : null}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={
                dialogMode === "edit"
                  ? t("connection.dialog.placeholders.keepPassword")
                  : undefined
              }
              value={password || ""}
              onChange={onPasswordChange}
            />
          </div>
        </div>
      )}
      {form.authMode === "aad_token" && (
        <div className="grid gap-2">
          <Label htmlFor="password">
            {t("connection.dialog.fields.aadToken")}{" "}
            {dialogMode === "create" ? (
              <span className="text-red-600">*</span>
            ) : null}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={
              dialogMode === "edit"
                ? t("connection.dialog.placeholders.keepPassword")
                : undefined
            }
            value={password || ""}
            onChange={onPasswordChange}
          />
        </div>
      )}
    </div>
  );
}
