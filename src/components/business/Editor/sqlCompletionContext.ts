import type { Completion, CompletionResult } from "@codemirror/autocomplete";
import type { SchemaOverview } from "@/services/api";

const MYSQL_FAMILY_DRIVERS = new Set(["mysql", "mariadb", "tidb", "starrocks", "doris"]);

type SqlCompletionClause = "table" | "column" | null;

type SqlCompletionContextInfo = {
  clause: SqlCompletionClause;
  from: number;
};

type ReferencedTable = {
  database?: string;
  schema?: string;
  name: string;
  alias?: string;
  order: number;
};

const TABLE_CLAUSES = [
  "LEFT OUTER JOIN",
  "RIGHT OUTER JOIN",
  "FULL OUTER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "FULL JOIN",
  "CROSS JOIN",
  "STRAIGHT_JOIN",
  "UPDATE",
  "JOIN",
  "FROM",
  "INTO",
] as const;

const COLUMN_CLAUSES = [
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "WHERE",
  "SELECT",
  "ON",
] as const;

const CLAUSE_PATTERNS = [...TABLE_CLAUSES, ...COLUMN_CLAUSES].map((clause) => ({
  clause,
  regex: new RegExp(`\\b${clause.replace(/\s+/g, "\\s+")}\\b`, "gi"),
}));

const ALIAS_EXCLUDED_KEYWORDS = [
  "FROM", "JOIN", "LEFT", "RIGHT", "FULL", "INNER", "CROSS", "OUTER",
  "WHERE", "ON", "GROUP", "ORDER", "HAVING", "SELECT", "INTO", "UPDATE", "AS"
].join("|");

const TABLE_REFERENCE_REGEX = new RegExp(
  `\\b(?:FROM|(?:LEFT|RIGHT|FULL|INNER|CROSS)(?:\\s+OUTER)?\\s+JOIN|JOIN)\\s+([A-Za-z_][\\w$]*)(?:\\.([A-Za-z_][\\w$]*))?(?:\\s+(?:AS\\s+)?(?!${ALIAS_EXCLUDED_KEYWORDS}\\b)([A-Za-z_][\\w$]*))?`,
  "gi"
);

const RESERVED_ALIAS_KEYWORDS = new Set(
  [
    ...TABLE_CLAUSES,
    ...COLUMN_CLAUSES,
    "LEFT",
    "RIGHT",
    "FULL",
    "INNER",
    "OUTER",
    "CROSS",
    "AS",
  ].map((keyword) => keyword.toUpperCase()),
);

function getIdentifierStart(textBeforeCursor: string): number {
  let index = textBeforeCursor.length;
  while (index > 0 && /[\w$]/.test(textBeforeCursor[index - 1])) {
    index -= 1;
  }
  return index;
}

function mapClauseToKind(clause: string): SqlCompletionClause {
  if (TABLE_CLAUSES.includes(clause as (typeof TABLE_CLAUSES)[number])) {
    return "table";
  }
  if (COLUMN_CLAUSES.includes(clause as (typeof COLUMN_CLAUSES)[number])) {
    return "column";
  }
  return null;
}

function resolveReferencedTable(
  schemaOverview: SchemaOverview,
  rawTableName: string,
  rawQualifiedName?: string,
  availableDatabases?: string[],
): { schema?: string; name: string; database?: string } | null {
  if (rawQualifiedName) {
    const qualifiedMatch = schemaOverview.tables.find(
      (table) =>
        table.schema.toLowerCase() === rawTableName.toLowerCase() &&
        table.name.toLowerCase() === rawQualifiedName.toLowerCase(),
    );
    if (qualifiedMatch) {
      return {
        schema: qualifiedMatch.schema || undefined,
        name: qualifiedMatch.name,
      };
    }
  }

  const bareMatch = schemaOverview.tables.find(
    (table) => table.name.toLowerCase() === rawTableName.toLowerCase(),
  );
  if (bareMatch) {
    return {
      schema: bareMatch.schema || undefined,
      name: bareMatch.name,
    };
  }

  if (
    rawQualifiedName &&
    availableDatabases?.some(
      (db) => db.toLowerCase() === rawTableName.toLowerCase(),
    )
  ) {
    return {
      database: rawTableName,
      name: rawQualifiedName,
    };
  }

  return null;
}

export function extractReferencedTables(
  textBeforeCursor: string,
  schemaOverview: SchemaOverview,
  availableDatabases?: string[],
): ReferencedTable[] {
  const referencedTables: ReferencedTable[] = [];
  const seen = new Set<string>();
  TABLE_REFERENCE_REGEX.lastIndex = 0;
  let match = TABLE_REFERENCE_REGEX.exec(textBeforeCursor);
  let order = 0;

  while (match) {
    const [, rawTableName, rawQualifiedName, rawAlias] = match;
    const resolved = resolveReferencedTable(
      schemaOverview,
      rawTableName,
      rawQualifiedName,
      availableDatabases,
    );

    if (resolved) {
      const key = `${resolved.schema || ""}.${resolved.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        const alias =
          rawAlias && !RESERVED_ALIAS_KEYWORDS.has(rawAlias.toUpperCase())
            ? rawAlias
            : undefined;
        referencedTables.push({
          ...(resolved.database && { database: resolved.database }),
          schema: resolved.schema,
          name: resolved.name,
          alias,
          order,
        });
        order += 1;
      }
    }

    match = TABLE_REFERENCE_REGEX.exec(textBeforeCursor);
  }

  return referencedTables;
}

export function detectSqlCompletionContext(
  textBeforeCursor: string,
  options?: { driver?: string; availableDatabases?: string[] },
): SqlCompletionContextInfo {
  const from = getIdentifierStart(textBeforeCursor);
  const prefix = textBeforeCursor.slice(from);
  const contextText = textBeforeCursor.slice(0, from);

  if (prefix.includes(".") || contextText.endsWith(".")) {
    const driver = options?.driver;
    const availableDatabases = options?.availableDatabases;
    if (driver && MYSQL_FAMILY_DRIVERS.has(driver) && availableDatabases?.length) {
      const fullText = textBeforeCursor;
      const dotIdx = fullText.lastIndexOf(".");
      if (dotIdx > 0) {
        let idEnd = dotIdx;
        while (idEnd > 0 && /[\w$]/.test(fullText[idEnd - 1])) idEnd--;
        const beforeDot = fullText.slice(idEnd, dotIdx);
        if (beforeDot) {
          const isDbRef = availableDatabases.some(
            (db) => db.toLowerCase() === beforeDot.toLowerCase(),
          );
          if (isDbRef) {
            return { clause: "table", from };
          }
        }
      }
    }
    return { clause: null, from };
  }

  const normalized = contextText.toUpperCase();
  let lastMatch:
    | {
        clause: string;
        index: number;
        text: string;
      }
    | undefined;

  for (const pattern of CLAUSE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match = pattern.regex.exec(normalized);
    while (match) {
      const index = match.index;
      if (!lastMatch || index >= lastMatch.index) {
        lastMatch = { clause: pattern.clause, index, text: match[0] };
      }
      match = pattern.regex.exec(normalized);
    }
  }

  if (lastMatch?.clause === "SELECT") {
    const trailingSegment = contextText.slice(
      lastMatch.index + lastMatch.text.length,
    );
    if (/[^\s,\w$"]/u.test(trailingSegment)) {
      return { clause: null, from };
    }
  }

  return {
    clause: lastMatch ? mapClauseToKind(lastMatch.clause) : null,
    from,
  };
}

function buildTableOptions(schemaOverview: SchemaOverview): Completion[] {
  const options: Completion[] = [];
  const seen = new Set<string>();

  for (const table of schemaOverview.tables) {
    const simpleKey = `table:${table.name}`;
    if (!seen.has(simpleKey)) {
      seen.add(simpleKey);
      options.push({
        label: table.name,
        type: "class",
        detail: table.schema || "table",
        boost: 0,
      });
    }

    if (table.schema) {
      const qualified = `${table.schema}.${table.name}`;
      const qualifiedKey = `table:${qualified}`;
      if (!seen.has(qualifiedKey)) {
        seen.add(qualifiedKey);
        options.push({
          label: qualified,
          type: "class",
          detail: table.schema,
          boost: 0,
        });
      }
    }
  }

  return options;
}

function buildColumnOptions(
  schemaOverview: SchemaOverview,
  referencedTables: ReferencedTable[],
): Completion[] {
  const options: Completion[] = [];
  const seen = new Set<string>();
  const priorityByTable = new Map<string, number>();

  referencedTables.forEach((table) => {
    priorityByTable.set(
      `${table.schema || ""}.${table.name}`.toLowerCase(),
      table.order,
    );
  });

  for (const table of schemaOverview.tables) {
    const tableKey = `${table.schema || ""}.${table.name}`.toLowerCase();
    const priority = priorityByTable.get(tableKey);
    const boost = priority === undefined ? -10 : 60 - priority * 10;

    for (const column of table.columns) {
      const key = `column:${column.name}:${table.schema}.${table.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        label: column.name,
        type: "property",
        detail: table.name,
        boost,
      });
    }
  }

  return options;
}

export function buildSqlContextualCompletion(params: {
  textBeforeCursor: string;
  explicit: boolean;
  schemaOverview?: SchemaOverview;
  availableDatabases?: string[];
  driver?: string;
}): CompletionResult | null {
  const { textBeforeCursor, explicit, schemaOverview, availableDatabases, driver } = params;
  if (!schemaOverview) return null;

  const context = detectSqlCompletionContext(textBeforeCursor, { driver, availableDatabases });
  if (!context.clause) return null;

  const prefix = textBeforeCursor.slice(context.from);
  const isEmptyPrefix = prefix.length === 0;
  if (isEmptyPrefix && !explicit && !/\s$/.test(textBeforeCursor) && !textBeforeCursor.endsWith(".")) {
    return null;
  }

  const options =
    context.clause === "table"
      ? buildTableOptions(schemaOverview)
      : buildColumnOptions(
          schemaOverview,
          extractReferencedTables(textBeforeCursor, schemaOverview, availableDatabases),
        );

  return {
    from: context.from,
    options,
    validFor: /^[\w$]*$/,
  };
}
