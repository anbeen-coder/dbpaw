import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormField } from "@/lib/connection-form/use-form-field";
import type { ConnectionForm } from "@/services/api";

interface MongoDbFormSectionProps {
  form: ConnectionForm;
  setForm: Dispatch<SetStateAction<ConnectionForm>>;
}

export function MongoDbFormSection({ form, setForm }: MongoDbFormSectionProps) {
  const { t } = useTranslation();
  const [authSource, onAuthSourceChange] = useFormField(
    form,
    setForm,
    "authSource",
  );

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-2">
        <Label htmlFor="authSource">
          {t("connection.dialog.fields.authSource")}
        </Label>
        <Input
          id="authSource"
          placeholder={t("connection.dialog.placeholders.authSource")}
          value={authSource || ""}
          onChange={onAuthSourceChange}
        />
      </div>
    </div>
  );
}
