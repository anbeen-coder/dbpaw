# PostgreSQL Identifier Quoting Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix PostgreSQL queries that fail for tables with numeric-starting, case-sensitive, or special-character names by properly quoting identifiers.

**Architecture:** Add a `pg_qualified_table` helper (following MySQL/SQLite/MSSQL pattern) and replace 3 raw identifier interpolations with quoted versions.

**Tech Stack:** Rust, sqlx, PostgreSQL

---

### Task 1: Add `pg_qualified_table` helper function

**Files:**
- Modify: `src-tauri/src/db/drivers/postgres.rs:944` (insert after `pg_quote_ident`)

- [ ] **Step 1: Add helper function after `pg_quote_ident`**

Insert the following function immediately after line 944 (the closing `}` of `pg_quote_ident`):

```rust
fn pg_qualified_table(schema: &str, table: &str) -> String {
    format!("{}.{}", pg_quote_ident(schema), pg_quote_ident(table))
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/drivers/postgres.rs
git commit -m "fix: add pg_qualified_table helper for identifier quoting"
```

---

### Task 2: Fix `fetch_table_rows_as_json` identifier quoting

**Files:**
- Modify: `src-tauri/src/db/drivers/postgres.rs:517-519`

- [ ] **Step 1: Quote schema and table in the query**

Replace lines 517-519:

Before:
```rust
        let query = format!(
            "SELECT to_jsonb(t) AS __row_json FROM {}.{} t{}{} LIMIT $1 OFFSET $2",
            schema, table, where_clause, order_clause
        );
```

After:
```rust
        let qt = pg_qualified_table(schema, table);
        let query = format!(
            "SELECT to_jsonb(t) AS __row_json FROM {} t{}{} LIMIT $1 OFFSET $2",
            qt, where_clause, order_clause
        );
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/drivers/postgres.rs
git commit -m "fix: quote identifiers in fetch_table_rows_as_json"
```

---

### Task 3: Fix `get_table_data` count query identifier quoting

**Files:**
- Modify: `src-tauri/src/db/drivers/postgres.rs:1627`

- [ ] **Step 1: Quote schema and table in count query**

Replace line 1627:

Before:
```rust
        let count_query = format!("SELECT COUNT(*) FROM {}.{}{}", schema, table, where_clause);
```

After:
```rust
        let qt = pg_qualified_table(&schema, &table);
        let count_query = format!("SELECT COUNT(*) FROM {}{}", qt, where_clause);
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/drivers/postgres.rs
git commit -m "fix: quote identifiers in get_table_data count query"
```

---

### Task 4: Fix `get_table_data` ORDER BY column quoting

**Files:**
- Modify: `src-tauri/src/db/drivers/postgres.rs:1649`

- [ ] **Step 1: Use pg_quote_ident for ORDER BY column**

Replace line 1649:

Before:
```rust
            format!(" ORDER BY \"{}\" {}", col, dir)
```

After:
```rust
            format!(" ORDER BY {} {}", pg_quote_ident(col), dir)
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/drivers/postgres.rs
git commit -m "fix: quote column names in ORDER BY clause"
```

---

### Task 5: Verify all changes

- [ ] **Step 1: Run full cargo check**

Run: `cargo check`
Expected: PASS (no errors)

- [ ] **Step 2: Run integration tests (if PostgreSQL available)**

Run: `cargo test --test postgres_integration -- --ignored`
Expected: PASS (tests pass with quoted identifiers)

- [ ] **Step 3: Manual verification**

Connect to a PostgreSQL database with tables named `"0a"` and `"MyTable"` and confirm:
- Table list loads
- Table data displays
- Sorting works
