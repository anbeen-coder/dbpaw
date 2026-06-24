import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  McpConfig,
  McpDetectedClient,
  McpStatus,
  McpToolInfo,
} from "../types";

export const systemApi = {
  system: {
    listFonts: () => invoke<string[]>(COMMANDS.LIST_SYSTEM_FONTS),
  },
  mcp: {
    status: () => invoke<McpStatus>(COMMANDS.MCP_STATUS),
    start: (config: McpConfig) => invoke<McpStatus>(COMMANDS.MCP_START, { config }),
    stop: () => invoke<McpStatus>(COMMANDS.MCP_STOP),
    getTools: () => invoke<McpToolInfo[]>(COMMANDS.MCP_GET_TOOLS),
    detectClients: () => invoke<McpDetectedClient[]>(COMMANDS.MCP_DETECT_CLIENTS),
    configureClient: (clientName: string) =>
      invoke<string>(COMMANDS.MCP_CONFIGURE_CLIENT, { clientName }),
  },
};
