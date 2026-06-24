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
  },
};
