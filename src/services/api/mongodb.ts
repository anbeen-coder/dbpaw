import { invoke } from "./core";
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
      invoke<MongodbConnectionInfo>("mongodb_test_connection", { id }),
    testConnectionEphemeral: (form: ConnectionForm) =>
      invoke<TestConnectionResult>("mongodb_test_connection_ephemeral", {
        form,
      }),
    listDatabases: (id: number) =>
      invoke<MongodbDatabaseInfo[]>("mongodb_list_databases", { id }),
    listCollections: (id: number, database: string) =>
      invoke<MongodbCollectionInfo[]>("mongodb_list_collections", {
        id,
        database,
      }),
  },
};
