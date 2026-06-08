import { invoke } from "./core";
import type {
  McpConfig,
  McpDetectedClient,
  McpStatus,
  McpToolInfo,
} from "../types";

export const systemApi = {
  system: {
    listFonts: () => invoke<string[]>("list_system_fonts"),
  },
  mcp: {
    status: () => invoke<McpStatus>("mcp_status"),
    start: (config: McpConfig) => invoke<McpStatus>("mcp_start", { config }),
    stop: () => invoke<McpStatus>("mcp_stop"),
    getTools: () => invoke<McpToolInfo[]>("mcp_get_tools"),
    detectClients: () => invoke<McpDetectedClient[]>("mcp_detect_clients"),
    configureClient: (clientName: string) =>
      invoke<string>("mcp_configure_client", { clientName }),
  },
};
