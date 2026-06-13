import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface ConnectionDialogTestMessage {
  ok: boolean;
  text: string;
  latency?: number;
}

interface ConnectionDialogFooterProps {
  dialogMode: "create" | "edit";
  isCreateTypeStep: boolean;
  requiredOk: boolean;
  isTesting: boolean;
  isConnecting: boolean;
  isSavingEdit: boolean;
  validationMsg: string | null;
  testMsg: ConnectionDialogTestMessage | null;
  onClose: () => void;
  onTestConnection: () => void;
}

export function ConnectionDialogFooter({
  dialogMode,
  isCreateTypeStep,
  requiredOk,
  isTesting,
  isConnecting,
  isSavingEdit,
  validationMsg,
  testMsg,
  onClose,
  onTestConnection,
}: ConnectionDialogFooterProps) {
  const { t } = useTranslation();

  return (
    <>
      {isCreateTypeStep ? (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("connection.dialog.testing")}
              </>
            ) : (
              t("connection.dialog.test")
            )}
          </Button>
          <Button
            type="submit"
            disabled={
              (dialogMode === "edit" ? isSavingEdit : isConnecting) ||
              !requiredOk
            }
          >
            {dialogMode === "edit" ? (
              isSavingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("connection.dialog.saving")}
                </>
              ) : (
                t("common.save")
              )
            ) : isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("connection.dialog.connecting")}
              </>
            ) : (
              t("connection.dialog.connect")
            )}
          </Button>
        </div>
      )}

      {validationMsg ? (
        <div className="mt-3">
          <Alert variant="destructive">
            <AlertTitle>
              {t("connection.dialog.validationFailed")}
            </AlertTitle>
            <AlertDescription>{validationMsg}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      {testMsg && !isCreateTypeStep ? (
        <div className="mt-3">
          <Alert variant={testMsg.ok ? "default" : "destructive"}>
            <AlertTitle>
              {testMsg.ok
                ? t("connection.dialog.testSuccess")
                : t("connection.dialog.testFailed")}
            </AlertTitle>
            <AlertDescription>
              {testMsg.text}
              {testMsg.latency ? `(${testMsg.latency}ms)` : ""}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </>
  );
}
