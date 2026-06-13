import type { Dispatch, SetStateAction } from "react";
import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ConnectionForm } from "@/services/api";

interface ConnectionSecurityFieldsProps {
  form: ConnectionForm;
  setForm: Dispatch<SetStateAction<ConnectionForm>>;
  showSsl: boolean;
  showSsh: boolean;
  supportsSslCa: boolean;
  hasElasticCloudId: boolean;
  sslCaCert: string;
  onSslCaCertChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sshHost: string;
  onSshHostChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sshPort: number | undefined;
  onSshPortChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sshUsername: string;
  onSshUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sshPassword: string;
  onSshPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sshKeyPath: string;
  onSshKeyPathChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPickSslCaCertFile: () => void;
  onPickSshKeyFile: () => void;
}

export function ConnectionSecurityFields({
  form,
  setForm,
  showSsl,
  showSsh,
  supportsSslCa,
  hasElasticCloudId,
  sslCaCert,
  onSslCaCertChange,
  sshHost,
  onSshHostChange,
  sshPort,
  onSshPortChange,
  sshUsername,
  onSshUsernameChange,
  sshPassword,
  onSshPasswordChange,
  sshKeyPath,
  onSshKeyPathChange,
  onPickSslCaCertFile,
  onPickSshKeyFile,
}: ConnectionSecurityFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      {showSsl && !hasElasticCloudId ? (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ssl"
              checked={form.ssl}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  ssl: checked === true,
                }))
              }
            />
            <Label htmlFor="ssl">{t("connection.dialog.fields.ssl")}</Label>
          </div>
          {form.ssl && supportsSslCa ? (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="grid gap-2">
                <Label htmlFor="sslMode">
                  {t("connection.dialog.fields.sslMode")}
                </Label>
                <Select
                  value={form.sslMode || "require"}
                  onValueChange={(value: "require" | "verify_ca") =>
                    setForm((current) => ({
                      ...current,
                      sslMode: value,
                    }))
                  }
                >
                  <SelectTrigger id="sslMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="require">
                      {t("connection.dialog.sslMode.require")}
                    </SelectItem>
                    <SelectItem value="verify_ca">
                      {t("connection.dialog.sslMode.verifyCa")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.sslMode === "verify_ca" ? (
                <div className="grid gap-2">
                  <Label htmlFor="sslCaCert">
                    {t("connection.dialog.fields.sslCaCert")}{" "}
                    <span className="text-red-600">*</span>
                  </Label>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onPickSslCaCertFile}
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      {t("connection.dialog.browse")}
                    </Button>
                  </div>
                  <Textarea
                    id="sslCaCert"
                    rows={5}
                    placeholder={t(
                      "connection.dialog.placeholders.sslCaCert",
                    )}
                    value={sslCaCert || ""}
                    onChange={onSslCaCertChange}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {showSsh ? (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ssh"
              checked={form.sshEnabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  sshEnabled: checked === true,
                }))
              }
            />
            <Label htmlFor="ssh">{t("connection.dialog.fields.ssh")}</Label>
          </div>
          {form.sshEnabled ? (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sshHost">
                    {t("connection.dialog.fields.sshHost")}
                  </Label>
                  <Input
                    id="sshHost"
                    placeholder={t(
                      "connection.dialog.placeholders.sshHost",
                    )}
                    value={sshHost || ""}
                    onChange={onSshHostChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sshPort">
                    {t("connection.dialog.fields.sshPort")}
                  </Label>
                  <Input
                    id="sshPort"
                    placeholder={t(
                      "connection.dialog.placeholders.sshPort",
                    )}
                    value={String(sshPort || "")}
                    onChange={onSshPortChange}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sshUsername">
                  {t("connection.dialog.fields.sshUsername")}
                </Label>
                <Input
                  id="sshUsername"
                  placeholder={t(
                    "connection.dialog.placeholders.sshUsername",
                  )}
                  value={sshUsername || ""}
                  onChange={onSshUsernameChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sshPassword">
                  {t("connection.dialog.fields.sshPassword")}
                </Label>
                <Input
                  id="sshPassword"
                  type="password"
                  placeholder={t(
                    "connection.dialog.placeholders.sshPassword",
                  )}
                  value={sshPassword || ""}
                  onChange={onSshPasswordChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sshKeyPath">
                  {t("connection.dialog.fields.sshKeyPath")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="sshKeyPath"
                    placeholder={t(
                      "connection.dialog.placeholders.sshKeyPath",
                    )}
                    value={sshKeyPath || ""}
                    onChange={onSshKeyPathChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onPickSshKeyFile}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {t("connection.dialog.browse")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
