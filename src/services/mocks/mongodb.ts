import { COMMANDS } from "../commands";

export function handleMongodb(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case COMMANDS.MONGODB_TEST_CONNECTION:
      return Promise.resolve({
        version: "7.0.4",
        nodeCount: 3,
      });

    case COMMANDS.MONGODB_TEST_CONNECTION_EPHEMERAL:
      return Promise.resolve({
        success: true,
        message: "Connected to MongoDB 7.0.4",
        latencyMs: 8,
      });

    case COMMANDS.MONGODB_LIST_DATABASES:
      return Promise.resolve([
        { name: "admin", sizeOnDisk: 4096, empty: false },
        { name: "testdb", sizeOnDisk: 8192, empty: false },
        { name: "local", sizeOnDisk: 4096, empty: false },
      ]);

    case COMMANDS.MONGODB_LIST_COLLECTIONS:
      return Promise.resolve([
        { name: "users", database: String(args.database || "testdb"), documentCount: 150, size: 4096 },
        { name: "orders", database: String(args.database || "testdb"), documentCount: 512, size: 12288 },
        { name: "products", database: String(args.database || "testdb"), documentCount: 80, size: 2048 },
      ]);

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
      });

    case COMMANDS.MONGODB_INSERT_DOCUMENT:
      return Promise.resolve({
        success: true,
        insertedId: "507f1f77bcf86cd799439014",
      });

    case COMMANDS.MONGODB_DELETE_DOCUMENT:
      return Promise.resolve({
        success: true,
        deletedCount: 1,
      });

    case COMMANDS.MONGODB_UPDATE_DOCUMENT:
      return Promise.resolve({
        success: true,
        modifiedCount: 1,
      });

    case COMMANDS.MONGODB_GET_DOCUMENT:
      return Promise.resolve({
        _id: args.documentId || "507f1f77bcf86cd799439011",
        name: "Alice",
        email: "alice@example.com",
        age: 30,
      });

    default:
      return null;
  }
}
