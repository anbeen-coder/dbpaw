# MCP Server Settings UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "MCP" section to the Settings dialog that manages the dbpaw-mcp server lifecycle, transport config, tools list display, and AI client auto-configuration.

**Architecture:** Rust Tauri commands manage the MCP server process and client config files. A new `McpSettings.tsx` React component renders in the Settings dialog. Communication follows the existing `api.ts` invoke pattern.

**Tech Stack:** Rust (Tauri v2), React 19, TypeScript, Shadcn/UI, Tailwind CSS v4, i18next

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/state.rs` | Modify | Add `mcp_process` field to `AppState` |
| `src-tauri/src/commands/mcp.rs` | Create | Tauri commands: status, start, stop, get_tools, detect_clients, configure_client |
| `src-tauri/src/commands/mod.rs` | Modify | Register `mcp` module |
| `src-tauri/src/lib.rs` | Modify | Register MCP commands in `invoke_handler` + cleanup on exit |
| `src/services/api.ts` | Modify | Add `api.mcp` namespace with types |
| `src/services/mocks.ts` | Modify | Add MCP mock implementations |
| `src/components/settings/McpSettings.tsx` | Create | MCP settings UI component |
| `src/components/settings/SettingsDialog.tsx` | Modify | Add "MCP" section to sidebar + render McpSettings |
| `src/lib/i18n/locales/en.ts` | Modify | Add `settings.mcp.*` translations |
| `src/lib/i18n/locales/zh.ts` | Modify | Add `settings.mcp.*` translations |

---

### Task 1: Add `mcp_process` to AppState

**Files:**
- Modify: `src-tauri/src/state.rs`

- [ ] **Step 1: Add mcp_process field to AppState**

```rust
use crate::datasources::redis::RedisConnectionCache;
use crate::db::local::LocalDb;
use crate::db::pool_manager::PoolManager;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub local_db: Mutex<Option<Arc<LocalDb>>>,
    pub pool_manager: Arc<PoolManager>,
    pub redis_cache: Mutex<RedisConnectionCache>,
    pub mcp_process: Mutex<Option<std::process::Child>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            local_db: Mutex::new(None),
            pool_manager: Arc::new(PoolManager::new()),
            redis_cache: Mutex::new(RedisConnectionCache::new()),
            mcp_process: Mutex::new(None),
        }
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check` from `src-tauri/`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/state.rs
git commit -m "feat(mcp): add mcp_process field to AppState"
```

---

### Task 2: Create MCP Tauri Commands

**Files:**
- Create: `src-tauri/src/commands/mcp.rs`

- [ ] **Step 1: Create the MCP commands module**

```rust
use crate::mcp::tools::get_tool_definitions;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub transport: String,
    pub port: Option<u16>,
    pub host: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpConfig {
    pub transport: String,
    pub port: u16,
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInfo {
    pub name: String,
    pub description: String,
    pub item_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedClient {
    pub name: String,
    pub display_name: String,
    pub config_path: String,
    pub detected: bool,
    pub configured: bool,
}

#[tauri::command]
pub async fn mcp_status(state: State<'_, AppState>) -> Result<McpStatus, String> {
    let lock = state.mcp_process.lock().await;
    let running = lock.is_some();
    let pid = lock.as_ref().map(|p| p.id());

    Ok(McpStatus {
        running,
        pid,
        transport: "stdio".to_string(),
        port: None,
        host: None,
    })
}

#[tauri::command]
pub async fn mcp_start(
    state: State<'_, AppState>,
    config: McpConfig,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let mut lock = state.mcp_process.lock().await;

    if lock.is_some() {
        return Err("MCP server is already running".to_string());
    }

    // Find the dbpaw-mcp binary
    let mcp_binary = find_mcp_binary(&app_handle)?;

    let mut cmd = std::process::Command::new(&mcp_binary);
    cmd.arg("--transport").arg(&config.transport);
    cmd.arg("--port").arg(config.port.to_string());
    cmd.arg("--host").arg(&config.host);

    let child = cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start MCP server: {}", e))?;

    *lock = Some(child);
    Ok(())
}

#[tauri::command]
pub async fn mcp_stop(state: State<'_, AppState>) -> Result<(), String> {
    let mut lock = state.mcp_process.lock().await;

    if let Some(mut child) = lock.take() {
        child.kill().map_err(|e| format!("Failed to stop MCP server: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn mcp_get_tools() -> Result<Vec<ToolInfo>, String> {
    let tools = get_tool_definitions();
    let result: Vec<ToolInfo> = tools
        .into_iter()
        .map(|t| ToolInfo {
            name: t.name,
            description: t.description,
            item_type: "tool".to_string(),
        })
        .collect();
    Ok(result)
}

#[tauri::command]
pub async fn mcp_detect_clients() -> Result<Vec<DetectedClient>, String> {
    let mut clients = Vec::new();

    // Claude Desktop
    let claude_path = get_claude_config_path();
    let (claude_detected, claude_configured) = check_client_config(&claude_path);
    clients.push(DetectedClient {
        name: "claude_desktop".to_string(),
        display_name: "Claude Desktop".to_string(),
        config_path: claude_path.to_string_lossy().to_string(),
        detected: claude_detected,
        configured: claude_configured,
    });

    // Cursor
    let cursor_path = get_cursor_config_path();
    let (cursor_detected, cursor_configured) = check_client_config(&cursor_path);
    clients.push(DetectedClient {
        name: "cursor".to_string(),
        display_name: "Cursor".to_string(),
        config_path: cursor_path.to_string_lossy().to_string(),
        detected: cursor_detected,
        configured: cursor_configured,
    });

    // Windsurf
    let windsurf_path = get_windsurf_config_path();
    let (windsurf_detected, windsurf_configured) = check_client_config(&windsurf_path);
    clients.push(DetectedClient {
        name: "windsurf".to_string(),
        display_name: "Windsurf".to_string(),
        config_path: windsurf_path.to_string_lossy().to_string(),
        detected: windsurf_detected,
        configured: windsurf_configured,
    });

    Ok(clients)
}

#[tauri::command]
pub async fn mcp_configure_client(
    client: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let config_path = match client.as_str() {
        "claude_desktop" => get_claude_config_path(),
        "cursor" => get_cursor_config_path(),
        "windsurf" => get_windsurf_config_path(),
        _ => return Err(format!("Unknown client: {}", client)),
    };

    let mcp_binary = find_mcp_binary(&app_handle)?;

    // Read existing config or create new
    let mut config: serde_json::Value = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config JSON: {}", e))?
    } else {
        serde_json::json!({})
    };

    // Ensure mcpServers object exists
    if config.get("mcpServers").is_none() {
        config["mcpServers"] = serde_json::json!({});
    }

    // Add or update dbpaw entry
    config["mcpServers"]["dbpaw"] = serde_json::json!({
        "command": mcp_binary.to_string_lossy(),
        "args": []
    });

    // Ensure parent directory exists
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    // Write config
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

fn find_mcp_binary(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Try resource directory first (production build)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let binary = resource_dir.join("dbpaw-mcp");
        if binary.exists() {
            return Ok(binary);
        }
    }

    // Try target/debug (development)
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
    if !manifest_dir.is_empty() {
        let dev_binary = PathBuf::from(&manifest_dir)
            .join("target")
            .join("debug")
            .join("dbpaw-mcp");
        if dev_binary.exists() {
            return Ok(dev_binary);
        }
    }

    // Try relative to current executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let binary = exe_dir.join("dbpaw-mcp");
            if binary.exists() {
                return Ok(binary);
            }
        }
    }

    Err("dbpaw-mcp binary not found. Please build it first: cd src-tauri && cargo build --bin dbpaw-mcp".to_string())
}

fn get_claude_config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join("Library")
        .join("Application Support")
        .join("Claude")
        .join("claude_desktop_config.json")
}

fn get_cursor_config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".cursor")
        .join("mcp.json")
}

fn get_windsurf_config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".codeium")
        .join("windsurf")
        .join("mcp_config.json")
}

fn check_client_config(path: &PathBuf) -> (bool, bool) {
    if !path.exists() {
        return (false, false);
    }

    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return (true, false),
    };

    let config: serde_json::Value = match serde_json::from_str(&content) {
        Ok(c) => c,
        Err(_) => return (true, false),
    };

    let configured = config
        .get("mcpServers")
        .and_then(|s| s.get("dbpaw"))
        .is_some();

    (true, configured)
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check` from `src-tauri/`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/mcp.rs
git commit -m "feat(mcp): add Tauri MCP commands module"
```

---

### Task 3: Register MCP Commands

**Files:**
- Modify: `src-tauri/src/commands/mod.rs:1-12`
- Modify: `src-tauri/src/lib.rs:147-273,277-286`

- [ ] **Step 1: Add mcp module to commands/mod.rs**

Add `pub mod mcp;` after line 8 (after `pub mod mongodb;`):

```rust
pub mod ai;
pub mod config;
pub mod connection;
pub mod elasticsearch;
pub mod metadata;
pub mod mcp;
pub mod mongodb;
pub mod query;
pub mod redis;
pub mod storage;
pub mod system;
pub mod transfer;
```

- [ ] **Step 2: Register commands in lib.rs invoke_handler**

Add these lines after `commands::mongodb::mongodb_list_collections,` (line 271):

```rust
            commands::mcp::mcp_status,
            commands::mcp::mcp_start,
            commands::mcp::mcp_stop,
            commands::mcp::mcp_get_tools,
            commands::mcp::mcp_detect_clients,
            commands::mcp::mcp_configure_client,
```

- [ ] **Step 3: Add cleanup on app exit in lib.rs**

In the `app.run` closure (line 277-286), add MCP process cleanup:

```rust
    app.run(|app_handle, event| match event {
        tauri::RunEvent::Exit => {
            let _ = app_handle.save_window_state(StateFlags::all());
            let state = app_handle.state::<AppState>();
            tauri::async_runtime::block_on(async {
                // Kill MCP server process if running
                let mut lock = state.mcp_process.lock().await;
                if let Some(mut child) = lock.take() {
                    let _ = child.kill();
                }
                state.pool_manager.close_all().await;
            });
        }
        _ => {}
    });
```

- [ ] **Step 4: Add dirs crate dependency**

Run: `cargo add dirs` from `src-tauri/`
Expected: dirs added to Cargo.toml

- [ ] **Step 5: Verify compilation**

Run: `cargo check` from `src-tauri/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(mcp): register MCP commands and cleanup handler"
```

---

### Task 4: Add Frontend API Types and Functions

**Files:**
- Modify: `src/services/api.ts` (append before closing `};`)

- [ ] **Step 1: Add MCP types and api.mcp namespace**

Add before the final `};` of the `api` object (before line 1736):

```typescript
// ==================== MCP Types ====================

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
  item_type: string;
};

export type McpDetectedClient = {
  name: string;
  display_name: string;
  config_path: string;
  detected: boolean;
  configured: boolean;
};
```

And add `mcp` namespace inside the `api` object (after `system:` block):

```typescript
  mcp: {
    status: () => invoke<McpStatus>("mcp_status"),
    start: (config: McpConfig) => invoke<void>("mcp_start", { config }),
    stop: () => invoke<void>("mcp_stop"),
    getTools: () => invoke<McpToolInfo[]>("mcp_get_tools"),
    detectClients: () => invoke<McpDetectedClient[]>("mcp_detect_clients"),
    configureClient: (client: string) =>
      invoke<void>("mcp_configure_client", { client }),
  },
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit` from project root
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat(mcp): add frontend API types and functions"
```

---

### Task 5: Add Mock Implementations

**Files:**
- Modify: `src/services/mocks.ts` (add mock functions + add cases to `invokeMock`)

- [ ] **Step 1: Add mock functions**

Add before the `invokeMock` function:

```typescript
export async function mockMcpStatus(): Promise<any> {
  return {
    running: false,
    pid: null,
    transport: "stdio",
    port: null,
    host: null,
  };
}

export async function mockMcpStart(_config: any): Promise<void> {
  console.log("[Mock] MCP server started");
}

export async function mockMcpStop(): Promise<void> {
  console.log("[Mock] MCP server stopped");
}

export async function mockMcpGetTools(): Promise<any[]> {
  return [
    { name: "dbpaw_list_connections", description: "List all saved database connections", item_type: "tool" },
    { name: "dbpaw_list_databases", description: "List databases for a connection", item_type: "tool" },
    { name: "dbpaw_list_tables", description: "List tables in a database", item_type: "tool" },
    { name: "dbpaw_describe_table", description: "Get table structure", item_type: "tool" },
    { name: "dbpaw_get_ddl", description: "Get table DDL", item_type: "tool" },
    { name: "dbpaw_get_schema_context", description: "Get schema context for AI", item_type: "tool" },
    { name: "dbpaw_execute_query", description: "Execute SQL query", item_type: "tool" },
  ];
}

export async function mockMcpDetectClients(): Promise<any[]> {
  return [
    { name: "claude_desktop", display_name: "Claude Desktop", config_path: "~/Library/Application Support/Claude/claude_desktop_config.json", detected: true, configured: false },
    { name: "cursor", display_name: "Cursor", config_path: "~/.cursor/mcp.json", detected: true, configured: true },
    { name: "windsurf", display_name: "Windsurf", config_path: "~/.codeium/windsurf/mcp_config.json", detected: false, configured: false },
  ];
}

export async function mockMcpConfigureClient(_client: string): Promise<void> {
  console.log("[Mock] Configured client:", _client);
}
```

- [ ] **Step 2: Add cases to invokeMock switch**

Add these cases in the `invokeMock` function, before the `default:` case:

```typescript
    // MCP commands
    case "mcp_status":
      return mockMcpStatus() as Promise<T>;

    case "mcp_start":
      return mockMcpStart(args.config) as Promise<T>;

    case "mcp_stop":
      return mockMcpStop() as Promise<T>;

    case "mcp_get_tools":
      return mockMcpGetTools() as Promise<T>;

    case "mcp_detect_clients":
      return mockMcpDetectClients() as Promise<T>;

    case "mcp_configure_client":
      return mockMcpConfigureClient(args.client) as Promise<T>;
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit` from project root
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/services/mocks.ts
git commit -m "feat(mcp): add mock implementations for MCP commands"
```

---

### Task 6: Add i18n Translations

**Files:**
- Modify: `src/lib/i18n/locales/en.ts`
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add English translations**

In `en.ts`, add `mcp: "MCP"` to `settings.sections` (after `about: "About",`):

```typescript
    sections: {
      general: "General",
      layout: "Layout",
      ai: "AI",
      shortcuts: "Shortcuts",
      mcp: "MCP",
      about: "About",
    },
```

Add `mcp` object inside `settings` (after the `shortcuts` block, before `about`):

```typescript
    mcp: {
      title: "MCP Server",
      status: {
        label: "Status",
        running: "Running",
        stopped: "Stopped",
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
        title: "Transport Mode",
        stdio: "stdio — Local AI clients (default)",
        http: "http — Remote/network access",
        both: "both — Support both modes",
        httpConfig: "HTTP Configuration",
        host: "Host",
        port: "Port",
      },
      tools: {
        title: "Available Tools",
        count: "{{count}} tools",
        tool: "Tool",
      },
      clients: {
        title: "AI Client Auto-Configuration",
        configured: "Configured",
        notConfigured: "Not configured",
        notDetected: "Not detected",
        reconfigure: "Reconfigure",
        configureAll: "Configure all detected clients",
        configuring: "Configuring...",
        success: "Configuration successful",
        error: "Configuration failed",
      },
    },
```

- [ ] **Step 2: Add Chinese translations**

In `zh.ts`, add `mcp: "MCP"` to `settings.sections`:

```typescript
    sections: {
      general: "通用",
      layout: "布局",
      ai: "AI",
      shortcuts: "快捷键",
      mcp: "MCP",
      about: "关于",
    },
```

Add `mcp` object inside `settings`:

```typescript
    mcp: {
      title: "MCP 服务器",
      status: {
        label: "状态",
        running: "运行中",
        stopped: "已停止",
        pid: "PID",
        transport: "传输模式",
        port: "端口",
        host: "主机",
      },
      actions: {
        start: "启动",
        stop: "停止",
        restart: "重启",
      },
      transport: {
        title: "传输模式",
        stdio: "stdio — 本地 AI 客户端（默认）",
        http: "http — 远程/网络访问",
        both: "both — 同时支持两种模式",
        httpConfig: "HTTP 配置",
        host: "主机",
        port: "端口",
      },
      tools: {
        title: "可用工具",
        count: "{{count}} 个工具",
        tool: "工具",
      },
      clients: {
        title: "AI 客户端自动配置",
        configured: "已配置",
        notConfigured: "未配置",
        notDetected: "未检测到",
        reconfigure: "重新配置",
        configureAll: "配置所有检测到的客户端",
        configuring: "配置中...",
        success: "配置成功",
        error: "配置失败",
      },
    },
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit` from project root
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "feat(mcp): add i18n translations for MCP settings"
```

---

### Task 7: Create McpSettings Component

**Files:**
- Create: `src/components/settings/McpSettings.tsx`

- [ ] **Step 1: Create McpSettings.tsx**

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, McpStatus, McpToolInfo, McpDetectedClient } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Server,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

export function McpSettings() {
  const { t } = useTranslation();

  const [status, setStatus] = useState<McpStatus | null>(null);
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [clients, setClients] = useState<McpDetectedClient[]>([]);
  const [transport, setTransport] = useState("stdio");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("3100");
  const [configuring, setConfiguring] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const s = await api.mcp.status();
      setStatus(s);
    } catch (e) {
      console.error("Failed to load MCP status:", e);
    }
  };

  const loadTools = async () => {
    try {
      const t = await api.mcp.getTools();
      setTools(t);
    } catch (e) {
      console.error("Failed to load MCP tools:", e);
    }
  };

  const loadClients = async () => {
    try {
      const c = await api.mcp.detectClients();
      setClients(c);
    } catch (e) {
      console.error("Failed to detect clients:", e);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTools();
    loadClients();

    const interval = setInterval(loadStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      await api.mcp.start({ transport, host, port: parseInt(port) || 3100 });
      toast.success(t("settings.mcp.status.running"));
      await loadStatus();
    } catch (e: any) {
      toast.error(e || "Failed to start MCP server");
    }
  };

  const handleStop = async () => {
    try {
      await api.mcp.stop();
      toast.success(t("settings.mcp.status.stopped"));
      await loadStatus();
    } catch (e: any) {
      toast.error(e || "Failed to stop MCP server");
    }
  };

  const handleRestart = async () => {
    await handleStop();
    await handleStart();
  };

  const handleConfigureClient = async (clientName: string) => {
    setConfiguring(clientName);
    try {
      await api.mcp.configureClient(clientName);
      toast.success(t("settings.mcp.clients.success"));
      await loadClients();
    } catch (e: any) {
      toast.error(e || t("settings.mcp.clients.error"));
    } finally {
      setConfiguring(null);
    }
  };

  const handleConfigureAll = async () => {
    const detected = clients.filter((c) => c.detected && !c.configured);
    for (const client of detected) {
      await handleConfigureClient(client.name);
    }
  };

  const isRunning = status?.running ?? false;

  return (
    <div className="space-y-6">
      {/* Server Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Server className="w-5 h-5" />
          {t("settings.mcp.title")}
          <span className="ml-auto flex items-center gap-1.5 text-sm font-normal">
            {isRunning ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-600">{t("settings.mcp.status.running")}</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("settings.mcp.status.stopped")}</span>
              </>
            )}
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t("settings.mcp.status.transport")}:</span>{" "}
            <span>{status?.transport ?? "stdio"}</span>
          </div>
          {status?.pid && (
            <div>
              <span className="text-muted-foreground">{t("settings.mcp.status.pid")}:</span>{" "}
              <span>{status.pid}</span>
            </div>
          )}
          {status?.port && (
            <div>
              <span className="text-muted-foreground">{t("settings.mcp.status.port")}:</span>{" "}
              <span>{status.port}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isRunning ? "outline" : "default"}
            onClick={handleStart}
            disabled={isRunning}
          >
            <Play className="w-4 h-4 mr-1" />
            {t("settings.mcp.actions.start")}
          </Button>
          <Button
            size="sm"
            variant={isRunning ? "destructive" : "outline"}
            onClick={handleStop}
            disabled={!isRunning}
          >
            <Square className="w-4 h-4 mr-1" />
            {t("settings.mcp.actions.stop")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRestart}
            disabled={!isRunning}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {t("settings.mcp.actions.restart")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Transport Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t("settings.mcp.transport.title")}</h3>
        <RadioGroup value={transport} onValueChange={setTransport}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="stdio" id="transport-stdio" />
            <Label htmlFor="transport-stdio" className="font-normal">
              {t("settings.mcp.transport.stdio")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="http" id="transport-http" />
            <Label htmlFor="transport-http" className="font-normal">
              {t("settings.mcp.transport.http")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="transport-both" />
            <Label htmlFor="transport-both" className="font-normal">
              {t("settings.mcp.transport.both")}
            </Label>
          </div>
        </RadioGroup>

        {transport !== "stdio" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t("settings.mcp.transport.host")}</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t("settings.mcp.transport.port")}</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Available Tools */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          {t("settings.mcp.tools.title")}
          <span className="text-sm font-normal text-muted-foreground">
            {t("settings.mcp.tools.count", { count: tools.length })}
          </span>
        </h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50"
            >
              <Wrench className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <code className="font-mono text-xs">{tool.name}</code>
              <span className="text-muted-foreground text-xs truncate">
                {tool.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* AI Client Auto-Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t("settings.mcp.clients.title")}</h3>
        <div className="space-y-2">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-between py-2 px-3 rounded border"
            >
              <div className="flex items-center gap-2">
                {client.detected ? (
                  client.configured ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-yellow-500" />
                  )
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{client.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  {client.detected
                    ? client.configured
                      ? t("settings.mcp.clients.configured")
                      : t("settings.mcp.clients.notConfigured")
                    : t("settings.mcp.clients.notDetected")}
                </span>
              </div>
              {client.detected && !client.configured && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConfigureClient(client.name)}
                  disabled={configuring !== null}
                >
                  {configuring === client.name ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("settings.mcp.clients.reconfigure")
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
        {clients.some((c) => c.detected && !c.configured) && (
          <Button onClick={handleConfigureAll} disabled={configuring !== null}>
            {configuring ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {t("settings.mcp.clients.configureAll")}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit` from project root
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/McpSettings.tsx
git commit -m "feat(mcp): add McpSettings component"
```

---

### Task 8: Integrate MCP Section into SettingsDialog

**Files:**
- Modify: `src/components/settings/SettingsDialog.tsx:78,506-562,565-566`

- [ ] **Step 1: Add "mcp" to SettingsSection type**

Change line 78 from:

```typescript
type SettingsSection = "general" | "layout" | "ai" | "shortcuts" | "about";
```

to:

```typescript
type SettingsSection = "general" | "layout" | "ai" | "shortcuts" | "mcp" | "about";
```

- [ ] **Step 2: Add Server icon import**

Add `Server` to the lucide-react import at line 1:

```typescript
import {
  Bot,
  Command,
  Info,
  LayoutPanelLeft,
  Palette,
  RefreshCw,
  Server,
  Settings2,
  Trash2,
} from "lucide-react";
```

- [ ] **Step 3: Add MCP sidebar button**

Insert after the shortcuts button (after line 549, before the about button):

```tsx
              <button
                className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                  activeSection === "mcp"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
                onClick={() => setActiveSection("mcp")}
              >
                <Server className="w-4 h-4" />
                {t("settings.sections.mcp")}
              </button>
```

- [ ] **Step 4: Add MCP content panel**

Insert after the shortcuts section content (before the about section), add the McpSettings import and render:

At the top of the file, add the import:

```typescript
import { McpSettings } from "./McpSettings";
```

Then add the content panel (after the shortcuts content block, before `{activeSection === "about" && (`):

```tsx
            {activeSection === "mcp" && <McpSettings />}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npx tsc --noEmit` from project root
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SettingsDialog.tsx
git commit -m "feat(mcp): integrate MCP section into SettingsDialog"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Rust compilation check**

Run: `cargo check` from `src-tauri/`
Expected: PASS

- [ ] **Step 2: TypeScript compilation check**

Run: `npx tsc --noEmit` from project root
Expected: PASS

- [ ] **Step 3: Build frontend**

Run: `bun run build` from project root
Expected: PASS

- [ ] **Step 4: Run existing tests**

Run: `cargo test` from `src-tauri/`
Expected: PASS (existing tests still pass)

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(mcp): address compilation issues"
```
