export interface ElasticsearchConnectionInfo {
  clusterName?: string | null;
  clusterUuid?: string | null;
  version?: string | null;
  tagline?: string | null;
}

export interface ElasticsearchIndexInfo {
  name: string;
  health?: string | null;
  status?: string | null;
  uuid?: string | null;
  primaryShards?: string | null;
  replicaShards?: string | null;
  docsCount?: number | null;
  storeSize?: string | null;
  isSystem: boolean;
}

export interface ElasticsearchSearchHit {
  index: string;
  id: string;
  score?: number | null;
  source: any;
  fields?: any;
}

export interface ElasticsearchSearchResponse {
  hits: ElasticsearchSearchHit[];
  total: number;
  tookMs: number;
  aggregations?: any;
}

export interface ElasticsearchDocument {
  index: string;
  id: string;
  found: boolean;
  source?: any;
  fields?: any;
}

export interface ElasticsearchMutationResult {
  index?: string | null;
  id?: string | null;
  result?: string | null;
  status: number;
}

export interface ElasticsearchIndexOperationResult {
  index?: string | null;
  acknowledged?: boolean | null;
  shardsAcknowledged?: boolean | null;
  status: number;
}

export interface ElasticsearchRawResponse {
  status: number;
  body: string;
  json?: any;
  tookMs: number;
}

export interface ElasticsearchBulkExportResult {
  filePath: string;
  index: string;
  documents: number;
  batches: number;
  timeTakenMs: number;
}

export interface ElasticsearchBulkImportResult {
  filePath: string;
  index: string;
  totalActions: number;
  successful: number;
  failed: number;
  errors: string[];
  timeTakenMs: number;
}
