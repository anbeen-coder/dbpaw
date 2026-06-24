import { COMMANDS } from "../commands";

export async function mockMcpStatus(): Promise<any> {
  return {
    running: false,
    pid: null,
    transport: "stdio",
    port: null,
    host: null,
  };
}

export async function mockMcpStart(_config: any): Promise<any> {
  console.log("[Mock] MCP server started");
  return {
    running: true,
    pid: 12345,
    transport: _config?.transport || "stdio",
    port: _config?.port || null,
    host: _config?.host || null,
  };
}

export async function mockMcpStop(): Promise<any> {
  console.log("[Mock] MCP server stopped");
  return {
    running: false,
    pid: null,
    transport: "stdio",
    port: null,
    host: null,
  };
}

export async function mockMcpGetTools(): Promise<any[]> {
  return [
    { name: "dbpaw_list_connections", description: "List all saved database connections" },
    { name: "dbpaw_list_databases", description: "List databases for a connection" },
    { name: "dbpaw_list_tables", description: "List tables in a database" },
    { name: "dbpaw_describe_table", description: "Get table structure" },
    { name: "dbpaw_get_ddl", description: "Get table DDL" },
    { name: "dbpaw_get_schema_context", description: "Get schema context for AI" },
    { name: "dbpaw_execute_query", description: "Execute SQL query" },
  ];
}

export async function mockMcpDetectClients(): Promise<any[]> {
  return [
    { name: "Claude Desktop", path: "~/Library/Application Support/Claude/claude_desktop_config.json", exists: true, configured: false },
    { name: "Cursor", path: "~/.cursor/mcp.json", exists: true, configured: true },
    { name: "Windsurf", path: "~/.codeium/windsurf/mcp_config.json", exists: false, configured: false },
  ];
}

export async function mockMcpConfigureClient(_clientName: string): Promise<string> {
  console.log("[Mock] Configured client:", _clientName);
  return `Configured ${_clientName} for DbPaw MCP`;
}

export function handleMcp(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case COMMANDS.MCP_STATUS:
      return mockMcpStatus();
    case COMMANDS.MCP_START:
      return mockMcpStart(args.config);
    case COMMANDS.MCP_STOP:
      return mockMcpStop();
    case COMMANDS.MCP_GET_TOOLS:
      return mockMcpGetTools();
    case COMMANDS.MCP_DETECT_CLIENTS:
      return mockMcpDetectClients();
    case COMMANDS.MCP_CONFIGURE_CLIENT:
      return mockMcpConfigureClient(args.clientName);
    default:
      return null;
  }
}
