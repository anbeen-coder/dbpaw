import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  MongodbCollectionInfo,
  MongodbConnectionInfo,
  MongodbDatabaseInfo,
  ConnectionForm,
  TestConnectionResult,
} from "../types";

export const mongodbApi = {
  mongodb: {
    testConnection: (id: number) =>
      invoke<MongodbConnectionInfo>(COMMANDS.MONGODB_TEST_CONNECTION, { id }),
    testConnectionEphemeral: (form: ConnectionForm) =>
      invoke<TestConnectionResult>(COMMANDS.MONGODB_TEST_CONNECTION_EPHEMERAL, {
        form,
      }),
    listDatabases: (id: number) =>
      invoke<MongodbDatabaseInfo[]>(COMMANDS.MONGODB_LIST_DATABASES, { id }),
    listCollections: (id: number, database: string) =>
      invoke<MongodbCollectionInfo[]>(COMMANDS.MONGODB_LIST_COLLECTIONS, {
        id,
        database,
      }),
    findDocuments: (params: {
      id: number;
      database: string;
      collection: string;
      filter?: string;
      page?: number;
      pageSize?: number;
    }) =>
      invoke<{
        documents: Record<string, unknown>[];
        total: number;
        page: number;
        pageSize: number;
      }>(COMMANDS.MONGODB_FIND_DOCUMENTS, params),
    getDocument: (params: {
      id: number;
      database: string;
      collection: string;
      documentId: string;
    }) => invoke<Record<string, unknown>>(COMMANDS.MONGODB_GET_DOCUMENT, params),
    insertDocument: (params: {
      id: number;
      database: string;
      collection: string;
      document: Record<string, unknown>;
    }) =>
      invoke<{ success: boolean; insertedId: string }>(
        COMMANDS.MONGODB_INSERT_DOCUMENT,
        params,
      ),
    updateDocument: (params: {
      id: number;
      database: string;
      collection: string;
      documentId: string;
      update: Record<string, unknown>;
    }) =>
      invoke<{ success: boolean; modifiedCount: number }>(
        COMMANDS.MONGODB_UPDATE_DOCUMENT,
        params,
      ),
    deleteDocument: (params: {
      id: number;
      database: string;
      collection: string;
      documentId: string;
    }) =>
      invoke<{ success: boolean; deletedCount: number }>(
        COMMANDS.MONGODB_DELETE_DOCUMENT,
        params,
      ),
  },
};
