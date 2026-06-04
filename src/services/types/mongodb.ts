export interface MongodbConnectionInfo {
  version?: string;
  nodeCount?: number;
}

export interface MongodbDatabaseInfo {
  name: string;
  sizeOnDisk?: number;
  empty?: boolean;
}

export interface MongodbCollectionInfo {
  name: string;
  database: string;
  documentCount?: number;
  size?: number;
}
