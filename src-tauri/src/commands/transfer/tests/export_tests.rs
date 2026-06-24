use super::super::*;
use super::helpers::*;
use crate::models::TableInfo;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;

#[test]
fn extension_for_format_sql_variants_all_return_sql() {
    assert_eq!(extension_for_format(&ExportFormat::SqlDml), "sql");
    assert_eq!(extension_for_format(&ExportFormat::SqlDdl), "sql");
    assert_eq!(extension_for_format(&ExportFormat::SqlFull), "sql");
    assert_eq!(extension_for_format(&ExportFormat::Csv), "csv");
    assert_eq!(extension_for_format(&ExportFormat::Json), "json");
}

#[test]
fn export_writer_csv_writes_header_then_rows() {
    let path = tmp_path("csv_header.csv");
    let cols = vec!["id".to_string(), "name".to_string()];
    let mut writer = ExportWriter::new(path.clone(), ExportFormat::Csv).unwrap();
    writer.write_csv_header(&cols).unwrap();
    let rows = vec![make_row(&[
        ("id", Value::Number(1.into())),
        ("name", Value::String("alice".to_string())),
    ])];
    writer
        .write_rows(&rows, &cols, None, "t", "postgres")
        .unwrap();
    writer.finish().unwrap();
    let content = fs::read_to_string(&path).unwrap();
    assert!(content.starts_with("id,name\n"));
    assert!(content.contains("1,alice"));
    let _ = fs::remove_file(path);
}

#[test]
fn write_csv_header_is_noop_for_sql_formats() {
    let path = tmp_path("sql_noop_header.sql");
    let mut writer = ExportWriter::new(path.clone(), ExportFormat::SqlDml).unwrap();
    writer.write_csv_header(&["id".to_string()]).unwrap();
    writer.finish().unwrap();
    let content = fs::read_to_string(&path).unwrap();
    assert_eq!(content, "");
    let _ = fs::remove_file(path);
}

#[test]
fn export_writer_sql_dml_writes_insert_statements() {
    let path = tmp_path("sql_dml.sql");
    let cols = vec!["id".to_string(), "name".to_string()];
    let mut writer = ExportWriter::new(path.clone(), ExportFormat::SqlDml).unwrap();
    let rows = vec![
        make_row(&[
            ("id", Value::Number(1.into())),
            ("name", Value::String("alice".to_string())),
        ]),
        make_row(&[("id", Value::Number(2.into())), ("name", Value::Null)]),
    ];
    let count = writer
        .write_rows(&rows, &cols, Some("public"), "users", "postgres")
        .unwrap();
    writer.finish().unwrap();
    assert_eq!(count, 2);
    let content = fs::read_to_string(&path).unwrap();
    assert!(content.contains("INSERT INTO \"public\".\"users\""));
    assert!(content.contains("VALUES (1, 'alice')"));
    assert!(content.contains("VALUES (2, NULL)"));
    assert!(!content.contains("CREATE TABLE"));
    let _ = fs::remove_file(path);
}

#[test]
fn export_writer_sql_ddl_writes_only_ddl() {
    let path = tmp_path("sql_ddl.sql");
    let mut writer = ExportWriter::new(path.clone(), ExportFormat::SqlDdl).unwrap();
    writer
        .write_ddl("CREATE TABLE users (id INTEGER);")
        .unwrap();
    writer.finish().unwrap();
    let content = fs::read_to_string(&path).unwrap();
    assert!(content.contains("CREATE TABLE users (id INTEGER);"));
    assert!(!content.contains("INSERT INTO"));
    let _ = fs::remove_file(path);
}

#[test]
fn export_writer_sql_full_writes_ddl_then_inserts() {
    let path = tmp_path("sql_full.sql");
    let cols = vec!["id".to_string(), "val".to_string()];
    let mut writer = ExportWriter::new(path.clone(), ExportFormat::SqlFull).unwrap();
    writer
        .write_ddl("CREATE TABLE t (id INT, val TEXT);")
        .unwrap();
    let rows = vec![make_row(&[
        ("id", Value::Number(1.into())),
        ("val", Value::String("x".to_string())),
    ])];
    let count = writer
        .write_rows(&rows, &cols, None, "t", "postgres")
        .unwrap();
    writer.finish().unwrap();
    assert_eq!(count, 1);
    let content = fs::read_to_string(&path).unwrap();
    let ddl_pos = content.find("CREATE TABLE").unwrap();
    let dml_pos = content.find("INSERT INTO").unwrap();
    assert!(ddl_pos < dml_pos, "DDL should appear before DML");
    assert!(content.contains("VALUES (1, 'x')"));
    let _ = fs::remove_file(path);
}

#[test]
fn database_export_writes_all_tables_in_schema_then_name_order() {
    let path = tmp_path("database_export.sql");
    let driver = Arc::new(FakeExportDriver {
        tables: vec![
            TableInfo {
                schema: "zeta".to_string(),
                name: "logs".to_string(),
                r#type: "table".to_string(),
            },
            TableInfo {
                schema: "alpha".to_string(),
                name: "users".to_string(),
                r#type: "table".to_string(),
            },
            TableInfo {
                schema: "alpha".to_string(),
                name: "accounts".to_string(),
                r#type: "table".to_string(),
            },
        ],
        ddls: HashMap::from([
            (
                ("alpha".to_string(), "accounts".to_string()),
                "CREATE TABLE accounts (id INT);".to_string(),
            ),
            (
                ("alpha".to_string(), "users".to_string()),
                "CREATE TABLE users (id INT);".to_string(),
            ),
            (
                ("zeta".to_string(), "logs".to_string()),
                "CREATE TABLE logs (id INT);".to_string(),
            ),
        ]),
        rows: HashMap::from([
            (
                ("alpha".to_string(), "accounts".to_string()),
                vec![make_row(&[("id", Value::Number(1.into()))])],
            ),
            (
                ("alpha".to_string(), "users".to_string()),
                vec![make_row(&[("id", Value::Number(2.into()))])],
            ),
            (
                ("zeta".to_string(), "logs".to_string()),
                vec![make_row(&[("id", Value::Number(3.into()))])],
            ),
        ]),
    });

    let result = tauri::async_runtime::block_on(do_database_export(
        driver,
        path.clone(),
        "postgres".to_string(),
        ExportFormat::SqlFull,
        2000,
    ))
    .unwrap();

    assert_eq!(result.row_count, 3);
    let content = fs::read_to_string(&path).unwrap();
    let accounts_pos = content.find("CREATE TABLE accounts").unwrap();
    let users_pos = content.find("CREATE TABLE users").unwrap();
    let logs_pos = content.find("CREATE TABLE logs").unwrap();
    assert!(accounts_pos < users_pos);
    assert!(users_pos < logs_pos);
    assert!(content.contains("INSERT INTO \"alpha\".\"accounts\""));
    assert!(content.contains("INSERT INTO \"alpha\".\"users\""));
    assert!(content.contains("INSERT INTO \"zeta\".\"logs\""));
    let _ = fs::remove_file(path);
}

#[test]
fn database_export_respects_sql_ddl_mode() {
    let path = tmp_path("database_export_ddl.sql");
    let driver = Arc::new(FakeExportDriver {
        tables: vec![TableInfo {
            schema: "public".to_string(),
            name: "users".to_string(),
            r#type: "table".to_string(),
        }],
        ddls: HashMap::from([(
            ("public".to_string(), "users".to_string()),
            "CREATE TABLE users (id INT);".to_string(),
        )]),
        rows: HashMap::from([(
            ("public".to_string(), "users".to_string()),
            vec![make_row(&[("id", Value::Number(1.into()))])],
        )]),
    });

    let result = tauri::async_runtime::block_on(do_database_export(
        driver,
        path.clone(),
        "postgres".to_string(),
        ExportFormat::SqlDdl,
        2000,
    ))
    .unwrap();

    assert_eq!(result.row_count, 0);
    let content = fs::read_to_string(&path).unwrap();
    assert!(content.contains("CREATE TABLE users"));
    assert!(!content.contains("INSERT INTO"));
    let _ = fs::remove_file(path);
}

#[test]
fn database_export_respects_sql_dml_mode() {
    let path = tmp_path("database_export_dml.sql");
    let driver = Arc::new(FakeExportDriver {
        tables: vec![TableInfo {
            schema: "public".to_string(),
            name: "users".to_string(),
            r#type: "table".to_string(),
        }],
        ddls: HashMap::from([(
            ("public".to_string(), "users".to_string()),
            "CREATE TABLE users (id INT);".to_string(),
        )]),
        rows: HashMap::from([(
            ("public".to_string(), "users".to_string()),
            vec![make_row(&[("id", Value::Number(1.into()))])],
        )]),
    });

    let result = tauri::async_runtime::block_on(do_database_export(
        driver,
        path.clone(),
        "postgres".to_string(),
        ExportFormat::SqlDml,
        2000,
    ))
    .unwrap();

    assert_eq!(result.row_count, 1);
    let content = fs::read_to_string(&path).unwrap();
    assert!(!content.contains("CREATE TABLE"));
    assert!(content.contains("INSERT INTO \"public\".\"users\""));
    let _ = fs::remove_file(path);
}

#[test]
fn write_ddl_trims_trailing_whitespace_and_adds_blank_line() {
    let path = tmp_path("ddl_trim.sql");
    let mut writer = ExportWriter::new(path.clone(), ExportFormat::SqlDdl).unwrap();
    writer.write_ddl("CREATE TABLE t (id INT);   \n\n").unwrap();
    writer.finish().unwrap();
    let content = fs::read_to_string(&path).unwrap();
    assert!(content.starts_with("CREATE TABLE t (id INT);"));
    assert!(content.ends_with("\n\n"));
    let _ = fs::remove_file(path);
}
