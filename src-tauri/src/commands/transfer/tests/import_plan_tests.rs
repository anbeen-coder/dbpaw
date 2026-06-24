use super::super::*;

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
