import { Button } from "@/components/ui/button";
import { Settings, Sparkles } from "lucide-react";
import { SqlExecutionLogsDropdown } from "@/components/business/SqlLogs/SqlExecutionLogsDialog";
import { useTranslation } from "react-i18next";

interface WindowActionsProps {
  aiVisible: boolean;
  onToggleAi: () => void;
  onOpenSettings: () => void;
}

export function WindowActions({
  aiVisible,
  onToggleAi,
  onOpenSettings,
}: WindowActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onOpenSettings}
        title={t("app.window.settingsTooltip")}
        aria-label={t("app.window.openSettings")}
      >
        <Settings className="w-4 h-4" />
      </Button>
      <SqlExecutionLogsDropdown />
      <Button
        variant={aiVisible ? "default" : "ghost"}
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onToggleAi}
        title={
          aiVisible ? t("app.window.hideAiPanel") : t("app.window.showAiPanel")
        }
        aria-label={
          aiVisible
            ? t("app.window.hideAiPanelAria")
            : t("app.window.showAiPanelAria")
        }
      >
        <Sparkles className="w-4 h-4" />
      </Button>
    </>
  );
}
