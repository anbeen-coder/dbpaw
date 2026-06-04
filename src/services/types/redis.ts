export interface RedisDatabaseInfo {
  index: number;
  name: string;
  selected: boolean;
  keyCount?: number;
}

export interface RedisServerInfo {
  sections: Record<string, Record<string, string>>;
  dbsize: number;
}

export interface RedisSlowlogEntry {
  id: number;
  timestamp: number;
  durationMs: number;
  command: string;
}

export interface RedisKeyInfo {
  key: string;
  keyType: string;
  ttl: number;
}

export interface RedisScanResponse {
  cursor: string;
  keys: RedisKeyInfo[];
  isPartial: boolean;
}

export type RedisConnectionMode = "standalone" | "cluster" | "sentinel";

export type RedisValue =
  | { kind: "string"; value: string }
  | { kind: "hash"; value: Record<string, string> }
  | { kind: "list"; value: string[] }
  | { kind: "set"; value: string[] }
  | { kind: "zSet"; value: { member: string; score: number }[] }
  | { kind: "stream"; value: { id: string; fields: Record<string, string> }[] }
  | { kind: "json"; value: string }
  | { kind: "none"; value?: null };

export interface RedisBitmapBit {
  offset: number;
  value: boolean;
}

export interface RedisGeoMember {
  member: string;
  longitude: number;
  latitude: number;
}

export interface RedisGeoPosition {
  longitude: number;
  latitude: number;
}

export interface RedisGeoSearchResult {
  member: string;
  distance?: number;
  hash?: number;
  position?: RedisGeoPosition;
}

export interface RedisKeyExtra {
  subtype?: string | null;
  streamInfo?: {
    length: number;
    radixTreeKeys: number;
    radixTreeNodes: number;
    groups: number;
    lastGeneratedId: string;
    firstEntry?: { id: string; fields: Record<string, string> } | null;
    lastEntry?: { id: string; fields: Record<string, string> } | null;
  } | null;
  streamGroups?: RedisStreamGroup[] | null;
  hllCount?: number | null;
  geoCount?: number | null;
  bitmapCount?: number | null;
}

export interface RedisKeyValue {
  key: string;
  keyType: string;
  ttl: number;
  value: RedisValue;
  valueTotalLen: number | null;
  valueOffset: number;
  isBinary?: boolean;
  extra?: RedisKeyExtra | null;
  objectEncoding?: string | null;
  memoryUsage?: number | null;
  objectIdletime?: number | null;
  objectRefcount?: number | null;
  keyExists?: boolean | null;
}

export interface RedisSetKeyPayload {
  key: string;
  value: RedisValue;
  ttlSeconds?: number | null;
  setNx?: boolean;
  setXx?: boolean;
  setPx?: number | null;
  setKeepttl?: boolean;
}

export interface RedisMutationResult {
  success: boolean;
  affected: number;
}

export interface RedisListSetItem {
  index: number;
  value: string;
}

export interface RedisStreamEntry {
  id: string;
  fields: Record<string, string>;
}

export interface RedisStreamGroup {
  name: string;
  consumers: number;
  pending: number;
  lastDeliveredId: string;
  entriesRead?: number | null;
  lag?: number | null;
}

export interface RedisStreamView {
  entries: RedisStreamEntry[];
  totalLen: number;
  startId: string;
  endId: string;
  count: number;
  nextStartId?: string | null;
  streamInfo?: RedisKeyExtra["streamInfo"];
  groups: RedisStreamGroup[];
}

export interface RedisXPendingSummary {
  count: number;
  minId: string;
  maxId: string;
  consumers: [string, number][];
}

export interface RedisXPendingEntry {
  id: string;
  consumer: string;
  idleMs: number;
  deliveryCount: number;
}

export interface RedisXClaimEntry {
  id: string;
  fields: Record<string, string>;
  idleMs?: number;
  deliveryCount?: number;
}

export interface RedisKeyPatchPayload {
  key: string;
  ttlSeconds: number | null;
  hashSet?: Record<string, string>;
  hashDel?: string[];
  setAdd?: string[];
  setRem?: string[];
  zsetAdd?: { member: string; score: number }[];
  zsetRem?: string[];
  listRpush?: string[];
  listLpush?: string[];
  listSet?: RedisListSetItem[];
  listRem?: string[];
  listLpop?: number;
  listRpop?: number;
  streamAdd?: RedisStreamEntry[];
  streamDel?: string[];
  bitmapSet?: RedisBitmapBit[];
  stringIncrBy?: string;
  hashIncrBy?: Record<string, string>;
  zsetIncrBy?: { member: string; score: number }[];
  stringIncrByInt?: number;
}

export interface RedisRawResult {
  output: string;
}

export interface RedisZRangeByScoreResult {
  members: { member: string; score: number }[];
  total: number;
}

export interface RedisZRangeByLexResult {
  members: string[];
  total: number;
}

export type RedisSetOperation = "inter" | "union" | "diff";

export type RedisLInsertPosition = "before" | "after";

export type RedisLMoveDirection = "left" | "right";

export interface RedisBatchKeyOp {
  op: "del" | "unlink" | "expire" | "persist";
  key: string;
  ttlSeconds?: number;
}

export interface RedisBatchKeyOpResult {
  key: string;
  op: string;
  success: boolean;
  affected: number;
}

export interface RedisMgetEntry {
  key: string;
  value: string | null;
  exists: boolean;
}

export interface RedisClusterNode {
  id: string;
  addr: string;
  flags: string[];
  masterId: string | null;
  pingSent: number;
  pongRecv: number;
  configEpoch: number;
  linkState: string;
  slotRange: string | null;
}

export interface RedisClusterInfo {
  info: Record<string, string>;
  nodes: RedisClusterNode[];
}

export interface RedisCommandLog {
  id: number;
  command: string;
  connectionId?: number | null;
  database?: string | null;
  success: boolean;
  error?: string | null;
  executedAt: string;
}
