# Command Registry Modularization

**Date:** 2026-06-07
**Problem:** The `generate_handler!` macro in `src-tauri/src/lib.rs:157-289` contains ~130 commands in a flat list. Adding a new command requires touching this list, which causes merge conflicts and forgotten registrations.

## Current State

- `lib.rs` — single flat `generate_handler![...]` with all commands
- `commands/` — already organized into modules (`connection.rs`, `metadata.rs`, `query.rs`, `redis.rs`, etc.)
- `api.ts` — already grouped by domain
- `mocks/` — already grouped by handler

The modules are well-organized. The only bottleneck is the centralized registration list.

## Approach: `macro_rules!` per module

Each command module defines a `macro_rules!` macro that expands to its command paths. lib.rs composes them inside `generate_handler!`.

### Pattern

In each module file (e.g., `commands/redis.rs`):

```rust
#[macro_export]
macro_rules! redis_commands {
    () => {
        $crate::commands::redis::redis_list_databases,
        $crate::commands::redis::redis_scan_keys,
        // ... all redis commands
    }
}
```

In `lib.rs`:

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

### Files to modify (12 total, no new files)

| File | Change |
|------|--------|
| `src-tauri/src/lib.rs` | Replace flat command list with macro calls |
| `src-tauri/src/commands/connection.rs` | Add `connection_commands!` macro |
| `src-tauri/src/commands/metadata.rs` | Add `metadata_commands!` macro |
| `src-tauri/src/commands/query.rs` | Add `query_commands!` macro |
| `src-tauri/src/commands/storage.rs` | Add `storage_commands!` macro |
| `src-tauri/src/commands/ai.rs` | Add `ai_commands!` macro |
| `src-tauri/src/commands/transfer.rs` | Add `transfer_commands!` macro |
| `src-tauri/src/commands/redis.rs` | Add `redis_commands!` macro |
| `src-tauri/src/commands/elasticsearch.rs` | Add `elasticsearch_commands!` macro |
| `src-tauri/src/commands/mongodb.rs` | Add `mongodb_commands!` macro |
| `src-tauri/src/commands/system.rs` | Add `system_commands!` macro |
| `src-tauri/src/commands/mcp.rs` | Add `mcp_commands!` macro |

### Command counts per module

- `connection` — 10 commands
- `metadata` — 12 commands
- `query` — 5 commands
- `storage` — 4 commands
- `ai` — 10 commands
- `transfer` — 4 commands
- `redis` — 55 commands (uses `include!()` sub-files)
- `elasticsearch` — 16 commands
- `mongodb` — 4 commands
- `system` — 1 command
- `mcp` — 6 commands

### What changes for developers adding a new command

**Before:** Write the command in the module file, then edit lib.rs to add it to the flat list.

**After:** Write the command in the module file, add it to that module's macro. lib.rs never changes for command registration.

### What does NOT change

- No changes to `api.ts` or `mocks/`
- No changes to test files
- No new files created
- No runtime behavior change — macros expand at compile time
- `greet` stays directly in `generate_handler!` (it's lib.rs-local)

### Verification

After implementation, run `cargo check` to verify all macros expand correctly and all commands are properly registered.
