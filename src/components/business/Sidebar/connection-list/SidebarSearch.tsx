import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface SidebarSearchProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export function SidebarSearch({ searchTerm, onSearchTermChange }: SidebarSearchProps) {
  const { t } = useTranslation();

  return (
    <div className="p-2 border-b border-border">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("connection.searchTables")}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
}
