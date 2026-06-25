import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  McpConfig,
} from "../types";

export const systemApi = {
  system: {
    listFonts: () => invoke(COMMANDS.LIST_SYSTEM_FONTS, {}),
  },
  mcp: {
    status: () => invoke(COMMANDS.MCP_STATUS, {}),
    start: (config: McpConfig) => invoke(COMMANDS.MCP_START, { config }),
    stop: () => invoke(COMMANDS.MCP_STOP, {}),
    getTools: () => invoke(COMMANDS.MCP_GET_TOOLS, {}),
    detectClients: () => invoke(COMMANDS.MCP_DETECT_CLIENTS, {}),
    configureClient: (clientName: string) =>
      invoke(COMMANDS.MCP_CONFIGURE_CLIENT, { clientName }),
  },
};
