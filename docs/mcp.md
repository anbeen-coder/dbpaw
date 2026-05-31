# DbPaw MCP Server

DbPaw MCP Server 实现了完整的 MCP 2025-03-26 协议，支持 stdio 和 HTTP 双模传输，让 AI 助手（如 Claude、Cursor）直接访问和查询您的数据库。

## 功能特性

### 协议支持

| 能力 | 状态 | 说明 |
|------|------|------|
| **Tools** | ✅ | 7 个数据库操作工具 |
| **Resources** | ✅ | 连接、数据库、表作为可发现资源 |
| **Prompts** | ✅ | 预定义提示模板（表分析等） |
| **Completion** | ✅ | 参数自动补全 |
| **Sampling** | ✅ | 服务器反向请求 AI（需客户端支持） |
| **Notifications** | ✅ | 实时通知（资源变更、进度等） |

### Transport 模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `stdio` | 标准输入输出（默认） | Claude Desktop、Cursor 等本地客户端 |
| `http` | Streamable HTTP (SSE + POST) | 远程访问、Web 集成 |
| `both` | 同时监听 stdio 和 HTTP | 需要同时支持本地和远程 |

### 支持的工具

| 工具 | 描述 |
|------|------|
| `dbpaw_list_connections` | 列出所有保存的数据库连接 |
| `dbpaw_list_databases` | 列出指定连接的所有数据库 |
| `dbpaw_list_tables` | 列出数据库中的所有表 |
| `dbpaw_describe_table` | 获取表结构（列、索引、外键） |
| `dbpaw_get_ddl` | 获取表的 CREATE TABLE DDL |
| `dbpaw_get_schema_context` | 获取 Schema 上下文（给 AI 写 SQL 用） |
| `dbpaw_execute_query` | 执行 SQL 查询 |

### Resources（可发现资源）

AI 可以通过 URI 发现和读取数据库资源：

| URI | 内容 |
|-----|------|
| `dbpaw://connections` | 所有连接列表 |
| `dbpaw://connections/{id}` | 单个连接详情 |
| `dbpaw://connections/{id}/databases` | 数据库列表 |
| `dbpaw://connections/{id}/{db}/tables` | 表列表 |
| `dbpaw://connections/{id}/{db}/tables/{table}` | 表结构 + 样本数据 |

### Prompts（预定义模板）

| Prompt | 描述 | 参数 |
|--------|------|------|
| `analyze_table` | 分析表结构，给出优化建议 | `connection_id`, `database`, `table` |

### 支持的数据库

- PostgreSQL
- MySQL / MariaDB / TiDB
- SQLite
- SQL Server
- ClickHouse
- DuckDB
- Oracle

## 快速开始

### 1. 编译 MCP Server

```bash
cd src-tauri
cargo build --bin dbpaw-mcp
```

### 2. 选择 Transport 模式

#### stdio 模式（默认）

适用于 Claude Desktop、Cursor 等本地客户端。

#### HTTP 模式

```bash
./target/debug/dbpaw-mcp --transport http --port 3000
```

默认监听 `127.0.0.1:3000`。远程访问需指定 `--host 0.0.0.0`。

#### 双模式

```bash
./target/debug/dbpaw-mcp --transport both --port 3000
```

### 3. 配置 AI 助手

#### Claude Desktop

运行配置脚本：

```bash
./scripts/setup-mcp.sh
```

或手动编辑配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dbpaw": {
      "command": "/path/to/dbpaw/src-tauri/target/debug/dbpaw-mcp",
      "args": []
    }
  }
}
```

HTTP 模式配置：

```json
{
  "mcpServers": {
    "dbpaw": {
      "command": "/path/to/dbpaw-mcp",
      "args": ["--transport", "http", "--port", "3000"]
    }
  }
}
```

#### Cursor

运行配置脚本：

```bash
./scripts/setup-mcp.sh
```

或手动编辑配置文件：

**macOS/Linux**: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "dbpaw": {
      "command": "/path/to/dbpaw/src-tauri/target/debug/dbpaw-mcp",
      "args": []
    }
  }
}
```

### 4. 重启 AI 助手

重启 Claude Desktop 或 Cursor 以加载新的 MCP Server 配置。

## CLI 参数

```
Usage: dbpaw-mcp [OPTIONS]
  --transport <stdio|http|both>  Transport mode (default: stdio)
  --port <PORT>                  HTTP port (default: 3000)
  --host <HOST>                  HTTP bind address (default: 127.0.0.1)
  --help, -h                     Show help
```

## 使用示例

### 列出所有连接

```
请帮我列出 DbPaw 中所有的数据库连接
```

### 查询数据库

```
请查询 production 数据库中 users 表的前 10 条记录
```

### 获取表结构

```
请描述 orders 表的结构
```

### 获取 Schema 上下文

```
请获取 mydb 数据库的 schema 上下文，我需要写 SQL 查询
```

### 使用 Resources

AI 可以直接读取资源：

```
读取 dbpaw://connections 资源，列出所有连接
```

### 使用 Prompts

```
使用 analyze_table prompt 分析 production.users 表
```

## 安全设置

### 默认行为

默认情况下，MCP Server 处于**只读模式**，禁止写操作和危险操作。

### 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `DBPAW_MCP_ALLOW_WRITES` | `0` | 设为 `1` 允许 INSERT/UPDATE/DELETE |
| `DBPAW_MCP_ALLOW_DANGEROUS` | `0` | 设为 `1` 允许 DROP/TRUNCATE/ALTER |
| `DBPAW_MCP_MAX_ROWS` | `100` | 查询结果最大返回行数 |

### 配置示例

在 Claude Desktop 配置中添加环境变量：

```json
{
  "mcpServers": {
    "dbpaw": {
      "command": "/path/to/dbpaw-mcp",
      "args": [],
      "env": {
        "DBPAW_MCP_ALLOW_WRITES": "1",
        "DBPAW_MCP_MAX_ROWS": "50"
      }
    }
  }
}
```

## SQL 安全检查

MCP Server 包含多层 SQL 安全检查：

1. **空检查**：拒绝空 SQL 语句
2. **单语句检查**：拒绝多语句（防止 `;` 注入）
3. **危险关键字检查**：拒绝 DROP/TRUNCATE/ALTER（除非启用）
4. **只读检查**：拒绝写操作（除非启用）
5. **WHERE 强制**：UPDATE/DELETE 必须有 WHERE 子句

## HTTP Transport API

当使用 HTTP 模式时，提供以下端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/mcp` | POST | 接收 JSON-RPC 请求，返回响应 |
| `/mcp` | GET | 建立 SSE 连接，接收通知 |
| `/mcp` | DELETE | 终止会话 |

### Session 管理

通过 `Mcp-Session-Id` header 维护会话状态。

### 安全

HTTP transport 默认只监听 `127.0.0.1`，不暴露到网络。如需远程访问：

```bash
dbpaw-mcp --transport http --host 0.0.0.0 --port 3000
```

## 故障排除

### MCP Server 无法启动

1. 检查二进制文件是否存在
2. 确认有执行权限：`chmod +x dbpaw-mcp`
3. 检查是否有依赖问题

### AI 助手无法连接

1. 确认配置文件路径正确
2. 重启 AI 助手
3. 检查 MCP Server 进程是否在运行

### 查询失败

1. 检查连接配置是否正确
2. 确认数据库连接可用
3. 检查 SQL 是否符合安全策略

## 开发说明

### 目录结构

```
src-tauri/src/mcp/
├── main.rs                # 二进制入口（CLI 参数）
├── mod.rs                 # 模块声明
├── server.rs              # McpServer（多 transport 支持）
├── handler.rs             # 协议分发器（完整 MCP 2025-03-26）
├── transport/
│   ├── mod.rs             # Transport trait
│   ├── stdio.rs           # StdioTransport (async)
│   └── http.rs            # StreamableHttpTransport (axum)
├── types.rs               # 协议类型
├── sql_safety.rs          # SQL 安全检查
├── notifications.rs       # NotificationBus
├── sampling.rs            # Sampling handler
├── tools/
│   ├── mod.rs             # 工具注册
│   ├── connection.rs      # 连接管理
│   ├── schema.rs          # Schema 上下文
│   └── sql.rs             # SQL 查询
├── resources/
│   ├── mod.rs             # ResourceRegistry
│   ├── connections.rs     # 连接资源
│   └── tables.rs          # 表资源
└── prompts/
    ├── mod.rs             # PromptRegistry
    └── analyze_table.rs   # 表分析 prompt
```

### 扩展工具

要添加新的 MCP 工具：

1. 在 `tools/mod.rs` 中注册工具定义
2. 实现工具函数
3. 在 `tools/mod.rs` 的 `execute_tool` 函数中添加路由

### 扩展 Resources

要添加新的 Resource：

1. 在 `resources/` 下创建新模块
2. 在 `resources/mod.rs` 中注册 URI 路由
3. 实现 `get_definitions()` 和 `get_templates()`

### 扩展 Prompts

要添加新的 Prompt：

1. 在 `prompts/` 下创建新模块
2. 在 `prompts/mod.rs` 中注册
3. 实现 `get_definition()` 和 `execute()`

### 测试

```bash
# 测试 initialize
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | ./target/debug/dbpaw-mcp

# 测试 tools/list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | ./target/debug/dbpaw-mcp

# 测试 resources/list
echo '{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}' | ./target/debug/dbpaw-mcp

# 测试 prompts/list
echo '{"jsonrpc":"2.0","id":1,"method":"prompts/list","params":{}}' | ./target/debug/dbpaw-mcp
```
