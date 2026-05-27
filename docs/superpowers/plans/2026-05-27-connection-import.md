# Connection Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import database connections from DBeaver (JSON) and Navicat (NCX) files into DbPaw.

**Architecture:** Rust-side parsing in new `import/` module, single Tauri command for batch import, frontend button in sidebar header with file dialog.

**Tech Stack:** Rust, `serde_json` (existing), `quick-xml` (new), Tauri v2, TypeScript, React

---

## File Structure

| File | Responsibility |
|---|---|
| `src-tauri/Cargo.toml` | Add `quick-xml` dependency |
| `src-tauri/src/import/mod.rs` | Format detection, import orchestration, name deduplication |
| `src-tauri/src/import/dbeaver.rs` | Parse DBeaver `data-sources.json` to `Vec<ConnectionForm>` |
| `src-tauri/src/import/navicat.rs` | Parse Navicat `.ncx` XML to `Vec<ConnectionForm>` |
| `src-tauri/src/lib.rs` | Register `mod import` and `import_connections` command |
| `src-tauri/src/commands/connection.rs` | Add `import_connections` Tauri command |
| `src/services/api.ts` | Add `api.connections.importFromFile()` |
| `src/services/mocks.ts` | Add mock for `import_connections` |
| `src/components/business/Sidebar/ConnectionList.tsx` | Import button + handler |
| `src/lib/i18n/locales/en.ts` | English i18n keys |
| `src/lib/i18n/locales/zh.ts` | Chinese i18n keys |

---

### Task 1: Add quick-xml dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add quick-xml to Cargo.toml**

Add after line 58 (`urlencoding = "2.1"`):

```toml
quick-xml = "0.37"
```

- [ ] **Step 2: Verify it compiles**

Run: `cargo check` in `src-tauri/`

Expected: Compiles without errors (quick-xml has no problematic transitive deps)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "deps: add quick-xml for Navicat NCX parsing"
```

---

### Task 2: DBeaver JSON parser

**Files:**
- Create: `src-tauri/src/import/dbeaver.rs`

- [ ] **Step 1: Create dbeaver.rs with parser**

```rust
use crate::models::ConnectionForm;
use serde_json::Value;

/// Maps DBeaver provider names to DbPaw driver names.
fn map_provider_to_driver(provider: &str) -> Option<&'static str> {
    match provider {
        "postgresql" => Some("postgres"),
        "mysql" => Some("mysql"),
        "mariadb" => Some("mariadb"),
        "tidb" => Some("tidb"),
        "sqlite" => Some("sqlite"),
        "duckdb" => Some("duckdb"),
        "clickhouse" => Some("clickhouse"),
        "sqlserver" => Some("mssql"),
        "oracle" => Some("oracle"),
        "db2" => Some("db2"),
        "redis" => Some("redis"),
        "elasticsearch" => Some("elasticsearch"),
        "mongodb" => Some("mongodb"),
        "cassandra" => Some("cassandra"),
        "starrocks" => Some("starrocks"),
        "doris" => Some("doris"),
        _ => None,
    }
}

/// Parse DBeaver data-sources.json into ConnectionForm list.
/// Returns (parsed_forms, skipped_count).
pub fn parse_dbeaver_json(content: &str) -> Result<(Vec<ConnectionForm>, usize), String> {
    let root: Value =
        serde_json::from_str(content).map_err(|e| format!("DBeaver JSON parse failed: {e}"))?;

    let obj = root
        .as_object()
        .ok_or_else(|| "DBeaver JSON: expected top-level object".to_string())?;

    let mut forms = Vec::new();
    let mut skipped = 0usize;

    for (_key, entry) in obj {
        let provider = entry
            .get("provider")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let driver = match map_provider_to_driver(provider) {
            Some(d) => d.to_string(),
            None => {
                skipped += 1;
                continue;
            }
        };

        let config = entry.get("configuration").unwrap_or(&Value::Null);

        let name = entry
            .get("name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let host = config
            .get("host")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let port = config
            .get("port")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i64>().ok())
            .or_else(|| config.get("port").and_then(|v| v.as_i64()));

        let database = config
            .get("database")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let username = config
            .get("user")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        forms.push(ConnectionForm {
            driver,
            name,
            host,
            port,
            database,
            username,
            ..Default::default()
        });
    }

    Ok((forms, skipped))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_dbeaver_json_basic() {
        let json = r#"{
            "conn-1": {
                "provider": "postgresql",
                "name": "My PG",
                "configuration": {
                    "host": "localhost",
                    "port": "5432",
                    "database": "mydb",
                    "user": "admin"
                }
            }
        }"#;
        let (forms, skipped) = parse_dbeaver_json(json).unwrap();
        assert_eq!(skipped, 0);
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0].driver, "postgres");
        assert_eq!(forms[0].name.as_deref(), Some("My PG"));
        assert_eq!(forms[0].host.as_deref(), Some("localhost"));
        assert_eq!(forms[0].port, Some(5432));
    }

    #[test]
    fn test_parse_dbeaver_skips_unsupported() {
        let json = r#"{
            "conn-1": { "provider": "snowflake", "configuration": {} },
            "conn-2": { "provider": "mysql", "configuration": { "host": "db.example.com" } }
        }"#;
        let (forms, skipped) = parse_dbeaver_json(json).unwrap();
        assert_eq!(skipped, 1);
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0].driver, "mysql");
    }

    #[test]
    fn test_parse_dbeaver_empty_object() {
        let json = r#"{}"#;
        let (forms, skipped) = parse_dbeaver_json(json).unwrap();
        assert_eq!(skipped, 0);
        assert_eq!(forms.len(), 0);
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cargo test --lib import::dbeaver`

Expected: All 3 tests pass

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/import/dbeaver.rs
git commit -m "feat: add DBeaver JSON connection parser"
```

---

### Task 3: Navicat NCX parser

**Files:**
- Create: `src-tauri/src/import/navicat.rs`

- [ ] **Step 1: Create navicat.rs with parser**

```rust
use crate::models::ConnectionForm;
use quick_xml::events::Event;
use quick_xml::Reader;

/// Maps Navicat ConnType to DbPaw driver names.
fn map_conn_type_to_driver(conn_type: &str) -> Option<&'static str> {
    match conn_type.to_uppercase().as_str() {
        "MYSQL" => Some("mysql"),
        "MARIADB" => Some("mariadb"),
        "POSTGRESQL" => Some("postgres"),
        "ORACLE" => Some("oracle"),
        "SQLITE" => Some("sqlite"),
        "MSSQL" => Some("mssql"),
        "MONGODB" => Some("mongodb"),
        "REDIS" => Some("redis"),
        "CLICKHOUSE" => Some("clickhouse"),
        _ => None,
    }
}

fn attr_value(attrs: &[quick_xml::events::Attribute], key: &str) -> Option<String> {
    attrs
        .iter()
        .find(|a| a.key.as_ref() == key.as_bytes())
        .and_then(|a| std::str::from_utf8(&a.value).ok())
        .map(|s| s.to_string())
}

/// Parse Navicat .ncx XML into ConnectionForm list.
/// Returns (parsed_forms, skipped_count).
pub fn parse_navicat_ncx(content: &str) -> Result<(Vec<ConnectionForm>, usize), String> {
    let mut reader = Reader::from_str(content);
    reader.config_mut().trim_text(true);

    let mut forms = Vec::new();
    let mut skipped = 0usize;
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Empty(ref e)) | Ok(Event::Start(ref e)) => {
                let tag_name = std::str::from_utf8(e.name().as_ref()).unwrap_or("");
                if tag_name == "Connection" {
                    let attrs = e.attributes().collect::<Result<Vec<_>, _>>().map_err(
                        |e| format!("Navicat NCX: failed to read attributes: {e}"),
                    )?;

                    let conn_type = attr_value(&attrs, "ConnType").unwrap_or_default();
                    let driver = match map_conn_type_to_driver(&conn_type) {
                        Some(d) => d.to_string(),
                        None => {
                            skipped += 1;
                            continue;
                        }
                    };

                    let name = attr_value(&attrs, "ConnectionName");
                    let host = attr_value(&attrs, "Host");
                    let port = attr_value(&attrs, "Port").and_then(|s| s.parse::<i64>().ok());
                    let database = attr_value(&attrs, "DatabaseName");
                    let username = attr_value(&attrs, "UserName");
                    let ssl = attr_value(&attrs, "SSL")
                        .map(|s| s.to_lowercase() == "true" || s == "1");
                    let ssh_host = attr_value(&attrs, "SSHHost");
                    let ssh_port =
                        attr_value(&attrs, "SSHPort").and_then(|s| s.parse::<i64>().ok());
                    let ssh_username = attr_value(&attrs, "SSHUserName");
                    let ssh_key_path = attr_value(&attrs, "SSHKeyFile");

                    let ssh_enabled = ssh_host.as_deref().map(|h| !h.is_empty());

                    forms.push(ConnectionForm {
                        driver,
                        name,
                        host,
                        port,
                        database,
                        username,
                        ssl,
                        ssh_enabled,
                        ssh_host,
                        ssh_port,
                        ssh_username,
                        ssh_key_path,
                        ..Default::default()
                    });
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("Navicat NCX parse failed: {e}")),
            _ => {}
        }
        buf.clear();
    }

    Ok((forms, skipped))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_navicat_basic() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<Connections>
  <Connection ConnectionName="My PG" ConnType="POSTGRESQL" Host="localhost" Port="5432" DatabaseName="mydb" UserName="admin" />
</Connections>"#;
        let (forms, skipped) = parse_navicat_ncx(xml).unwrap();
        assert_eq!(skipped, 0);
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0].driver, "postgres");
        assert_eq!(forms[0].name.as_deref(), Some("My PG"));
    }

    #[test]
    fn test_parse_navicat_with_ssh() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<Connections>
  <Connection ConnectionName="SSH MySQL" ConnType="MYSQL" Host="db.internal" Port="3306" DatabaseName="app" UserName="root" SSHHost="bastion.example.com" SSHPort="22" SSHUserName="ec2-user" SSHKeyFile="/path/to/key" />
</Connections>"#;
        let (forms, _) = parse_navicat_ncx(xml).unwrap();
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0].ssh_host.as_deref(), Some("bastion.example.com"));
        assert_eq!(forms[0].ssh_port, Some(22));
        assert_eq!(forms[0].ssh_enabled, Some(true));
    }

    #[test]
    fn test_parse_navicat_skips_unsupported() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<Connections>
  <Connection ConnectionName="DB2" ConnType="DB2" Host="localhost" />
  <Connection ConnectionName="SQLite" ConnType="SQLITE" />
</Connections>"#;
        let (forms, skipped) = parse_navicat_ncx(xml).unwrap();
        assert_eq!(skipped, 1); // DB2 not in Navicat mapping
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0].driver, "sqlite");
    }

    #[test]
    fn test_parse_navicat_empty() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<Connections></Connections>"#;
        let (forms, skipped) = parse_navicat_ncx(xml).unwrap();
        assert_eq!(skipped, 0);
        assert_eq!(forms.len(), 0);
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cargo test --lib import::navicat`

Expected: All 4 tests pass

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/import/navicat.rs
git commit -m "feat: add Navicat NCX connection parser"
```

---

### Task 4: Import module entry point

**Files:**
- Create: `src-tauri/src/import/mod.rs`

- [ ] **Step 1: Create mod.rs with format detection and orchestration**

```rust
pub mod dbeaver;
pub mod navicat;

use crate::connection_input::normalize_connection_form;
use crate::db::local::LocalDb;
use crate::models::{Connection, ConnectionForm};
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub imported: Vec<Connection>,
    pub skipped: usize,
}

enum ImportFormat {
    DBeaver,
    Navicat,
}

fn detect_format(path: &str) -> Result<ImportFormat, String> {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "json" => Ok(ImportFormat::DBeaver),
        "ncx" => Ok(ImportFormat::Navicat),
        _ => Err(format!(
            "Unsupported file format '.{ext}'. Supported: .json (DBeaver), .ncx (Navicat)"
        )),
    }
}

/// Deduplicate connection names against existing names.
/// Appends " (1)", " (2)", etc. until unique.
fn deduplicate_name(base: &str, existing: &mut Vec<String>) -> String {
    if !existing.iter().any(|n| n == base) {
        existing.push(base.to_string());
        return base.to_string();
    }
    let mut counter = 1u32;
    loop {
        let candidate = format!("{base} ({counter})");
        if !existing.iter().any(|n| n == &candidate) {
            existing.push(candidate.clone());
            return candidate;
        }
        counter += 1;
    }
}

pub async fn import_from_file(path: &str, local_db: &LocalDb) -> Result<ImportResult, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Cannot read file: {e}"))?;

    let format = detect_format(path)?;

    let (mut forms, skipped) = match format {
        ImportFormat::DBeaver => dbeaver::parse_dbeaver_json(&content)?,
        ImportFormat::Navicat => navicat::parse_navicat_ncx(&content)?,
    };

    // Get existing connection names for deduplication
    let existing_connections = local_db.list_connections().await?;
    let mut existing_names: Vec<String> = existing_connections.into_iter().map(|c| c.name).collect();

    let mut imported = Vec::new();
    for form in &mut forms {
        // Apply defaults
        if form.host.is_none() || form.host.as_deref() == Some("") {
            form.host = Some("localhost".to_string());
        }
        if form.name.is_none() || form.name.as_deref() == Some("") {
            let host = form.host.as_deref().unwrap_or("localhost");
            let port = form.port.map(|p| p.to_string()).unwrap_or_else(|| "default".to_string());
            form.name = Some(format!("{} - {}:{}", form.driver, host, port));
        }

        // Deduplicate name
        let base_name = form.name.clone().unwrap_or_default();
        let unique_name = deduplicate_name(&base_name, &mut existing_names);
        form.name = Some(unique_name);

        // Normalize and create
        let normalized = normalize_connection_form(form.clone())?;
        match local_db.create_connection(normalized).await {
            Ok(conn) => imported.push(conn),
            Err(e) => {
                // Continue with remaining connections on partial failure
                eprintln!("Failed to import connection '{}': {e}", form.name.as_deref().unwrap_or("?"));
            }
        }
    }

    Ok(ImportResult { imported, skipped })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_format() {
        assert!(matches!(detect_format("data-sources.json"), Ok(ImportFormat::DBeaver)));
        assert!(matches!(detect_format("connections.ncx"), Ok(ImportFormat::Navicat)));
        assert!(detect_format("file.csv").is_err());
    }

    #[test]
    fn test_deduplicate_name_no_conflict() {
        let mut names = vec!["existing".to_string()];
        let result = deduplicate_name("new_name", &mut names);
        assert_eq!(result, "new_name");
    }

    #[test]
    fn test_deduplicate_name_with_conflict() {
        let mut names = vec!["my_conn".to_string()];
        let result = deduplicate_name("my_conn", &mut names);
        assert_eq!(result, "my_conn (1)");

        let result2 = deduplicate_name("my_conn", &mut names);
        assert_eq!(result2, "my_conn (2)");
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cargo test --lib import::`

Expected: All tests in mod, dbeaver, and navicat pass

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/import/mod.rs
git commit -m "feat: add import module with format detection and orchestration"
```

---

### Task 5: Register import module and add Tauri command

**Files:**
- Modify: `src-tauri/src/lib.rs:283-294` (add `pub mod import;`)
- Modify: `src-tauri/src/commands/connection.rs` (add `import_connections` command)
- Modify: `src-tauri/src/lib.rs:147-190` (register command in invoke_handler)

- [ ] **Step 1: Add `pub mod import` to lib.rs**

In `src-tauri/src/lib.rs`, add after line 289 (`pub mod error;`):

```rust
pub mod import;
```

- [ ] **Step 2: Add import_connections command to commands/connection.rs**

Add at the end of `src-tauri/src/commands/connection.rs`:

```rust
#[tauri::command]
pub async fn import_connections(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<crate::import::ImportResult, String> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        crate::import::import_from_file(&file_path, &db).await
    } else {
        Err("Local DB not initialized".to_string())
    }
}
```

- [ ] **Step 3: Register command in lib.rs invoke_handler**

In `src-tauri/src/lib.rs`, add to the `invoke_handler` list (after `commands::connection::delete_connection,`):

```rust
            commands::connection::import_connections,
```

- [ ] **Step 4: Verify compilation**

Run: `cargo check` in `src-tauri/`

Expected: Compiles without errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/commands/connection.rs
git commit -m "feat: register import_connections Tauri command"
```

---

### Task 6: Add TypeScript API method

**Files:**
- Modify: `src/services/api.ts:956-973` (add `importFromFile` to connections object)

- [ ] **Step 1: Add ImportResult type and importFromFile method**

In `src/services/api.ts`, add the `ImportResult` interface near the other connection types (after `ConnectionForm` around line 480):

```typescript
export interface ImportResult {
  imported: SavedConnection[];
  skipped: number;
}
```

In the `connections` object (after `listSqliteIssues` around line 972), add:

```typescript
    importFromFile: (filePath: string) =>
      invoke<ImportResult>("import_connections", { filePath }),
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck` or equivalent

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add importFromFile API method"
```

---

### Task 7: Add mock implementation

**Files:**
- Modify: `src/services/mocks.ts` (add mock case for `import_connections`)

- [ ] **Step 1: Add mock case**

In `src/services/mocks.ts`, in the `mockInvoke` switch statement, add after the `delete_connection` case (around line 1756):

```typescript
    case "import_connections":
      return {
        imported: [],
        skipped: 0,
      } as T;
```

- [ ] **Step 2: Commit**

```bash
git add src/services/mocks.ts
git commit -m "feat: add mock for import_connections"
```

---

### Task 8: Add i18n keys

**Files:**
- Modify: `src/lib/i18n/locales/en.ts`
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add English i18n keys**

In `src/lib/i18n/locales/en.ts`, in the `connection.toast` section (after `readFileFailed` around line 502), add:

```typescript
      importConnectionsSuccess: "Successfully imported {{count}} connections",
      importConnectionsSkipped: "Skipped {{count}} unsupported types",
      importConnectionsFailed: "Import failed",
```

In the `connection.menu` section (after `exportDatabaseSql` around line 399), add:

```typescript
      importConnections: "Import Connections",
```

- [ ] **Step 2: Add Chinese i18n keys**

In `src/lib/i18n/locales/zh.ts`, in the `connection.toast` section (after `readFileFailed` around line 484), add:

```typescript
      importConnectionsSuccess: "成功导入 {{count}} 个连接",
      importConnectionsSkipped: "跳过 {{count}} 个不支持的类型",
      importConnectionsFailed: "导入失败",
```

In the `connection.menu` section (after `exportDatabaseSql`), add:

```typescript
      importConnections: "导入连接",
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "i18n: add connection import keys (en/zh)"
```

---

### Task 9: Add import button to sidebar UI

**Files:**
- Modify: `src/components/business/Sidebar/ConnectionList.tsx:2882-2898` (header area)

- [ ] **Step 1: Add import handler**

In `ConnectionList.tsx`, add a handler function before the `return` statement (near line 2880). Find a good spot near other handlers:

```typescript
  const handleImportConnections = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Connection Files", extensions: ["json", "ncx"] },
          { name: "DBeaver JSON", extensions: ["json"] },
          { name: "Navicat NCX", extensions: ["ncx"] },
        ],
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;

      const result = await api.connections.importFromFile(filePath);
      if (result.imported.length > 0) {
        toast.success(
          t("connection.toast.importConnectionsSuccess", {
            count: result.imported.length,
          }),
        );
      }
      if (result.skipped > 0) {
        toast.info(
          t("connection.toast.importConnectionsSkipped", {
            count: result.skipped,
          }),
        );
      }
      if (result.imported.length === 0 && result.skipped === 0) {
        toast.info(t("connection.toast.importConnectionsSuccess", { count: 0 }));
      }
      await fetchConnections();
    } catch (e) {
      toast.error(t("connection.toast.importConnectionsFailed"), {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };
```

- [ ] **Step 2: Add import button to header**

In the header `div` (around line 2889), add a button before the refresh button:

```tsx
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleImportConnections}
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
```

The header should look like:

```tsx
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleImportConnections}
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={fetchConnections}
            loading={isLoadingConnections}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <ConnectionDialog
```

- [ ] **Step 3: Verify Upload icon is imported**

Check that `Upload` is already in the lucide-react imports (line 27). It is — confirmed from earlier exploration.

- [ ] **Step 4: Verify `open` is imported from dialog plugin**

Check that `open` is imported from `@tauri-apps/plugin-dialog` (line 10). It is — confirmed.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npm run typecheck`

Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add src/components/business/Sidebar/ConnectionList.tsx
git commit -m "feat: add import connections button to sidebar"
```

---

### Task 10: Verify full build

- [ ] **Step 1: Run Rust check**

Run: `cargo check` in `src-tauri/`

Expected: No errors

- [ ] **Step 2: Run Rust tests**

Run: `cargo test --lib import`

Expected: All import module tests pass

- [ ] **Step 3: Run TypeScript check**

Run: `npm run typecheck`

Expected: No type errors

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: No lint errors

- [ ] **Step 5: Commit any fixes if needed**

If any fixes were needed:

```bash
git add -A
git commit -m "fix: resolve build issues from import feature"
```
