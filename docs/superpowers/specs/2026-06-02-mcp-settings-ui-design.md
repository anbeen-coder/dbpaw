# MCP Server Settings UI Design

**Date:** 2026-06-02
**Status:** Approved
**Scope:** Add MCP Server management UI to DbPaw Settings dialog

## Problem

DbPaw ships a standalone MCP server binary (`dbpaw-mcp`) that exposes database capabilities to external AI tools (Claude Desktop, Cursor, Windsurf, etc.). Currently, configuring this requires:

1. Manually compiling the binary
2. Running a shell script (`setup-mcp.sh`)
3. Editing JSON config files for each AI client
4. Restarting the AI client

There is **no frontend UI** for managing the MCP server — it is completely invisible from the desktop app.

## Goal

Add an "MCP" section to the existing Settings dialog that provides:

- Server status display + start/stop/restart controls
- Transport mode configuration (stdio/http/both)
- Available tools list (read-only)
- AI client auto-configuration (detect clients + one-click config write)

## Architecture

```
┌─────────────────────────────────────────┐
│  Settings Dialog (existing)              │
│  ┌──────────┐  ┌───────────────────────┐ │
│  │ General  │  │                       │ │
│  │ Layout   │  │   MCP Section         │ │
│  │ AI       │←→│  - Status + Start/Stop│ │
│  │ Shortcuts│  │  - Transport Config   │ │
│  │ MCP (new)│  │  - Tools List         │ │
│  │ About    │  │  - Client Auto-Config │ │
│  └──────────┘  └───────────────────────┘ │
└─────────────────────────────────────────┘
         │ invoke()
         ▼
┌─────────────────────────────────────────┐
│  Tauri Backend (new commands)            │
│  - mcp_start / mcp_stop / mcp_status    │
│  - mcp_get_tools                         │
│  - mcp_detect_clients                    │
│  - mcp_configure_client                  │
└─────────────────────────────────────────┘
         │ manages
         ▼
┌─────────────────────────────────────────┐
│  dbpaw-mcp binary (existing)             │
│  - stdio / http / both transport         │
└─────────────────────────────────────────┘
```

## UI Design

### Settings Dialog — New "MCP" Section

Left sidebar adds "MCP" button (with `Server` icon) between "AI" and "Shortcuts".

Right panel contains 4 card areas:

### Card 1: Server Status

```
┌─────────────────────────────────────────────┐
│  MCP Server                           ● Running │
│  ─────────────────────────────────────────── │
│  Status: Running    Transport: stdio         │
│  PID: 12345        Port: — (stdio)          │
│                                              │
│  [▶ Start]  [⏹ Stop]  [🔄 Restart]          │
└─────────────────────────────────────────────┘
```

- Green dot + "Running" / Red + "Stopped" / Yellow + "Starting..."
- Buttons: Start (enabled when stopped), Stop (enabled when running), Restart

### Card 2: Transport Configuration

```
┌─────────────────────────────────────────────┐
│  Transport Mode                              │
│  ─────────────────────────────────────────── │
│  ○ stdio    — Local AI clients (default)     │
│  ○ http     — Remote/network access          │
│  ○ both     — Support both modes             │
│                                              │
│  HTTP Config (shown for http/only):          │
│  Host: [127.0.0.1  ]  Port: [3100]          │
└─────────────────────────────────────────────┘
```

### Card 3: Available Tools

```
┌─────────────────────────────────────────────┐
│  Available Tools (8)                         │
│  ─────────────────────────────────────────── │
│  🔧 dbpaw_list_connections                   │
│  🔧 dbpaw_list_databases                     │
│  🔧 dbpaw_list_tables                        │
│  🔧 dbpaw_describe_table                     │
│  🔧 dbpaw_get_ddl                            │
│  🔧 dbpaw_get_schema_context                 │
│  🔧 dbpaw_execute_query                      │
│  📋 dbpaw://connections (resource)           │
└─────────────────────────────────────────────┘
```

- Read-only display, populated from MCP server's `tools/list`

### Card 4: AI Client Auto-Configuration

```
┌─────────────────────────────────────────────┐
│  AI Client Auto-Configuration                │
│  ─────────────────────────────────────────── │
│  Detected clients:                           │
│                                              │
│  ✅ Claude Desktop     [Configured]  [Reconfigure] │
│  ✅ Cursor             [Configured]  [Reconfigure] │
│  ⚠️  Windsurf          Not detected            │
│  ⚠️  VS Code Copilot   Not detected            │
│                                              │
│  [Configure all detected clients]            │
└─────────────────────────────────────────────┘
```

- Scans client config file paths
- "Configured" = config file already contains DbPaw MCP entry
- "Configure all" button: auto-writes to all detected clients

## Backend Implementation

### New File: `src-tauri/src/commands/mcp.rs`

#### Tauri Commands

```rust
#[tauri::command]
async fn mcp_get_tools() -> Result<Vec<ToolInfo>, String>
// Returns hardcoded tool/resource/prompt definitions from MCP module

#[tauri::command]
async fn mcp_detect_clients() -> Result<Vec<DetectedClient>, String>
// Scans client config paths

#[tauri::command]
async fn mcp_configure_client(client: ClientType, config: McpServerConfig) -> Result<(), String>
// Writes DbPaw MCP entry to specified client config
```

#### Client Detection Paths

| Client | macOS | Windows |
|--------|-------|---------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| VS Code | `.vscode/mcp.json` (project-level) | same |

#### Process Management

- Uses `std::process::Command` to spawn dbpaw-mcp
- Stores `Child` handle in `AppState`
- `mcp_stop` calls `child.kill()`
- App exit cleanup via `Drop` impl or exit hook

#### Tools List Retrieval

When transport is `http`, tools are fetched via HTTP POST to `http://{host}:{port}/mcp` with a JSON-RPC `tools/list` request. When transport is `stdio`, the MCP server is spawned as a child process and tools/list is sent via stdin. However, for simplicity in the initial implementation, the tools list will be **hardcoded from the Rust tool definitions** in `src-tauri/src/mcp/tools/mod.rs` — no runtime query needed since the tools are static and known at compile time.

### Modified: `src-tauri/src/db/mod.rs`

Add to `AppState`:

```rust
pub mcp_process: Arc<Mutex<Option<std::process::Child>>>,
```

### Modified: `src-tauri/src/commands/mod.rs`

Register `mcp` module and re-export commands.

### Modified: `src-tauri/src/main.rs`

Add MCP commands to `invoke_handler`.

## Frontend API Layer

### New in `src/services/api.ts`

```typescript
export const api = {
  // ... existing ...
  mcp: {
    status: () => invoke<McpStatus>("mcp_status"),
    start: (config: McpConfig) => invoke<void>("mcp_start", { config }),
    stop: () => invoke<void>("mcp_stop"),
    getTools: () => invoke<ToolInfo[]>("mcp_get_tools"),
    detectClients: () => invoke<DetectedClient[]>("mcp_detect_clients"),
    configureClient: (client: ClientType, config: McpServerConfig) =>
      invoke<void>("mcp_configure_client", { client, config }),
  }
};
```

### Type Definitions

```typescript
type McpStatus = {
  running: boolean;
  pid: number | null;
  transport: "stdio" | "http" | "both";
  port: number | null;
  host: string | null;
};

type McpConfig = {
  transport: "stdio" | "http" | "both";
  port: number;
  host: string;
};

type ToolInfo = {
  name: string;
  description: string;
  type: "tool" | "resource" | "prompt";
};

type DetectedClient = {
  name: "claude_desktop" | "cursor" | "windsurf" | "vscode";
  displayName: string;
  configPath: string;
  detected: boolean;
  configured: boolean;
};

type ClientType = DetectedClient["name"];
```

### Mock Mode

Add MCP mock implementations in `src/services/mocks.ts` for `VITE_USE_MOCK=true` development.

## i18n

### New keys (en.ts)

```typescript
settings: {
  mcp: {
    section: "MCP",
    title: "MCP Server",
    status: {
      running: "Running",
      stopped: "Stopped",
      starting: "Starting...",
      pid: "PID",
      transport: "Transport",
      port: "Port",
      host: "Host",
    },
    actions: {
      start: "Start",
      stop: "Stop",
      restart: "Restart",
    },
    transport: {
      stdio: "stdio — Local AI clients (default)",
      http: "http — Remote/network access",
      both: "both — Support both modes",
      httpConfig: "HTTP Configuration",
    },
    tools: {
      title: "Available Tools",
      count: "{count} tools",
      tool: "Tool",
      resource: "Resource",
      prompt: "Prompt",
    },
    clients: {
      title: "AI Client Auto-Configuration",
      detected: "Detected",
      notDetected: "Not detected",
      configured: "Configured",
      notConfigured: "Not configured",
      reconfigure: "Reconfigure",
      configureAll: "Configure all detected clients",
      configuring: "Configuring...",
      success: "Configuration successful",
      error: "Configuration failed",
    }
  }
}
```

### New keys (zh.ts)

Chinese translations for all the above keys.

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src-tauri/src/commands/mcp.rs` | Tauri MCP commands |
| `src/components/settings/McpSettings.tsx` | Settings MCP section component |

### Modified Files

| File | Changes |
|------|---------|
| `src-tauri/src/commands/mod.rs` | Register mcp module + export commands |
| `src-tauri/src/main.rs` | Add MCP commands to invoke_handler |
| `src-tauri/src/db/mod.rs` | Add mcp_process field to AppState |
| `src/services/api.ts` | Add api.mcp namespace |
| `src/services/mocks.ts` | Add MCP mock implementations |
| `src/components/settings/SettingsDialog.tsx` | Add "MCP" section to sidebar + render McpSettings |
| `src/lib/i18n/locales/en.ts` | Add settings.mcp.* translations |
| `src/lib/i18n/locales/zh.ts` | Add settings.mcp.* translations |

## Out of Scope

- Connection monitoring (which AI clients are currently connected)
- MCP Client functionality (DbPaw connecting to external MCP services)
- Embedded MCP Server (running inside Tauri process)
- `.mcpb` Desktop Extension packaging
