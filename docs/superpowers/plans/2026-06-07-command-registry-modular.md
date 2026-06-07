# 命令注册模块化 实现计划

> **致代理工作者：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤使用 checkbox（`- [ ]`）语法进行跟踪。

**目标：** 将 `generate_handler!` 中的 ~130 条命令按模块拆分，使新增命令时无需修改 `lib.rs`。

**架构：** 每个命令模块定义一个 `macro_rules!` 宏，展开为该模块的命令路径列表。`lib.rs` 调用这些宏组合注册所有命令。宏在编译时展开，无运行时开销。

**技术栈：** Rust `macro_rules!`、Tauri `generate_handler!`

---

## 文件结构

修改以下 12 个文件，无新建文件：

| 文件 | 变更 |
|------|------|
| `src-tauri/src/commands/connection.rs` | 末尾添加 `connection_commands!` 宏 |
| `src-tauri/src/commands/metadata.rs` | 末尾添加 `metadata_commands!` 宏 |
| `src-tauri/src/commands/query.rs` | 末尾添加 `query_commands!` 宏 |
| `src-tauri/src/commands/storage.rs` | 末尾添加 `storage_commands!` 宏 |
| `src-tauri/src/commands/ai.rs` | 末尾添加 `ai_commands!` 宏 |
| `src-tauri/src/commands/transfer.rs` | 末尾添加 `transfer_commands!` 宏 |
| `src-tauri/src/commands/redis.rs` | 末尾添加 `redis_commands!` 宏（含所有子文件命令） |
| `src-tauri/src/commands/elasticsearch.rs` | 末尾添加 `elasticsearch_commands!` 宏 |
| `src-tauri/src/commands/mongodb.rs` | 末尾添加 `mongodb_commands!` 宏 |
| `src-tauri/src/commands/system.rs` | 末尾添加 `system_commands!` 宏 |
| `src-tauri/src/commands/mcp.rs` | 末尾添加 `mcp_commands!` 宏 |
| `src-tauri/src/lib.rs` | 替换平铺命令列表为宏调用 |

---

### Task 1: connection 模块宏

**文件：**
- 修改：`src-tauri/src/commands/connection.rs`

- [ ] **步骤 1：在文件末尾添加宏**

在 `connection.rs` 的最后一个 `}` 之后添加：

```rust
#[macro_export]
macro_rules! connection_commands {
    () => {
        $crate::commands::connection::get_connections,
        $crate::commands::connection::create_connection,
        $crate::commands::connection::update_connection,
        $crate::commands::connection::delete_connection,
        $crate::commands::connection::import_connections,
        $crate::commands::connection::test_connection_ephemeral,
        $crate::commands::connection::list_databases,
        $crate::commands::connection::list_databases_by_id,
        $crate::commands::connection::create_database_by_id,
        $crate::commands::connection::get_mysql_charsets_by_id,
        $crate::commands::connection::get_mysql_collations_by_id,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

预期：编译通过（宏已定义但尚未被调用，不影响现有代码）。

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/connection.rs
git commit -m "refactor: add connection_commands! macro for modular registration"
```

---

### Task 2: metadata 模块宏

**文件：**
- 修改：`src-tauri/src/commands/metadata.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! metadata_commands {
    () => {
        $crate::commands::metadata::list_tables,
        $crate::commands::metadata::list_routines,
        $crate::commands::metadata::list_events,
        $crate::commands::metadata::list_sequences,
        $crate::commands::metadata::list_types,
        $crate::commands::metadata::list_synonyms,
        $crate::commands::metadata::list_packages,
        $crate::commands::metadata::get_table_structure,
        $crate::commands::metadata::get_table_ddl,
        $crate::commands::metadata::get_routine_ddl,
        $crate::commands::metadata::get_table_metadata,
        $crate::commands::metadata::get_schema_overview,
        $crate::commands::metadata::get_schema_foreign_keys,
        $crate::commands::metadata::list_tables_by_conn,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/metadata.rs
git commit -m "refactor: add metadata_commands! macro for modular registration"
```

---

### Task 3: query 模块宏

**文件：**
- 修改：`src-tauri/src/commands/query.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! query_commands {
    () => {
        $crate::commands::query::execute_query,
        $crate::commands::query::get_table_data,
        $crate::commands::query::cancel_query,
        $crate::commands::query::get_table_data_by_conn,
        $crate::commands::query::execute_by_conn,
        $crate::commands::query::list_sql_execution_logs,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/query.rs
git commit -m "refactor: add query_commands! macro for modular registration"
```

---

### Task 4: storage 模块宏

**文件：**
- 修改：`src-tauri/src/commands/storage.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! storage_commands {
    () => {
        $crate::commands::storage::save_query,
        $crate::commands::storage::get_saved_queries,
        $crate::commands::storage::update_saved_query,
        $crate::commands::storage::delete_saved_query,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/storage.rs
git commit -m "refactor: add storage_commands! macro for modular registration"
```

---

### Task 5: ai 模块宏

**文件：**
- 修改：`src-tauri/src/commands/ai.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! ai_commands {
    () => {
        $crate::commands::ai::ai_list_providers,
        $crate::commands::ai::ai_create_provider,
        $crate::commands::ai::ai_update_provider,
        $crate::commands::ai::ai_delete_provider,
        $crate::commands::ai::ai_set_default_provider,
        $crate::commands::ai::ai_clear_provider_api_key,
        $crate::commands::ai::ai_chat_start,
        $crate::commands::ai::ai_chat_continue,
        $crate::commands::ai::ai_list_conversations,
        $crate::commands::ai::ai_get_conversation,
        $crate::commands::ai::ai_delete_conversation,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/ai.rs
git commit -m "refactor: add ai_commands! macro for modular registration"
```

---

### Task 6: transfer 模块宏

**文件：**
- 修改：`src-tauri/src/commands/transfer.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! transfer_commands {
    () => {
        $crate::commands::transfer::export_table_data,
        $crate::commands::transfer::export_database_sql,
        $crate::commands::transfer::export_query_result,
        $crate::commands::transfer::import_sql_file,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/transfer.rs
git commit -m "refactor: add transfer_commands! macro for modular registration"
```

---

### Task 7: redis 模块宏

**文件：**
- 修改：`src-tauri/src/commands/redis.rs`

redis 模块使用 `include!()` 引入子文件，所有命令函数通过子文件注入到 `redis.rs` 的作用域中。宏定义在 `redis.rs` 末尾，可引用所有子文件中的函数。

- [ ] **步骤 1：在文件末尾添加宏**

在 `include!("redis/tests.rs")` 之后添加：

```rust
#[macro_export]
macro_rules! redis_commands {
    () => {
        // database_scan
        $crate::commands::redis::redis_list_databases,
        $crate::commands::redis::redis_scan_keys,
        // key_value
        $crate::commands::redis::redis_get_key,
        $crate::commands::redis::redis_set_key,
        $crate::commands::redis::redis_update_key,
        $crate::commands::redis::redis_delete_key,
        $crate::commands::redis::redis_rename_key,
        $crate::commands::redis::redis_set_ttl,
        $crate::commands::redis::redis_get_key_page,
        $crate::commands::redis::redis_patch_key,
        // stream_view
        $crate::commands::redis::redis_get_stream_range,
        $crate::commands::redis::redis_get_stream_view,
        // console_logs
        $crate::commands::redis::redis_execute_raw,
        $crate::commands::redis::redis_server_info,
        $crate::commands::redis::redis_server_config,
        $crate::commands::redis::redis_slowlog_get,
        $crate::commands::redis::list_redis_command_logs,
        // bitmap_geo
        $crate::commands::redis::redis_bitmap_get_bit,
        $crate::commands::redis::redis_bitmap_count,
        $crate::commands::redis::redis_bitmap_pos,
        $crate::commands::redis::redis_hll_pfadd,
        $crate::commands::redis::redis_geo_add,
        $crate::commands::redis::redis_geo_pos,
        $crate::commands::redis::redis_geo_dist,
        $crate::commands::redis::redis_geo_search,
        // zset
        $crate::commands::redis::redis_zrangebyscore,
        $crate::commands::redis::redis_zrank,
        $crate::commands::redis::redis_zscore,
        $crate::commands::redis::redis_zmscore,
        $crate::commands::redis::redis_zrangebylex,
        $crate::commands::redis::redis_zlexcount,
        $crate::commands::redis::redis_zpopmin,
        $crate::commands::redis::redis_zpopmax,
        // collections
        $crate::commands::redis::redis_set_operation,
        $crate::commands::redis::redis_sismember,
        $crate::commands::redis::redis_smove,
        $crate::commands::redis::redis_batch_key_ops,
        $crate::commands::redis::redis_mget,
        $crate::commands::redis::redis_mset,
        $crate::commands::redis::redis_lindex,
        $crate::commands::redis::redis_lpos,
        $crate::commands::redis::redis_ltrim,
        $crate::commands::redis::redis_linsert,
        $crate::commands::redis::redis_lmove,
        // stream_commands
        $crate::commands::redis::redis_xgroup_create,
        $crate::commands::redis::redis_xgroup_del,
        $crate::commands::redis::redis_xgroup_setid,
        $crate::commands::redis::redis_xack,
        $crate::commands::redis::redis_xpending,
        $crate::commands::redis::redis_xclaim,
        $crate::commands::redis::redis_xtrim,
        $crate::commands::redis::redis_xreadgroup,
        // cluster
        $crate::commands::redis::redis_cluster_info,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/redis.rs
git commit -m "refactor: add redis_commands! macro for modular registration"
```

---

### Task 8: elasticsearch 模块宏

**文件：**
- 修改：`src-tauri/src/commands/elasticsearch.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! elasticsearch_commands {
    () => {
        $crate::commands::elasticsearch::elasticsearch_test_connection,
        $crate::commands::elasticsearch::elasticsearch_test_connection_ephemeral,
        $crate::commands::elasticsearch::elasticsearch_list_indices,
        $crate::commands::elasticsearch::elasticsearch_get_index_mapping,
        $crate::commands::elasticsearch::elasticsearch_create_index,
        $crate::commands::elasticsearch::elasticsearch_delete_index,
        $crate::commands::elasticsearch::elasticsearch_refresh_index,
        $crate::commands::elasticsearch::elasticsearch_open_index,
        $crate::commands::elasticsearch::elasticsearch_close_index,
        $crate::commands::elasticsearch::elasticsearch_search_documents,
        $crate::commands::elasticsearch::elasticsearch_get_document,
        $crate::commands::elasticsearch::elasticsearch_upsert_document,
        $crate::commands::elasticsearch::elasticsearch_delete_document,
        $crate::commands::elasticsearch::elasticsearch_export_documents,
        $crate::commands::elasticsearch::elasticsearch_import_documents,
        $crate::commands::elasticsearch::elasticsearch_execute_raw,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/elasticsearch.rs
git commit -m "refactor: add elasticsearch_commands! macro for modular registration"
```

---

### Task 9: mongodb 模块宏

**文件：**
- 修改：`src-tauri/src/commands/mongodb.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! mongodb_commands {
    () => {
        $crate::commands::mongodb::mongodb_test_connection,
        $crate::commands::mongodb::mongodb_test_connection_ephemeral,
        $crate::commands::mongodb::mongodb_list_databases,
        $crate::commands::mongodb::mongodb_list_collections,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/mongodb.rs
git commit -m "refactor: add mongodb_commands! macro for modular registration"
```

---

### Task 10: system 模块宏

**文件：**
- 修改：`src-tauri/src/commands/system.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! system_commands {
    () => {
        $crate::commands::system::list_system_fonts,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/system.rs
git commit -m "refactor: add system_commands! macro for modular registration"
```

---

### Task 11: mcp 模块宏

**文件：**
- 修改：`src-tauri/src/commands/mcp.rs`

- [ ] **步骤 1：在文件末尾添加宏**

```rust
#[macro_export]
macro_rules! mcp_commands {
    () => {
        $crate::commands::mcp::mcp_status,
        $crate::commands::mcp::mcp_start,
        $crate::commands::mcp::mcp_stop,
        $crate::commands::mcp::mcp_get_tools,
        $crate::commands::mcp::mcp_detect_clients,
        $crate::commands::mcp::mcp_configure_client,
    };
}
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

- [ ] **步骤 3：提交**

```bash
git add src-tauri/src/commands/mcp.rs
git commit -m "refactor: add mcp_commands! macro for modular registration"
```

---

### Task 12: 替换 lib.rs 中的 generate_handler!

**文件：**
- 修改：`src-tauri/src/lib.rs:157-289`

- [ ] **步骤 1：替换 generate_handler! 内容**

将 `lib.rs` 第 157-289 行的 `.invoke_handler(tauri::generate_handler![...])` 替换为：

```rust
        .invoke_handler(tauri::generate_handler![
            greet,
            connection_commands!(),
            metadata_commands!(),
            query_commands!(),
            storage_commands!(),
            ai_commands!(),
            transfer_commands!(),
            redis_commands!(),
            elasticsearch_commands!(),
            mongodb_commands!(),
            system_commands!(),
            mcp_commands!(),
        ])
```

- [ ] **步骤 2：验证编译**

```bash
cargo check
```

预期：编译通过，所有 ~130 条命令通过宏正确注册。

- [ ] **步骤 3：验证 cargo test**

```bash
cargo test
```

预期：所有现有测试通过（宏展开不影响运行时行为）。

- [ ] **步骤 4：提交**

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor: replace flat generate_handler! with modular command macros"
```

---

## 自查清单

- [ ] 所有 130 条命令均通过宏注册（与原列表一一对应）
- [ ] `greet` 保持直接在 `generate_handler!` 中（lib.rs 本地函数）
- [ ] 宏使用 `$crate::commands::module::fn` 路径，确保跨模块引用正确
- [ ] `#[macro_export]` 使宏在 crate 根可用，lib.rs 中直接调用 `xxx_commands!()`
- [ ] 无运行时行为变更，仅编译时宏展开
