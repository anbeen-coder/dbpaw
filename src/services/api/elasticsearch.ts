import { invoke } from "./core";
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
      invoke<ElasticsearchConnectionInfo>("elasticsearch_test_connection", {
        id,
      }),
    listIndices: (id: number) =>
      invoke<ElasticsearchIndexInfo[]>("elasticsearch_list_indices", { id }),
    getIndexMapping: (id: number, index: string) =>
      invoke<any>("elasticsearch_get_index_mapping", { id, index }),
    createIndex: (params: { id: number; index: string; body?: any }) =>
      invoke<ElasticsearchIndexOperationResult>(
        "elasticsearch_create_index",
        params,
      ),
    deleteIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>("elasticsearch_delete_index", {
        id,
        index,
      }),
    refreshIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>("elasticsearch_refresh_index", {
        id,
        index,
      }),
    openIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>("elasticsearch_open_index", {
        id,
        index,
      }),
    closeIndex: (id: number, index: string) =>
      invoke<ElasticsearchIndexOperationResult>("elasticsearch_close_index", {
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
        "elasticsearch_search_documents",
        params,
      ),
    getDocument: (id: number, index: string, documentId: string) =>
      invoke<ElasticsearchDocument>("elasticsearch_get_document", {
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
        "elasticsearch_upsert_document",
        params,
      ),
    deleteDocument: (params: {
      id: number;
      index: string;
      documentId: string;
      refresh?: boolean;
    }) =>
      invoke<ElasticsearchMutationResult>(
        "elasticsearch_delete_document",
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
        "elasticsearch_export_documents",
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
        "elasticsearch_import_documents",
        params,
      ),
    executeRaw: (params: {
      id: number;
      method: string;
      path: string;
      body?: string;
    }) => invoke<ElasticsearchRawResponse>("elasticsearch_execute_raw", params),
  },
};
