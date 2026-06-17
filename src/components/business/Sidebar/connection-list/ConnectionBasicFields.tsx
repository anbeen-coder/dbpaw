import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requiresPasswordOnCreate,
  requiresUsername,
} from "@/lib/connection-form/rules";
import type { ConnectionForm } from "@/services/api";
import { ElasticsearchFormSection } from "./ElasticsearchFormSection";
import { MongoDbFormSection } from "./MongoDbFormSection";
import { MssqlFormSection } from "./MssqlFormSection";
import { RedisFormSection } from "./RedisFormSection";

interface ConnectionBasicFieldsProps {
  form: ConnectionForm;
  setForm: Dispatch<SetStateAction<ConnectionForm>>;
  dialogMode: "create" | "edit";
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  database: string;
  onDatabaseChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  username: string;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  password: string;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  schema: string;
  onSchemaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showUsername: boolean;
  showPassword: boolean;
  showDatabase: boolean;
  showSchema: boolean;
  isRedis: boolean;
  isElasticsearch: boolean;
  isMssql: boolean;
}

export function ConnectionBasicFields({
  form,
  setForm,
  dialogMode,
  name,
  onNameChange,
  database,
  onDatabaseChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  schema,
  onSchemaChange,
  showUsername,
  showPassword,
  showDatabase,
  showSchema,
  isRedis,
  isElasticsearch,
  isMssql,
}: ConnectionBasicFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="name">
          {t("connection.dialog.fields.connectionName")}
        </Label>
        <Input id="name" value={name || ""} onChange={onNameChange} />
      </div>

      {isRedis && <RedisFormSection form={form} setForm={setForm} />}

      {isElasticsearch && (
        <ElasticsearchFormSection
          form={form}
          setForm={setForm}
          dialogMode={dialogMode}
        />
      )}

      {form.driver === "mongodb" && (
        <MongoDbFormSection form={form} setForm={setForm} />
      )}

      {isMssql && (
        <MssqlFormSection
          form={form}
          setForm={setForm}
          dialogMode={dialogMode}
        />
      )}

      {(showUsername || showPassword) && !isElasticsearch && !isMssql && (
        <div className="grid gap-2 sm:grid-cols-2">
          {showUsername ? (
            <div className="grid gap-2">
              <Label htmlFor="username">
                {t("connection.dialog.fields.username")}{" "}
                {requiresUsername(form.driver) ? (
                  <span className="text-red-600">*</span>
                ) : null}
              </Label>
              <Input
                id="username"
                value={username || ""}
                onChange={onUsernameChange}
              />
            </div>
          ) : null}
          {showPassword ? (
            <div className="grid gap-2">
              <Label htmlFor="password">
                {t("connection.dialog.fields.password")}{" "}
                {dialogMode === "create" &&
                requiresPasswordOnCreate(form.driver) ? (
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
          ) : null}
        </div>
      )}

      {(showDatabase || showSchema) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {showDatabase ? (
            <div className="grid gap-2">
              <Label htmlFor="database">
                {t("connection.dialog.fields.database")}
              </Label>
              <Input
                id="database"
                value={database || ""}
                onChange={onDatabaseChange}
              />
            </div>
          ) : null}
          {showSchema ? (
            <div className="grid gap-2">
              <Label htmlFor="schema">
                {t("connection.dialog.fields.schema")}
              </Label>
              <Input
                id="schema"
                value={schema || ""}
                onChange={onSchemaChange}
              />
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
