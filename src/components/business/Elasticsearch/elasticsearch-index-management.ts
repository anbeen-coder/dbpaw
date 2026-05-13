import { api } from "@/services/api";
import type { ElasticsearchField } from "./types";

export type ElasticsearchIndexAction = "refresh" | "open" | "close" | "delete";

export const DEFAULT_ELASTICSEARCH_INDEX_BODY =
  '{\n  "settings": {},\n  "mappings": {}\n}';

export function parseElasticsearchIndexBody(raw: string): {
  body?: unknown;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  try {
    const body = JSON.parse(trimmed);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: "Index body must be a JSON object." };
    }
    return { body };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function elasticsearchIndexActionSuccessMessage(
  action: ElasticsearchIndexAction,
  index: string,
) {
  return action === "delete"
    ? `Index deleted · ${index}`
    : `Index ${action} complete · ${index}`;
}

export async function executeElasticsearchIndexAction(
  connectionId: number,
  index: string,
  action: ElasticsearchIndexAction,
) {
  if (action === "refresh") {
    await api.elasticsearch.refreshIndex(connectionId, index);
  } else if (action === "open") {
    await api.elasticsearch.openIndex(connectionId, index);
  } else if (action === "close") {
    await api.elasticsearch.closeIndex(connectionId, index);
  } else {
    await api.elasticsearch.deleteIndex(connectionId, index);
  }
}

function extractFieldsFromMapping(
  mapping: Record<string, unknown>,
  prefix = "",
): ElasticsearchField[] {
  const fields: ElasticsearchField[] = [];

  for (const [key, value] of Object.entries(mapping)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const valueObj = value as Record<string, unknown>;

      if (valueObj.type && typeof valueObj.type === "string") {
        fields.push({
          name: fullPath,
          type: valueObj.type,
          path: fullPath,
        });
      }

      if (valueObj.properties && typeof valueObj.properties === "object") {
        fields.push(
          ...extractFieldsFromMapping(
            valueObj.properties as Record<string, unknown>,
            fullPath,
          ),
        );
      }

      if (valueObj.fields && typeof valueObj.fields === "object") {
        fields.push(
          ...extractFieldsFromMapping(
            valueObj.fields as Record<string, unknown>,
            fullPath,
          ),
        );
      }
    }
  }

  return fields;
}

export function extractFieldsFromIndexMapping(
  mapping: unknown,
): ElasticsearchField[] {
  if (!mapping || typeof mapping !== "object") {
    return [];
  }

  const mappingObj = mapping as Record<string, unknown>;
  const indexName = Object.keys(mappingObj)[0];

  if (!indexName || typeof mappingObj[indexName] !== "object") {
    return [];
  }

  const indexMapping = mappingObj[indexName] as Record<string, unknown>;
  const mappings = indexMapping.mappings as Record<string, unknown> | undefined;

  if (!mappings || typeof mappings !== "object") {
    return [];
  }

  const properties = mappings.properties as Record<string, unknown> | undefined;

  if (!properties || typeof properties !== "object") {
    return [];
  }

  return extractFieldsFromMapping(properties);
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

export function bulkDefaultName(index: string): string {
  const safe = index.replace(/[^a-zA-Z0-9._-]+/g, "_") || "elasticsearch";
  return `${safe}.ndjson`;
}
