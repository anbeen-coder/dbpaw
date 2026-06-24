import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  ElasticsearchBulkExportResult,
  ElasticsearchBulkImportResult,
  ElasticsearchConnectionInfo,
  ElasticsearchDocument,
  ElasticsearchIndexInfo,
  ElasticsearchIndexOperationResult,
  ElasticsearchMutationResult,
  ElasticsearchRawResponse,
  ElasticsearchSearchResponse,
} from "../types";

export const elasticsearchApi = {
  elasticsearch: {
    testConnection: (id: number) =>
      invoke<ElasticsearchConnectionInfo>(COMMANDS.ELASTICSEARCH_TEST_CONNECTION, {
        id,
      }),
    listIndices: (id: number) =>
      invoke<ElasticsearchIndexInfo[]>(COMMANDS.ELASTICSEARCH_LIST_INDICES, { id }),
    getIndexMapping: (id: number, index: string) =>
      invoke<any>(COMMANDS.ELASTICSEARCH_GET_INDEX_MAPPING, { id, index }),
    createIndex: (params: { id: number; index: string; body?: any }) =>
      invoke<ElasticsearchIndexOperationResult>(
        COMMANDS.ELASTICSEARCH_CREATE_INDEX,
        params,
      ),
    deleteIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>(COMMANDS.ELASTICSEARCH_DELETE_INDEX, {
        id,
        index,
      }),
    refreshIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>(COMMANDS.ELASTICSEARCH_REFRESH_INDEX, {
        id,
        index,
      }),
    openIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>(COMMANDS.ELASTICSEARCH_OPEN_INDEX, {
        id,
        index,
      }),
    closeIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>(COMMANDS.ELASTICSEARCH_CLOSE_INDEX, {
        id,
        index,
      }),
    searchDocuments: (params: {
      id: number;
      index: string;
      query?: string;
      dsl?: string;
      from: number;
      size: number;
    }) =>
      invoke<ElasticsearchSearchResponse>(
        COMMANDS.ELASTICSEARCH_SEARCH_DOCUMENTS,
        params,
      ),
    getDocument: (id: number, index: string, documentId: string) =>
      invoke<ElasticsearchDocument>(COMMANDS.ELASTICSEARCH_GET_DOCUMENT, {
        id,
        index,
        documentId,
      }),
    upsertDocument: (params: {
      id: number;
      index: string;
      documentId?: string;
      source: any;
      refresh?: boolean;
    }) =>
      invoke<ElasticsearchMutationResult>(
        COMMANDS.ELASTICSEARCH_UPSERT_DOCUMENT,
        params,
      ),
    deleteDocument: (params: {
      id: number;
      index: string;
      documentId: string;
      refresh?: boolean;
    }) =>
      invoke<ElasticsearchMutationResult>(
        COMMANDS.ELASTICSEARCH_DELETE_DOCUMENT,
        params,
      ),
    exportDocuments: (params: {
      id: number;
      index: string;
      query?: string;
      dsl?: string;
      filePath: string;
      batchSize?: number;
    }) =>
      invoke<ElasticsearchBulkExportResult>(
        COMMANDS.ELASTICSEARCH_EXPORT_DOCUMENTS,
        params,
      ),
    importDocuments: (params: {
      id: number;
      index: string;
      filePath: string;
      batchSize?: number;
      refresh?: boolean;
    }) =>
      invoke<ElasticsearchBulkImportResult>(
        COMMANDS.ELASTICSEARCH_IMPORT_DOCUMENTS,
        params,
      ),
    executeRaw: (params: {
      id: number;
      method: string;
      path: string;
      body?: string;
    }) => invoke<ElasticsearchRawResponse>(COMMANDS.ELASTICSEARCH_EXECUTE_RAW, params),
  },
};
