import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PendingSqlRiskConfirmation } from "./hooks/useSqlRiskConfirmation";

interface SqlRiskConfirmDialogProps {
  pending: PendingSqlRiskConfirmation | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SqlRiskConfirmDialog({
  pending,
  onCancel,
  onConfirm,
}: SqlRiskConfirmDialogProps) {
  const { t } = useTranslation();
  const snapshot = pending?.snapshot;

  return (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {pending
              ? t(`sqlEditor.risk.title.${pending.analysis.risk}`)
              : t("sqlEditor.risk.title.unknown")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("sqlEditor.risk.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {pending && snapshot && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <div>
                {t("sqlEditor.risk.connection", {
                  id: snapshot.context.connectionId,
                })}
              </div>
              <div>
                {t("sqlEditor.risk.database", {
                  database:
                    snapshot.context.database ||
                    t("sqlEditor.risk.notSelected"),
                })}
              </div>
              <div>
                {t("sqlEditor.risk.schema", {
                  schema:
                    snapshot.context.schema || t("sqlEditor.risk.notSelected"),
                })}
              </div>
              <div>
                {t("sqlEditor.risk.statementCount", {
                  count: pending.analysis.statementCount,
                })}
              </div>
            </div>

            <ul className="list-disc space-y-1 pl-5 text-amber-700 dark:text-amber-300">
              {pending.analysis.reasons.map((reason) => (
                <li key={reason}>{t(`sqlEditor.risk.reason.${reason}`)}</li>
              ))}
            </ul>

            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs">
              {snapshot.sql}
            </pre>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {t("sqlEditor.risk.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
