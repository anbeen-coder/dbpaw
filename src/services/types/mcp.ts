export type McpStatus = {
  running: boolean;
  pid: number | null;
  transport: string;
  port: number | null;
  host: string | null;
};

export type McpConfig = {
  transport: string;
  port: number;
  host: string;
};

export type McpToolInfo = {
  name: string;
  description: string;
};

export type McpDetectedClient = {
  name: string;
  path: string;
  exists: boolean;
  configured: boolean;
};
