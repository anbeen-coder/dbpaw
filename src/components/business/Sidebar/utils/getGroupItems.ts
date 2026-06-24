import type { DatabaseGroupConfig } from "@/lib/tree-adapters/types";
import type { DatabaseInfo, SchemaInfo } from "../connection-list/types";

interface GetGroupItemsDeps {
  databaseEvents: Map<string, any[]>;
  databaseSequences: Map<string, any[]>;
  databaseTypes: Map<string, any[]>;
  databaseSynonyms: Map<string, any[]>;
  databasePackages: Map<string, any[]>;
}

export function getGroupItems(
  database: DatabaseInfo,
  group: DatabaseGroupConfig,
  dbKey: string,
  deps: GetGroupItemsDeps,
  schema?: SchemaInfo,
): { name: string; [key: string]: any }[] {
  switch (group.source) {
    case "tables": {
      const tables = schema ? schema.tables : database.tables || [];
      return group.sourceFilter
        ? tables.filter((t) => t.type === group.sourceFilter)
        : tables.filter((t) => t.type === "table" || t.type === "BASE TABLE");
    }
    case "routines": {
      if (schema) {
        const routines =
          group.sourceFilter === "procedure"
            ? schema.procedures
            : schema.functions;
        return routines;
      }
      const routines = database.routines || [];
      return group.sourceFilter
        ? routines.filter((r) => r.type === group.sourceFilter)
        : routines;
    }
    case "events":
      return deps.databaseEvents.get(dbKey) || [];
    case "sequences":
      return deps.databaseSequences.get(dbKey) || [];
    case "types":
      return deps.databaseTypes.get(dbKey) || [];
    case "synonyms":
      return deps.databaseSynonyms.get(dbKey) || [];
    case "packages":
      return deps.databasePackages.get(dbKey) || [];
    default:
      return [];
  }
}
