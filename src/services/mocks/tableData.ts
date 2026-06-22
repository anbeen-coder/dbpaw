import { ConnectionForm } from "../types";
import { mockComplexTypeData, mockArrayTypeData } from "./query";

const seedRows = [
  {
    id: 1,
    username: "alice",
    email: "alice@example.com",
    password_hash: "hashed_password_1",
    created_at: "2024-01-15 10:30:00",
    updated_at: "2024-01-15 10:30:00",
    metadata: {
      role: "admin",
      department: "engineering",
      level: 5,
      active: true,
    },
    tags: ["vip", "beta-tester", "early-adopter"],
    settings: null,
  },
  {
    id: 2,
    username: "bob",
    email: "bob@example.com",
    password_hash: "hashed_password_2",
    created_at: "2024-01-16 11:45:00",
    updated_at: "2024-01-16 11:45:00",
    metadata: { role: "user", department: "marketing" },
    tags: ["newsletter"],
    settings: {
      theme: "dark",
      lang: "zh",
      notifications: { email: true, sms: false },
    },
  },
  {
    id: 3,
    username: "charlie",
    email: "charlie@example.com",
    password_hash: "hashed_password_3",
    created_at: "2024-01-17 14:20:00",
    updated_at: "2024-01-17 14:20:00",
    metadata: {},
    tags: [],
    settings: { theme: "light", lang: "en" },
  },
  {
    id: 4,
    username: "diana",
    email: "diana@example.com",
    password_hash: "hashed_password_4",
    created_at: "2024-01-18 09:15:00",
    updated_at: "2024-01-18 09:15:00",
    metadata: {
      role: "moderator",
      permissions: ["read", "write", "delete"],
      score: 88,
    },
    tags: ["moderator", "trusted"],
    settings: null,
  },
  {
    id: 5,
    username: "eve",
    email: "eve@example.com",
    password_hash: "hashed_password_5",
    created_at: "2024-01-19 16:50:00",
    updated_at: "2024-01-19 16:50:00",
    metadata: [
      { key: "plan", value: "pro" },
      { key: "trial", value: false },
    ],
    tags: ["pro"],
    settings: {
      theme: "system",
      lang: "ja",
      timezone: "Asia/Tokyo",
      fontSize: 14,
    },
  },
  {
    id: 6,
    username: "frank",
    email: "frank@example.com",
    password_hash: "hashed_password_6",
    created_at: "2024-01-20 08:00:00",
    updated_at: "2024-01-20 08:00:00",
    metadata: {
      profile: {
        address: { city: "Shanghai", country: "CN", zip: "200000" },
        contact: { phone: "138-0000-0001", wechat: "frank_wx" },
      },
      billing: { plan: "enterprise", seats: 50, currency: "CNY" },
    },
    tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    settings: { theme: "dark", lang: "en", beta: false },
  },
  {
    id: 7,
    username: "grace",
    email: "grace@example.com",
    password_hash: "hashed_password_7",
    created_at: "2024-01-21 09:30:00",
    updated_at: "2024-01-21 09:30:00",
    metadata: [
      { name: "cpu", value: "85%", status: "warn" },
      { name: "memory", value: "42%", status: "ok" },
      { name: "disk", value: "91%", status: "critical" },
      { name: "network", value: "12%", status: "ok" },
    ],
    tags: ["ops", 42, true, null, { env: "prod" }],
    settings: null,
  },
  {
    id: 8,
    username: "henry",
    email: "henry@example.com",
    password_hash: "hashed_password_8",
    created_at: "2024-01-22 11:00:00",
    updated_at: "2024-01-22 11:00:00",
    metadata: { verified: true, banned: false, reason: null, score: 0 },
    tags: ["new"],
    settings: {
      ui: { sidebar: "collapsed", density: "compact", animations: true },
      editor: { fontSize: 13, tabSize: 2, wordWrap: true, minimap: false },
      shortcuts: { save: "Ctrl+S", run: "F5", format: "Shift+Alt+F" },
    },
  },
  {
    id: 9,
    username: "iris",
    email: "iris@example.com",
    password_hash: "hashed_password_9",
    created_at: "2024-01-23 14:45:00",
    updated_at: "2024-01-23 14:45:00",
    metadata: { role: "guest" },
    tags: ["read-only", "trial"],
    settings: { theme: "light", lang: "en", timezone: "UTC" },
  },
  {
    id: 10,
    username: "jack",
    email: "jack@example.com",
    password_hash: "hashed_password_10",
    created_at: "2024-01-24 16:20:00",
    updated_at: "2024-01-24 16:20:00",
    metadata: null,
    tags: null,
    settings: null,
  },
];

const generatedRows = Array.from({ length: 240 }, (_, i) => ({
  id: 11 + i,
  username: `user_${11 + i}`,
  email: `user${11 + i}@example.com`,
  password_hash: `hashed_password_${11 + i}`,
  created_at: `2024-02-${String((i % 28) + 1).padStart(2, "0")} 10:00:00`,
  updated_at: `2024-02-${String((i % 28) + 1).padStart(2, "0")} 10:00:00`,
  metadata: null,
  tags: null,
  settings: null,
}));

export const mockTableData = {
  data: [...seedRows, ...generatedRows],
  total: 250,
  page: 1,
  limit: 10,
  executionTimeMs: 25,
};

export async function mockGetTableData(params: {
  id: number;
  schema: string;
  table: string;
  page: number;
  limit: number;
  filter?: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  orderBy?: string;
  includeTotal?: boolean;
}): Promise<{
  data: any[];
  total: number | null;
  page: number;
  limit: number;
  executionTimeMs: number;
}> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const { page = 1, limit = 10, table } = params;
  const start = (page - 1) * limit;
  const end = start + limit;

  const source =
    table === "json_test"
      ? { data: mockComplexTypeData.data, total: mockComplexTypeData.rowCount }
      : table === "pg_arrays"
        ? { data: mockArrayTypeData.data, total: mockArrayTypeData.rowCount }
        : mockTableData;

  return {
    data: source.data.slice(start, end),
    total: params.includeTotal ? source.total : null,
    page,
    limit,
    executionTimeMs: Math.floor(Math.random() * 50) + 20,
  };
}

export async function mockGetTableDataByConn(
  _form: ConnectionForm,
  _schema: string,
  _table: string,
  page: number,
  limit: number,
  includeTotal?: boolean,
): Promise<{
  data: any[];
  total: number | null;
  page: number;
  limit: number;
  executionTimeMs: number;
}> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: mockTableData.data.slice(start, end),
    total: includeTotal ? mockTableData.total : null,
    page,
    limit,
    executionTimeMs: Math.floor(Math.random() * 50) + 20,
  };
}

export function handleTableData(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case "get_table_data":
      return mockGetTableData(args);
    case "get_table_data_by_conn":
      return mockGetTableDataByConn(
        args.form,
        args.schema,
        args.table,
        args.page,
        args.limit,
        args.includeTotal,
      );
    default:
      return null;
  }
}
