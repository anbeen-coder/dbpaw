import { COMMANDS } from "../commands";
import type { CommandMap, CommandArgs, CommandReturn } from "../commands";

type MongodbCommand = Extract<keyof CommandMap,
  | "mongodb_test_connection"
  | "mongodb_test_connection_ephemeral"
  | "mongodb_list_databases"
  | "mongodb_list_collections"
  | "mongodb_find_documents"
  | "mongodb_insert_document"
  | "mongodb_delete_document"
  | "mongodb_update_document"
  | "mongodb_get_document"
>;

export function handleMongodb<T extends MongodbCommand>(
  cmd: T,
  args: CommandArgs<T>,
): Promise<CommandReturn<T>> | null {
  switch (cmd) {
    case COMMANDS.MONGODB_TEST_CONNECTION:
      return Promise.resolve({
        version: "7.0.4",
        nodeCount: 3,
      }) as Promise<CommandReturn<T>>;

    case COMMANDS.MONGODB_TEST_CONNECTION_EPHEMERAL:
      return Promise.resolve({
        success: true,
        message: "Connected to MongoDB 7.0.4",
        latencyMs: 8,
      }) as Promise<CommandReturn<T>>;

    case COMMANDS.MONGODB_LIST_DATABASES:
      return Promise.resolve([
        { name: "admin", sizeOnDisk: 4096, empty: false },
        { name: "testdb", sizeOnDisk: 8192, empty: false },
        { name: "local", sizeOnDisk: 4096, empty: false },
      ]) as Promise<CommandReturn<T>>;

    case COMMANDS.MONGODB_LIST_COLLECTIONS: {
      const a = args as CommandArgs<"mongodb_list_collections">;
      return Promise.resolve([
        { name: "users", database: a.database || "testdb", documentCount: 150, size: 4096 },
        { name: "orders", database: a.database || "testdb", documentCount: 512, size: 12288 },
        { name: "products", database: a.database || "testdb", documentCount: 80, size: 2048 },
      ]) as Promise<CommandReturn<T>>;
    }

    case COMMANDS.MONGODB_FIND_DOCUMENTS:
      return Promise.resolve({
        documents: [
          { _id: "507f1f77bcf86cd799439011", name: "Alice", email: "alice@example.com", age: 30 },
          { _id: "507f1f77bcf86cd799439012", name: "Bob", email: "bob@example.com", age: 25 },
          { _id: "507f1f77bcf86cd799439013", name: "Charlie", email: "charlie@example.com", age: 35 },
        ],
        total: 3,
        page: 1,
        pageSize: 50,
      }) as Promise<CommandReturn<T>>;

    case COMMANDS.MONGODB_INSERT_DOCUMENT:
      return Promise.resolve({
        success: true,
        insertedId: "507f1f77bcf86cd799439014",
      }) as Promise<CommandReturn<T>>;

    case COMMANDS.MONGODB_DELETE_DOCUMENT:
      return Promise.resolve({
        success: true,
        deletedCount: 1,
      }) as Promise<CommandReturn<T>>;

    case COMMANDS.MONGODB_UPDATE_DOCUMENT:
      return Promise.resolve({
        success: true,
        modifiedCount: 1,
      }) as Promise<CommandReturn<T>>;

    case COMMANDS.MONGODB_GET_DOCUMENT: {
      const a = args as CommandArgs<"mongodb_get_document">;
      return Promise.resolve({
        _id: a.documentId || "507f1f77bcf86cd799439011",
        name: "Alice",
        email: "alice@example.com",
        age: 30,
      }) as Promise<CommandReturn<T>>;
    }

    default:
      return null;
  }
}
