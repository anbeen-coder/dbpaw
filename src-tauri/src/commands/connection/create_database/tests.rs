use super::sql_builders::{
    build_cassandra_create_database_sql, build_clickhouse_create_database_sql,
    build_mssql_create_database_sql, build_mysql_create_database_sql,
    build_postgres_create_database_sql,
};
use super::{validate_database_name, CreateDatabasePayload};
use super::{
    is_safe_option_token, normalize_create_database_error, normalize_option_token,
    quote_clickhouse_ident, quote_mssql_ident, quote_mysql_ident, quote_pg_ident,
};
use crate::connection_input::normalize_connection_form;
use crate::error::AppError;
use crate::models::ConnectionForm;

#[test]
fn validate_database_name_rejects_empty_and_null() {
    assert_eq!(
        validate_database_name("  ").unwrap_err().to_string(),
        "[ERR-3001] Database name cannot be empty"
    );
    assert_eq!(
        validate_database_name("ab\0cd").unwrap_err().to_string(),
        "[ERR-3001] Database name contains null byte"
    );
}

#[test]
fn validate_database_name_length_boundaries() {
    let name_128 = "a".repeat(128);
    let name_129 = "a".repeat(129);
    assert_eq!(validate_database_name(&name_128).unwrap(), name_128);
    assert_eq!(
        validate_database_name(&name_129).unwrap_err().to_string(),
        "[ERR-3001] Database name is too long (max 128)"
    );
}

#[test]
fn normalize_option_token_accepts_safe_and_rejects_unsafe() {
    let ok = normalize_option_token(&Some("utf8mb4_0900_ai_ci".into()), "collation")
        .unwrap()
        .unwrap();
    assert_eq!(ok, "utf8mb4_0900_ai_ci");

    let empty = normalize_option_token(&Some("   ".into()), "collation").unwrap();
    assert!(empty.is_none());

    let err = normalize_option_token(&Some("utf8 mb4".into()), "charset").unwrap_err();
    assert_eq!(err.to_string(), "[ERR-3001] Invalid characters in charset");

    let err = normalize_option_token(&Some("utf8;drop".into()), "charset").unwrap_err();
    assert_eq!(err.to_string(), "[ERR-3001] Invalid characters in charset");
}

#[test]
fn normalize_create_database_error_classifies_known_errors() {
    let already = normalize_create_database_error(
        AppError::internal("ERROR 1007 (HY000): Can't create database; database exists"),
        "app",
    );
    assert!(already.to_string().contains("[ERR-3004]"));

    let postgres = normalize_create_database_error(
        AppError::internal("ERROR: 42P04 duplicate_database"),
        "app",
    );
    assert!(postgres.to_string().contains("[ERR-3004]"));

    let perm = normalize_create_database_error(
        AppError::internal("ERROR: permission denied for database app"),
        "app",
    );
    assert!(perm.to_string().contains("[ERR-3005]"));
}

#[test]
fn mysql_ephemeral_flow_preserves_empty_password_through_normalization() {
    let form = ConnectionForm {
        driver: "mysql".to_string(),
        host: Some(" localhost ".to_string()),
        port: Some(3306),
        username: Some(" root ".to_string()),
        password: Some("   ".to_string()),
        database: Some(" app ".to_string()),
        ..Default::default()
    };

    let normalized = normalize_connection_form(form).unwrap();
    let dsn = crate::db::drivers::mysql::connection::build_test_dsn(&normalized).unwrap();

    assert_eq!(normalized.password, Some(String::new()));
    assert_eq!(dsn, "mysql://root:@localhost:3306/app?ssl-mode=DISABLED");
}

#[test]
fn quote_idents_escape_driver_specific_characters() {
    assert_eq!(quote_mysql_ident("a`b"), "`a``b`");
    assert_eq!(quote_clickhouse_ident("a`b"), "`a``b`");
    assert_eq!(quote_pg_ident("a\"b"), "\"a\"\"b\"");
    assert_eq!(quote_mssql_ident("a]b"), "[a]]b]");
}

#[test]
fn mysql_sql_contains_if_not_exists_charset_and_collation() {
    let sql = build_mysql_create_database_sql(
        &CreateDatabasePayload {
            name: "foo".to_string(),
            if_not_exists: Some(true),
            charset: Some("utf8mb4".to_string()),
            collation: Some("utf8mb4_general_ci".to_string()),
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "foo",
    )
    .unwrap();
    assert_eq!(
        sql,
        "CREATE DATABASE IF NOT EXISTS `foo` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
    );
}

#[test]
fn postgres_sql_contains_options() {
    let sql = build_postgres_create_database_sql(
        &CreateDatabasePayload {
            name: "foo".to_string(),
            if_not_exists: Some(true),
            charset: None,
            collation: None,
            encoding: Some("UTF8".to_string()),
            lc_collate: Some("en_US.UTF-8".to_string()),
            lc_ctype: Some("en_US.UTF-8".to_string()),
        },
        "foo",
    )
    .unwrap();
    assert_eq!(
        sql,
        "CREATE DATABASE \"foo\" WITH ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8'"
    );
}

#[test]
fn mssql_sql_wraps_with_if_not_exists() {
    let sql = build_mssql_create_database_sql(
        &CreateDatabasePayload {
            name: "foo".to_string(),
            if_not_exists: Some(true),
            charset: None,
            collation: Some("SQL_Latin1_General_CP1_CI_AS".to_string()),
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "foo",
    )
    .unwrap();
    assert_eq!(
        sql,
        "IF DB_ID(N'foo') IS NULL CREATE DATABASE [foo] COLLATE SQL_Latin1_General_CP1_CI_AS"
    );
}

#[test]
fn clickhouse_sql_respects_if_not_exists() {
    let sql = build_clickhouse_create_database_sql(
        &CreateDatabasePayload {
            name: "analytics".to_string(),
            if_not_exists: Some(true),
            charset: None,
            collation: None,
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "analytics",
    )
    .unwrap();
    assert_eq!(sql, "CREATE DATABASE IF NOT EXISTS `analytics`");
}

#[test]
fn clickhouse_sql_rejects_unsupported_options() {
    let err = build_clickhouse_create_database_sql(
        &CreateDatabasePayload {
            name: "analytics".to_string(),
            if_not_exists: Some(true),
            charset: Some("utf8mb4".to_string()),
            collation: None,
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "analytics",
    )
    .unwrap_err();
    assert_eq!(
        err.to_string(),
        "[ERR-5001] ClickHouse create database does not support charset option: utf8mb4"
    );
}

#[test]
fn get_mysql_collations_charset_validation_rejects_unsafe_tokens() {
    assert!(!is_safe_option_token("utf8 mb4"));
    assert!(!is_safe_option_token("utf8;drop"));
    assert!(!is_safe_option_token(""));
}

#[test]
fn get_mysql_collations_charset_validation_accepts_valid_charsets() {
    let valid = [
        "utf8mb4",
        "utf8",
        "latin1",
        "gbk",
        "gb18030",
        "ascii",
        "binary",
        "utf8mb4_0900_ai_ci",
    ];
    for cs in valid {
        assert!(is_safe_option_token(cs), "expected '{}' to be accepted", cs);
    }
}

#[test]
fn mysql_create_database_sql_is_reusable_for_starrocks_connections() {
    assert!(crate::db::drivers::is_mysql_family_driver("starrocks"));

    let sql = build_mysql_create_database_sql(
        &CreateDatabasePayload {
            name: "analytics".to_string(),
            if_not_exists: Some(true),
            charset: None,
            collation: None,
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "analytics",
    )
    .unwrap();

    assert_eq!(sql, "CREATE DATABASE IF NOT EXISTS `analytics`");
}

#[test]
fn cassandra_sql_creates_keyspace_with_replication() {
    let sql = build_cassandra_create_database_sql(
        &CreateDatabasePayload {
            name: "my_app".to_string(),
            if_not_exists: Some(true),
            charset: None,
            collation: None,
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "my_app",
    )
    .unwrap();
    assert_eq!(
        sql,
        "CREATE KEYSPACE IF NOT EXISTS \"my_app\" WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
    );
}

#[test]
fn cassandra_sql_without_if_not_exists() {
    let sql = build_cassandra_create_database_sql(
        &CreateDatabasePayload {
            name: "my_app".to_string(),
            if_not_exists: Some(false),
            charset: None,
            collation: None,
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "my_app",
    )
    .unwrap();
    assert_eq!(
        sql,
        "CREATE KEYSPACE \"my_app\" WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
    );
}

#[test]
fn cassandra_sql_rejects_unsupported_options() {
    let err = build_cassandra_create_database_sql(
        &CreateDatabasePayload {
            name: "my_app".to_string(),
            if_not_exists: Some(true),
            charset: Some("utf8mb4".to_string()),
            collation: None,
            encoding: None,
            lc_collate: None,
            lc_ctype: None,
        },
        "my_app",
    )
    .unwrap_err();
    assert_eq!(
        err.to_string(),
        "[ERR-5001] Cassandra create keyspace does not support charset option: utf8mb4"
    );
}
