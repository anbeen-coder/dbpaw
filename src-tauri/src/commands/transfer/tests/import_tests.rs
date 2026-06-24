use super::super::*;
use super::super::import_dialects::{parse_mssql_batches, statement_controls_transaction};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[test]
fn csv_escape_works() {
    assert_eq!(csv_escape("simple"), "simple");
    assert_eq!(csv_escape("a,b"), "\"a,b\"");
    assert_eq!(csv_escape("a\"b"), "\"a\"\"b\"");
    assert_eq!(csv_escape("a\nb"), "\"a\nb\"");
    assert_eq!(csv_escape("a,\nb"), "\"a,\nb\"");
}

#[test]
fn sql_value_works() {
    assert_eq!(sql_value(&Value::Null), "NULL");
    assert_eq!(sql_value(&Value::Bool(true)), "TRUE");
    assert_eq!(
        sql_value(&Value::String("O'Reilly".to_string())),
        "'O''Reilly'"
    );
    assert_eq!(
        sql_value(&Value::Number(serde_json::Number::from(42))),
        "42"
    );
    assert_eq!(sql_value(&Value::Bool(false)), "FALSE");
}

#[test]
fn quote_target_uses_schema_when_present() {
    assert_eq!(
        quote_target(Some("public"), "users", "postgres"),
        "\"public\".\"users\""
    );
    assert_eq!(
        quote_target(Some("analytics"), "events", "mysql"),
        "`analytics`.`events`"
    );
    assert_eq!(
        quote_target(Some("analytics"), "events", "tidb"),
        "`analytics`.`events`"
    );
    assert_eq!(
        quote_target(Some("analytics"), "events", "mariadb"),
        "`analytics`.`events`"
    );
    assert_eq!(
        quote_target(Some("analytics"), "events", "clickhouse"),
        "`analytics`.`events`"
    );
    assert_eq!(
        quote_target(Some("dbo"), "events", "mssql"),
        "[dbo].[events]"
    );
}

#[test]
fn quote_target_ignores_empty_schema() {
    assert_eq!(quote_target(Some("  "), "users", "postgres"), "\"users\"");
    assert_eq!(quote_target(None, "users", "mysql"), "`users`");
    assert_eq!(quote_target(None, "users", "tidb"), "`users`");
    assert_eq!(quote_target(None, "users", "mariadb"), "`users`");
}

#[test]
fn quote_target_uses_unqualified_main_for_duckdb() {
    assert_eq!(quote_target(Some("main"), "users", "duckdb"), "\"users\"");
    assert_eq!(
        quote_target(Some("analytics"), "events", "duckdb"),
        "\"analytics\".\"events\""
    );
}

#[test]
fn quote_ident_escapes_driver_specific_chars() {
    assert_eq!(quote_ident("a`b", "mysql"), "`a``b`");
    assert_eq!(quote_ident("a`b", "clickhouse"), "`a``b`");
    assert_eq!(quote_ident("a]b", "mssql"), "[a]]b]");
    assert_eq!(quote_ident("a\"b", "postgres"), "\"a\"\"b\"");
}

#[test]
fn validate_output_path_rejects_empty_path() {
    assert_eq!(
        validate_output_path(&PathBuf::new())
            .unwrap_err()
            .to_string(),
        "[ERR-3001] Invalid output path"
    );
}

#[test]
fn validate_output_path_rejects_directory_path() {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let dir = std::env::temp_dir().join(format!("dbpaw-transfer-test-dir-{unique}"));
    fs::create_dir_all(&dir).unwrap();
    let err = validate_output_path(&dir).unwrap_err().to_string();
    assert_eq!(err, "[ERR-3001] Output path points to a directory");
    let _ = fs::remove_dir_all(dir);
}

#[test]
fn validate_output_path_rejects_path_without_filename() {
    let err = validate_output_path(&PathBuf::from("/"))
        .unwrap_err()
        .to_string();
    assert_eq!(err, "[ERR-3001] Output path must include a file name");
}

#[test]
fn write_rows_rejects_non_object_rows() {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = std::env::temp_dir().join(format!("dbpaw-transfer-test-{unique}.json"));
    let mut writer = ExportWriter::new(path.clone(), ExportFormat::Json).unwrap();
    let err = writer
        .write_rows(
            &[Value::String("not-object".to_string())],
            &["a".to_string()],
            None,
            "t",
            "postgres",
        )
        .unwrap_err();
    assert_eq!(err.to_string(), "[ERR-3001] row is not a JSON object");
    let _ = fs::remove_file(path);
}

#[test]
fn parse_sql_statements_handles_quotes_and_comments() {
    let sql = r#"
        -- comment 1
        INSERT INTO users (name, note) VALUES ('alice', 'hello;world');
        /* block comment ; ; */
        INSERT INTO users (name) VALUES ("bob");
        # mysql style comment
        INSERT INTO users(name) VALUES ($tag$semi;inside$tag$);
    "#;

    let statements = parse_sql_statements(sql, "mysql").unwrap();
    assert_eq!(statements.len(), 3);
    assert!(statements[0].starts_with("INSERT INTO users"));
    assert!(statements[1].contains("\"bob\""));
    assert!(statements[2].contains("$tag$semi;inside$tag$"));
}

#[test]
fn parse_sql_statements_rejects_unterminated_block_comment() {
    let err = parse_sql_statements("INSERT INTO t VALUES (1); /*", "mysql").unwrap_err();
    assert!(err.to_string().contains("Unterminated block comment"));
}

#[test]
fn parse_sql_statements_preserves_hash_for_postgres() {
    let sql = "SELECT 1 # 2;\nSELECT '#not_comment';";
    let statements = parse_sql_statements(sql, "postgres").unwrap();
    assert_eq!(statements.len(), 2);
    assert_eq!(statements[0], "SELECT 1 # 2");
    assert_eq!(statements[1], "SELECT '#not_comment'");
}

#[test]
fn parse_sql_statements_supports_mysql_delimiter_blocks() {
    let sql = r#"
        DELIMITER $$
        CREATE PROCEDURE p_demo()
        BEGIN
            SELECT 1;
            SELECT 'semi;inside';
        END$$
        DELIMITER ;
        SELECT 2;
    "#;

    let statements = parse_sql_statements(sql, "mysql").unwrap();
    assert_eq!(statements.len(), 2);
    assert!(statements[0].starts_with("CREATE PROCEDURE p_demo()"));
    assert!(statements[0].contains("SELECT 1;"));
    assert!(statements[0].contains("SELECT 'semi;inside';"));
    assert_eq!(statements[1], "SELECT 2");
}

#[test]
fn parse_sql_statements_ignores_mysql_delimiter_inside_strings() {
    let sql = r#"
        DELIMITER //
        CREATE TRIGGER trg_demo BEFORE INSERT ON demo
        FOR EACH ROW
        BEGIN
            SET @note = 'DELIMITER // should stay';
        END//
        DELIMITER ;
    "#;

    let statements = parse_sql_statements(sql, "mysql").unwrap();
    assert_eq!(statements.len(), 1);
    assert!(statements[0].contains("DELIMITER // should stay"));
    assert!(statements[0].contains("END"));
}

#[test]
fn parse_sql_statements_supports_sqlite_trigger_blocks() {
    let sql = r#"
        CREATE TRIGGER trg_demo
        AFTER INSERT ON demo
        BEGIN
            INSERT INTO audit_log(message) VALUES ('first;value');
            UPDATE demo SET touched_at = CURRENT_TIMESTAMP WHERE rowid = NEW.rowid;
        END;
        SELECT 1;
    "#;

    let statements = parse_sql_statements(sql, "sqlite").unwrap();
    assert_eq!(statements.len(), 2);
    assert!(statements[0].starts_with("CREATE TRIGGER trg_demo"));
    assert!(statements[0].contains("VALUES ('first;value');"));
    assert!(statements[0].contains("UPDATE demo SET touched_at = CURRENT_TIMESTAMP"));
    assert_eq!(statements[1], "SELECT 1");
}

#[test]
fn parse_sql_statements_keeps_sqlite_case_end_inside_trigger_body() {
    let sql = r#"
        CREATE TRIGGER trg_case
        AFTER UPDATE ON demo
        BEGIN
            UPDATE demo
            SET status = CASE WHEN NEW.id > 10 THEN 'big' ELSE 'small' END;
        END;
    "#;

    let statements = parse_sql_statements(sql, "sqlite").unwrap();
    assert_eq!(statements.len(), 1);
    assert!(statements[0].contains("CASE WHEN NEW.id > 10 THEN 'big' ELSE 'small' END;"));
    assert!(statements[0].ends_with("END"));
}

#[test]
fn parse_sql_statements_supports_oracle_create_or_replace_blocks() {
    let sql = r#"
        CREATE OR REPLACE PROCEDURE p_demo IS
        BEGIN
            INSERT INTO audit_log(message) VALUES ('first;value');
            UPDATE audit_log SET message = 'done' WHERE message = 'first;value';
        END;
        /
        SELECT 1 FROM DUAL;
    "#;

    let statements = parse_sql_statements(sql, "oracle").unwrap();
    assert_eq!(statements.len(), 2);
    assert!(statements[0].starts_with("CREATE OR REPLACE PROCEDURE p_demo IS"));
    assert!(statements[0].contains("VALUES ('first;value');"));
    assert!(statements[0].contains("END;"));
    assert_eq!(statements[1], "SELECT 1 FROM DUAL");
}

#[test]
fn parse_sql_statements_supports_oracle_case_end_inside_block() {
    let sql = r#"
        CREATE OR REPLACE FUNCTION f_demo RETURN VARCHAR2 IS
            v_result VARCHAR2(10);
        BEGIN
            v_result := CASE WHEN 1 = 1 THEN 'yes' ELSE 'no' END;
            RETURN v_result;
        END;
        /
    "#;

    let statements = parse_sql_statements(sql, "oracle").unwrap();
    assert_eq!(statements.len(), 1);
    assert!(statements[0].contains("CASE WHEN 1 = 1 THEN 'yes' ELSE 'no' END;"));
    assert!(statements[0].ends_with("END;"));
}

#[test]
fn parse_mssql_batches_splits_on_go_lines_only() {
    let sql = r#"
        SELECT 1;
        GO
        SELECT 'GO should stay in string';
        -- GO in comment should not split
        SELECT 2;
        GO
        /* GO in block comment
           GO
        */
        SELECT 3;
    "#;

    let batches = parse_mssql_batches(sql).unwrap();
    assert_eq!(batches.len(), 3);
    assert!(batches[0].contains("SELECT 1"));
    assert!(batches[1].contains("SELECT 'GO should stay in string'"));
    assert!(batches[2].contains("SELECT 3"));
}

#[test]
fn parse_mssql_batches_supports_go_repeat_count() {
    let sql = "SELECT 1\nGO 3\nSELECT 2\nGO";
    let batches = parse_mssql_batches(sql).unwrap();
    assert_eq!(batches.len(), 4);
    assert_eq!(batches[0], "SELECT 1");
    assert_eq!(batches[1], "SELECT 1");
    assert_eq!(batches[2], "SELECT 1");
    assert_eq!(batches[3], "SELECT 2");
}

#[test]
fn statement_controls_transaction_detects_driver_specific_tokens() {
    assert!(statement_controls_transaction("BEGIN TRANSACTION", "mssql"));
    assert!(!statement_controls_transaction("BEGIN TRY", "mssql"));
    assert!(statement_controls_transaction("BEGIN", "sqlite"));
    assert!(statement_controls_transaction("START TRANSACTION", "mysql"));
    assert!(statement_controls_transaction("ROLLBACK", "postgres"));
}

#[test]
fn prepare_import_plan_disables_outer_tx_when_script_controls_it() {
    let sqlite_plan =
        prepare_import_plan("BEGIN;\nCREATE TABLE t(id INTEGER);\nCOMMIT;", "sqlite").unwrap();
    assert_eq!(sqlite_plan.units.len(), 3);
    assert!(sqlite_plan.script_managed_transaction);

    let mssql_plan = prepare_import_plan("SELECT 1\nGO\nSELECT 2", "mssql").unwrap();
    assert_eq!(mssql_plan.units.len(), 2);
    assert!(!mssql_plan.script_managed_transaction);
}

#[test]
fn should_use_outer_import_transaction_disables_mssql_outer_tx() {
    let sqlite_plan = prepare_import_plan("CREATE TABLE t(id INTEGER);", "sqlite").unwrap();
    assert!(should_use_outer_import_transaction("sqlite", &sqlite_plan));

    let sqlite_script_tx =
        prepare_import_plan("BEGIN;\nCREATE TABLE t(id INTEGER);\nCOMMIT;", "sqlite").unwrap();
    assert!(!should_use_outer_import_transaction(
        "sqlite",
        &sqlite_script_tx
    ));

    let mssql_plan = prepare_import_plan("SELECT 1\nGO\nSELECT 2", "mssql").unwrap();
    assert!(!should_use_outer_import_transaction("mssql", &mssql_plan));
}

#[test]
fn import_transaction_sql_maps_per_driver() {
    assert_eq!(
        import_transaction_sql("mysql", "mysql").unwrap(),
        ("START TRANSACTION", "COMMIT", "ROLLBACK")
    );
    assert_eq!(
        import_transaction_sql("postgres", "postgres").unwrap(),
        ("BEGIN", "COMMIT", "ROLLBACK")
    );
    assert_eq!(
        import_transaction_sql("postgres", "postgresql").unwrap(),
        ("BEGIN", "COMMIT", "ROLLBACK")
    );
    assert_eq!(
        import_transaction_sql("mssql", "mssql").unwrap(),
        (
            "BEGIN TRANSACTION",
            "COMMIT TRANSACTION",
            "ROLLBACK TRANSACTION"
        )
    );
    assert_eq!(
        import_transaction_sql("oracle", "oracle").unwrap(),
        ("SELECT 1 FROM DUAL", "COMMIT", "ROLLBACK")
    );
    assert!(import_transaction_sql("clickhouse", "clickhouse").is_err());
    assert!(import_transaction_sql("starrocks", "starrocks").is_err());
}

#[test]
fn normalize_driver_name_maps_aliases() {
    assert_eq!(normalize_driver_name("postgres"), "postgres");
    assert_eq!(normalize_driver_name("postgresql"), "postgres");
    assert_eq!(normalize_driver_name("pgsql"), "postgres");
    assert_eq!(normalize_driver_name("mysql"), "mysql");
}

#[test]
fn truncate_error_message_caps_length() {
    let source = "x".repeat(600);
    let truncated = truncate_error_message(&source);
    assert!(truncated.len() <= 503);
    assert!(truncated.ends_with("..."));
}
