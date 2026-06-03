import { Loader2 } from "lucide-react";
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
import { useTranslation } from "react-i18next";

interface ImportConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
  databaseName?: string;
  filePath?: string;
}

export function ImportConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  isImporting,
  databaseName,
  filePath,
}: ImportConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("connection.importDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("connection.importDialog.description", {
              database: databaseName || "",
            })}
          </AlertDialogDescription>
          <div className="text-xs text-muted-foreground font-mono break-all mt-2">
            {filePath || ""}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isImporting}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isImporting}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
            }}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("connection.importDialog.importing")}
              </>
            ) : (
              t("connection.importDialog.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
