# MCP Server 协议完整性增强设计

> 日期：2026-05-31
> 状态：待用户审批（已自审）
> 范围：将 DbPaw MCP Server 从当前的 7 工具单薄实现升级为完整的 MCP 2025-03-26 协议服务器

---

## 1. 背景与目标

当前 DbPaw MCP Server 是一个独立的 Rust 二进制 (`dbpaw-mcp`)，通过 stdio JSON-RPC 2.0 与 AI Agent 通信。实现包括 7 个工具、stdio-only 传输、Resources/Prompts 均为 stub。

**目标**：升级为 MCP 2025-03-26 协议的完整实现，包括：
- Streamable HTTP transport（双模：stdio + HTTP）
- Resources 深度实现（连接、数据库、表作为可发现资源）
- Prompts 预定义模板
- Sampling 服务器反向请求 AI
- Notifications/Progress 实时通知

**不包括**：OAuth 2.1 授权（本地使用场景不需要）。

---

## 2. 架构方案

**方案选择**：自研协议层 + axum HTTP Transport（方案 B）。

**理由**：当前实现已是不错的自研基础，axum 是 Rust 生态标准 HTTP 框架，自研能确保与 DbPaw 的 AppState、连接管理等完美融合，且避免引入外部 MCP SDK 的适配成本。

### 2.1 整体架构

```
                         AI Agent (Claude / Cursor / Remote Client)
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
             StdioTransport    StreamableHttpTransport   │
             (stdin/stdout)    (axum, SSE + POST)        │
                    │                  │                  │
                    └────────┬─────────┘                  │
                             ▼                            │
                    ┌─────────────────┐                   │
                    │  Protocol Layer │                   │
                    │  (JSON-RPC 2.0) │                   │
                    │  dispatch →     │                   │
                    │  tools/         │                   │
                    │  resources/     │                   │
                    │  prompts/       │                   │
                    │  sampling/      │                   │
                    │  notifications/ │                   │
                    └────────┬────────┘                   │
                             ▼                            │
                    ┌─────────────────┐                   │
                    │   AppState      │◄──────────────────┘
                    │   (shared)      │
                    └────────┬────────┘
                             ▼
                    Database Drivers
```

---

## 3. Transport 层

### 3.1 Transport Trait

```rust
#[async_trait]
pub trait Transport: Send + Sync {
    async fn receive(&mut self) -> Result<Option<JsonRpcRequest>, TransportError>;
    async fn send(&mut self, response: &JsonRpcResponse) -> Result<(), TransportError>;
    async fn close(&mut self) -> Result<(), TransportError>;
}
```

### 3.2 StdioTransport

保持现有逻辑，改为 tokio async IO。

**通知推送机制**：StdioTransport 是半双工的（请求-响应模式），不能异步推送通知。解决方案：在每次发送响应后，检查 NotificationBus 中是否有 pending 的 notifications，一并写入 stdout。这确保通知不会与响应消息交叉。

### 3.3 StreamableHttpTransport

基于 axum 实现，遵循 MCP 2025-03-26 规范：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/mcp` | `POST` | 接收 JSON-RPC 请求，返回 JSON-RPC 响应（或 SSE 流） |
| `/mcp` | `GET` | 建立 SSE 连接，接收服务器推送的 notifications |
| `/mcp` | `DELETE` | 终止会话 |

Session 管理通过 `Mcp-Session-Id` header 维护。

**安全考虑**：HTTP transport 默认只监听 `127.0.0.1`（本地回环），不暴露到网络。如需远程访问，用户需显式指定 `--host 0.0.0.0`。无 OAuth，依赖网络隔离保护。

### 3.4 启动方式

```bash
dbpaw-mcp                          # stdio 模式（默认，兼容现有）
dbpaw-mcp --transport http --port 3000   # HTTP 模式
dbpaw-mcp --transport both --port 3000   # 双模式
```

### 3.5 新增依赖

```toml
axum = "0.8"
tower = "0.5"
tower-http = "0.6"
```

---

## 4. 协议层（Protocol Layer）

### 4.1 协议版本

升级到 MCP `2025-03-26`。`initialize` 响应返回新的 `protocolVersion`。

### 4.2 方法分发

| 方法 | 类型 | 当前状态 | 目标状态 |
|------|------|---------|---------|
| `initialize` | 核心 | ✅ 已实现 | 更新 capabilities |
| `initialized` | 核心 | ✅ 已实现 | 保持 |
| `ping` | 核心 | ✅ 已实现 | 保持 |
| `tools/list` | Tools | ✅ 已实现 | 保持 |
| `tools/call` | Tools | ✅ 已实现 | 保持 |
| `resources/list` | Resources | stub | **完整实现** |
| `resources/read` | Resources | stub | **完整实现** |
| `resources/subscribe` | Resources | ❌ | **新增** |
| `resources/unsubscribe` | Resources | ❌ | **新增** |
| `resources/templates/list` | Resources | ❌ | **新增** |
| `prompts/list` | Prompts | ❌ | **新增** |
| `prompts/get` | Prompts | ❌ | **新增** |
| `sampling/createMessage` | Sampling | ❌ | **新增** |
| `completion/complete` | Completion | ❌ | **新增**（为 Prompts 和 Resources 提供参数自动补全） |
| `notifications/*` | Notifications | ❌ | **新增** |

### 4.3 Capabilities 声明

```json
{
  "capabilities": {
    "tools": { "listChanged": true },
    "resources": { "subscribe": true, "listChanged": true },
    "prompts": { "listChanged": true },
    "sampling": {},
    "logging": {}
  }
}
```

---

## 5. Resources 深度实现

### 5.1 Resource URI 设计

```
dbpaw://connections                          → 所有连接列表
dbpaw://connections/{id}                     → 单个连接详情
dbpaw://connections/{id}/databases           → 数据库列表
dbpaw://connections/{id}/{db}/tables         → 表列表
dbpaw://connections/{id}/{db}/tables/{table} → 表结构 + 数据样本
```

### 5.2 Resource 类型

| URI 模板 | MIME Type | 内容 |
|----------|-----------|------|
| `dbpaw://connections` | `application/json` | 连接列表 JSON |
| `dbpaw://connections/{id}` | `application/json` | 连接详情 JSON |
| `dbpaw://connections/{id}/databases` | `application/json` | 数据库列表 JSON |
| `dbpaw://connections/{id}/{db}/tables` | `application/json` | 表列表 JSON |
| `dbpaw://connections/{id}/{db}/tables/{table}` | `text/markdown` | 表结构 Markdown（含前 5 行样本数据） |

### 5.3 Resource Templates

使用 URI Template（RFC 6570）让 AI 可以动态构造 URI：

```json
{
  "uriTemplate": "dbpaw://connections/{connection_id}/{database}/tables/{table}",
  "name": "table_detail",
  "description": "Table structure and sample data",
  "mimeType": "text/markdown"
}
```

### 5.4 Subscribe/Unsubscribe

客户端可以订阅特定资源的变更通知。当数据库表结构变化（如 DDL 执行后），服务器发送 `notifications/resources/updated`。

### 5.5 模块结构

```
src/mcp/resources/
├── mod.rs          → ResourceRegistry, URI 路由
├── connections.rs  → dbpaw://connections/* 处理
└── tables.rs       → dbpaw://connections/{id}/{db}/tables/* 处理
```

---

## 6. Prompts 实现

### 6.1 内置 Prompt 模板

| Prompt 名称 | 描述 | 参数 |
|-------------|------|------|
| `analyze_table` | 分析表结构，给出优化建议 | `connection_id`, `database`, `table` |
| `generate_ddl` | 根据描述生成 CREATE TABLE 语句 | `description`, `db_type` |
| `optimize_query` | 分析 SQL 查询并给出优化建议 | `connection_id`, `database`, `sql` |
| `explain_query` | 用通俗语言解释 SQL 查询 | `sql` |
| `generate_migration` | 生成表结构变更的迁移 SQL | `connection_id`, `database`, `table`, `changes` |
| `data_report` | 生成数据统计报告 | `connection_id`, `database`, `table` |

### 6.2 Prompt 响应格式

```json
{
  "description": "分析 users 表结构",
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "请分析以下表结构并给出优化建议：\n\n## users\n- id bigint NOT NULL PK\n- email varchar(255) NOT NULL\n..."
      }
    }
  ]
}
```

### 6.3 模块结构

```
src/mcp/prompts/
├── mod.rs              → PromptRegistry, 路由分发
├── analyze_table.rs    → 表分析 prompt
├── generate_ddl.rs     → DDL 生成 prompt
├── optimize_query.rs   → 查询优化 prompt
└── ...
```

---

## 7. Sampling 实现

### 7.1 概述

Sampling 允许 MCP 服务器反向请求 AI 生成内容。服务器调用 `sampling/createMessage`，客户端弹出确认框让用户批准，然后将请求转发给 AI 模型。

### 7.2 使用场景

| 场景 | 说明 |
|------|------|
| 智能查询建议 | 根据表结构，请求 AI 生成常用查询 |
| 错误修复建议 | SQL 执行失败时，请求 AI 分析错误并建议修正 |
| 数据分析辅助 | 请求 AI 对查询结果进行分析总结 |

### 7.3 限制

- Sampling 需要客户端支持（Claude Desktop 支持，Cursor 可能不支持）
- 必须有用户确认步骤（MCP 规范要求）
- 服务器不应依赖 Sampling 作为核心功能，应作为增强体验

---

## 8. Completion（自动补全）

### 8.1 概述

`completion/complete` 方法为 Prompts 和 Resources 的参数提供自动补全。当用户在 AI 客户端中输入 Prompt 参数（如表名、数据库名）时，客户端调用此方法获取候选值。

### 8.2 补全场景

| 参数来源 | 补全内容 |
|----------|----------|
| `connection_id` | 从已保存连接列表中补全 |
| `database` | 从指定连接的数据库列表中补全 |
| `table` | 从指定数据库的表列表中补全 |

### 8.3 请求格式

```json
{
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/prompt", "name": "analyze_table" },
    "argument": { "name": "table", "value": "use" }
  }
}
```

响应返回匹配的补全列表：`{ "completion": { "values": ["users", "user_sessions"], "hasMore": false } }`

---

## 9. Notifications 和 Progress

### 9.1 架构

```
┌─────────────────────────┐
│    NotificationBus      │ ← 发布-订阅模式
│    (channel-based)      │
├─────────────────────────┤
│ tokio::broadcast::Sender│
└──────────┬──────────────┘
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
 Stdio   HTTP    ...
Transport Transport
```

使用 `tokio::broadcast` channel，任何模块都可以发送通知，所有活跃的 transport 都能接收并推送给客户端。

### 9.2 通知类型

- `notifications/tools/list_changed` — 工具列表变化
- `notifications/resources/list_changed` — 资源列表变化
- `notifications/resources/updated` — 某个资源内容更新
- `notifications/prompts/list_changed` — 提示模板列表变化
- `notifications/progress` — 长时间操作的进度
- `notifications/log` — 日志消息

### 9.3 Progress 通知

```json
{
  "method": "notifications/progress",
  "params": {
    "progressToken": "schema-build-123",
    "progress": 5,
    "total": 20,
    "message": "Loading table 5/20: orders"
  }
}
```

### 9.4 实现

```rust
pub struct NotificationBus {
    sender: broadcast::Sender<McpNotification>,
}

impl NotificationBus {
    pub fn notify(&self, notification: McpNotification) { ... }
    pub fn subscribe(&self) -> broadcast::Receiver<McpNotification> { ... }
}
```

每个 transport 实例在创建时获得一个 `Receiver`，在发送响应的间隙检查并推送 pending 的 notifications。

---

## 10. 目录结构

```
src-tauri/src/mcp/
├── main.rs                # 二进制入口（扩展 CLI 参数）
├── mod.rs                 # 模块声明
├── server.rs              # McpServer（重构，支持多 transport）
├── handler.rs             # 协议分发器（扩展）
├── transport/
│   ├── mod.rs             # Transport trait
│   ├── stdio.rs           # StdioTransport (async)
│   └── http.rs            # StreamableHttpTransport (axum)
├── types.rs               # 协议类型（扩展）
├── sql_safety.rs          # SQL 安全检查（保持）
├── notifications.rs       # NotificationBus（新增）
├── tools/                 # 现有，保持
│   ├── mod.rs
│   ├── connection.rs
│   ├── schema.rs
│   └── sql.rs
├── resources/             # 新增
│   ├── mod.rs             # ResourceRegistry
│   ├── connections.rs
│   └── tables.rs
├── prompts/               # 新增
│   ├── mod.rs             # PromptRegistry
│   ├── analyze_table.rs
│   ├── generate_ddl.rs
│   └── ...
└── sampling.rs            # 新增，Sampling 处理
```

---

## 11. 实施阶段

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| **Phase 1** | Transport trait 重构 + async StdioTransport + axum HTTP Transport + CLI 参数 | HTTP transport 可用，双模启动 |
| **Phase 2** | Resources 深度实现（URI 路由、subscribe、templates） | AI 可发现和读取数据库资源 |
| **Phase 3** | Prompts 实现 + Sampling 实现 | 预定义模板可用，AI 反向请求可用 |
| **Phase 4** | Notifications/Progress + 协议版本升级 + 测试 + 文档更新 | 完整的 MCP 2025-03-26 服务器 |

每个阶段独立可交付、可测试。

---

## 12. 当前实现保有

以下现有代码保持不变，仅做接口适配：

- `tools/` — 所有 7 个工具保持现有实现
- `sql_safety.rs` — SQL 安全检查逻辑不变
- `types.rs` — 基础 JSON-RPC 类型不变，扩展新增类型
- `AppState` — 共享状态不变

---

## 13. 新增 Cargo 依赖

```toml
axum = "0.8"
tower = "0.5"
tower-http = "0.6"
```

无外部 MCP SDK 依赖，纯自研协议层。

---

## 14. 测试策略

### 14.1 单元测试

- Transport trait 的 mock 实现，测试协议层逻辑
- ResourceRegistry URI 匹配和解析
- PromptRegistry 参数验证和响应生成
- NotificationBus 发布/订阅机制
- Completion 参数匹配和排序

### 14.2 集成测试

- 扩展 `mcp_integration.rs`，测试 HTTP transport 端到端流程
- 测试 stdio + HTTP 双模启动
- 测试 Resource subscribe/unsubscribe 和通知推送
- 测试 Prompts 端到端调用
- 测试 Completion 端到端补全

### 14.3 手动测试

- 使用 Claude Desktop 连接 HTTP transport，验证完整工作流
- 验证 Resources 在 Claude Desktop 中的展示
- 验证 Prompts 在 Claude Desktop 中的可用性
