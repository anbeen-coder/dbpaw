export function handleMongodb(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case "mongodb_test_connection":
      return Promise.resolve({
        version: "7.0.4",
        nodeCount: 3,
      });

    case "mongodb_test_connection_ephemeral":
      return Promise.resolve({
        success: true,
        message: "Connected to MongoDB 7.0.4",
        latencyMs: 8,
      });

    case "mongodb_list_databases":
      return Promise.resolve([
        { name: "admin", sizeOnDisk: 4096, empty: false },
        { name: "testdb", sizeOnDisk: 8192, empty: false },
        { name: "local", sizeOnDisk: 4096, empty: false },
      ]);

    case "mongodb_list_collections":
      return Promise.resolve([
        { name: "users", database: String(args.database || "testdb"), documentCount: 150, size: 4096 },
        { name: "orders", database: String(args.database || "testdb"), documentCount: 512, size: 12288 },
        { name: "products", database: String(args.database || "testdb"), documentCount: 80, size: 2048 },
      ]);

    case "mongodb_find_documents":
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

    case "mongodb_insert_document":
      return Promise.resolve({
        success: true,
        insertedId: "507f1f77bcf86cd799439014",
      });

    case "mongodb_delete_document":
      return Promise.resolve({
        success: true,
        deletedCount: 1,
      });

    case "mongodb_update_document":
      return Promise.resolve({
        success: true,
        modifiedCount: 1,
      });

    case "mongodb_get_document":
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
