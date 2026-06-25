import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  ConnectionForm,
} from "../types";

export const mongodbApi = {
  mongodb: {
    testConnection: (id: number) =>
      invoke(COMMANDS.MONGODB_TEST_CONNECTION, { id }),
    testConnectionEphemeral: (form: ConnectionForm) =>
      invoke(COMMANDS.MONGODB_TEST_CONNECTION_EPHEMERAL, {
        form,
      }),
    listDatabases: (id: number) =>
      invoke(COMMANDS.MONGODB_LIST_DATABASES, { id }),
    listCollections: (id: number, database: string) =>
      invoke(COMMANDS.MONGODB_LIST_COLLECTIONS, {
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
    }) => invoke(COMMANDS.MONGODB_FIND_DOCUMENTS, params),
    getDocument: (params: {
      id: number;
      database: string;
      collection: string;
      documentId: string;
    }) => invoke(COMMANDS.MONGODB_GET_DOCUMENT, params),
    insertDocument: (params: {
      id: number;
      database: string;
      collection: string;
      document: Record<string, unknown>;
    }) => invoke(COMMANDS.MONGODB_INSERT_DOCUMENT, params),
    updateDocument: (params: {
      id: number;
      database: string;
      collection: string;
      documentId: string;
      update: Record<string, unknown>;
    }) => invoke(COMMANDS.MONGODB_UPDATE_DOCUMENT, params),
    deleteDocument: (params: {
      id: number;
      database: string;
      collection: string;
      documentId: string;
    }) => invoke(COMMANDS.MONGODB_DELETE_DOCUMENT, params),
  },
};
