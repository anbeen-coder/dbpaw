use crate::db::drivers;
use crate::error::AppError;
use crate::models::{ConnectionForm, TestConnectionResult};
use crate::state::AppState;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDatabasePayload {
    pub name: String,
    pub if_not_exists: Option<bool>,
    pub charset: Option<String>,
    pub collation: Option<String>,
    pub encoding: Option<String>,
    pub lc_collate: Option<String>,
    pub lc_ctype: Option<String>,
}

pub fn validate_database_name(raw: &str) -> Result<String, AppError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation("Database name cannot be empty"));
    }
    if trimmed.contains('\0') {
        return Err(AppError::validation("Database name contains null byte"));
    }
    if trimmed.len() > 128 {
        return Err(AppError::validation("Database name is too long (max 128)"));
    }
    Ok(trimmed.to_string())
}

fn is_safe_option_token(raw: &str) -> bool {
    !raw.is_empty()
        && raw
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.' | '@'))
}

fn normalize_option_token(opt: &Option<String>, field: &str) -> Result<Option<String>, AppError> {
    let Some(value) = opt else {
        return Ok(None);
    };
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if !is_safe_option_token(trimmed) {
        return Err(AppError::validation(format!(
            "Invalid characters in {}",
            field
        )));
    }
    Ok(Some(trimmed.to_string()))
}

fn quote_mysql_ident(ident: &str) -> String {
    format!("`{}`", ident.replace('`', "``"))
}

fn quote_clickhouse_ident(ident: &str) -> String {
    format!("`{}`", ident.replace('`', "``"))
}

fn quote_pg_ident(ident: &str) -> String {
    format!("\"{}\"", ident.replace('"', "\"\""))
}

fn quote_mssql_ident(ident: &str) -> String {
    format!("[{}]", ident.replace(']', "]]"))
}

fn quote_literal(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn quote_nliteral(value: &str) -> String {
    format!("N'{}'", value.replace('\'', "''"))
}

fn quote_cql_ident(ident: &str) -> String {
    format!("\"{}\"", ident.replace('"', "\"\""))
}

pub fn build_mysql_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    let charset = normalize_option_token(&payload.charset, "charset")?;
    let collation = normalize_option_token(&payload.collation, "collation")?;
    let mut sql = String::from("CREATE DATABASE ");
    if payload.if_not_exists.unwrap_or(true) {
        sql.push_str("IF NOT EXISTS ");
    }
    sql.push_str(&quote_mysql_ident(db_name));
    if let Some(charset) = charset {
        sql.push_str(" CHARACTER SET ");
        sql.push_str(&charset);
    }
    if let Some(collation) = collation {
        sql.push_str(" COLLATE ");
        sql.push_str(&collation);
    }
    Ok(sql)
}

pub fn build_postgres_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    let encoding = normalize_option_token(&payload.encoding, "encoding")?;
    let lc_collate = normalize_option_token(&payload.lc_collate, "lc_collate")?;
    let lc_ctype = normalize_option_token(&payload.lc_ctype, "lc_ctype")?;

    let mut options = Vec::new();
    if let Some(v) = encoding {
        options.push(format!("ENCODING = {}", quote_literal(&v)));
    }
    if let Some(v) = lc_collate {
        options.push(format!("LC_COLLATE = {}", quote_literal(&v)));
    }
    if let Some(v) = lc_ctype {
        options.push(format!("LC_CTYPE = {}", quote_literal(&v)));
    }

    let mut sql = format!("CREATE DATABASE {}", quote_pg_ident(db_name));
    if !options.is_empty() {
        sql.push_str(" WITH ");
        sql.push_str(&options.join(" "));
    }
    Ok(sql)
}

pub fn build_mssql_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    let collation = normalize_option_token(&payload.collation, "collation")?;
    let mut create_sql = format!("CREATE DATABASE {}", quote_mssql_ident(db_name));
    if let Some(collation) = collation {
        create_sql.push_str(" COLLATE ");
        create_sql.push_str(&collation);
    }

    if payload.if_not_exists.unwrap_or(true) {
        return Ok(format!(
            "IF DB_ID({}) IS NULL {}",
            quote_nliteral(db_name),
            create_sql
        ));
    }
    Ok(create_sql)
}

pub fn build_clickhouse_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    if let Some(v) = normalize_option_token(&payload.charset, "charset")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support charset option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.collation, "collation")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support collation option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.encoding, "encoding")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support encoding option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_collate, "lc_collate")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support lc_collate option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_ctype, "lc_ctype")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support lc_ctype option: {}",
            v
        )));
    }

    let mut sql = String::from("CREATE DATABASE ");
    if payload.if_not_exists.unwrap_or(true) {
        sql.push_str("IF NOT EXISTS ");
    }
    sql.push_str(&quote_clickhouse_ident(db_name));
    Ok(sql)
}

pub fn build_cassandra_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    if let Some(v) = normalize_option_token(&payload.charset, "charset")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support charset option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.collation, "collation")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support collation option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.encoding, "encoding")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support encoding option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_collate, "lc_collate")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support lc_collate option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_ctype, "lc_ctype")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support lc_ctype option: {}",
            v
        )));
    }

    let mut sql = String::from("CREATE KEYSPACE ");
    if payload.if_not_exists.unwrap_or(true) {
        sql.push_str("IF NOT EXISTS ");
    }
    sql.push_str(&quote_cql_ident(db_name));
    sql.push_str(" WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}");
    Ok(sql)
}

pub fn normalize_create_database_error(err: AppError, db_name: &str) -> AppError {
    let lower = err.to_string().to_lowercase();
    if lower.contains("already exists")
        || lower.contains("duplicate database")
        || lower.contains("database exists")
        || lower.contains("42p04")
        || lower.contains("2714")
    {
        return AppError::already_exists(format!("Database '{}' already exists. {}", db_name, err));
    }
    if lower.contains("permission denied")
        || lower.contains("access denied")
        || lower.contains("not authorized")
        || lower.contains("insufficient privilege")
    {
        return AppError::permission_denied(format!("{}", err));
    }
    err
}

pub async fn list_databases(form: ConnectionForm) -> Result<Vec<String>, AppError> {
    let form =
        crate::connection_input::normalize_connection_form(form).map_err(AppError::internal)?;
    let driver = drivers::connect(&form).await?;
    driver.list_databases().await
}

pub async fn list_databases_by_id(state: &AppState, id: i64) -> Result<Vec<String>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver| async move {
        driver.list_databases().await
    })
    .await
}

pub async fn create_database_by_id(
    state: &AppState,
    id: i64,
    payload: CreateDatabasePayload,
) -> Result<(), AppError> {
    let db_name = validate_database_name(&payload.name)?;

    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver| {
        let db_name = db_name.clone();
        let payload = payload.clone();
        async move {
            let form = {
                let local_db = {
                    let lock = state.local_db.lock().await;
                    lock.clone()
                };
                let db = local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))?;
                db.get_connection_form_by_id(id)
                    .await
                    .map_err(AppError::internal)?
            };

            let sql = match form.driver.as_str() {
                "mysql" | "mariadb" | "tidb" | "starrocks" | "doris" => {
                    build_mysql_create_database_sql(&payload, &db_name)?
                }
                "postgresql" | "postgres" => {
                    build_postgres_create_database_sql(&payload, &db_name)?
                }
                "sqlserver" | "mssql" => build_mssql_create_database_sql(&payload, &db_name)?,
                "clickhouse" => build_clickhouse_create_database_sql(&payload, &db_name)?,
                "cassandra" => build_cassandra_create_database_sql(&payload, &db_name)?,
                _ => {
                    return Err(AppError::unsupported(format!(
                        "Create database not supported for driver: {}",
                        form.driver
                    )));
                }
            };

            driver
                .execute_query(sql)
                .await
                .map(|_| ())
                .map_err(|e| normalize_create_database_error(e, &db_name))
        }
    })
    .await
}

pub async fn get_mysql_charsets_by_id(state: &AppState, id: i64) -> Result<Vec<String>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver| async move {
        let result = driver
            .execute_query("SHOW CHARACTER SET".to_string())
            .await?;
        let mut charsets: Vec<String> = result
            .data
            .iter()
            .filter_map(|row| {
                row.get("Charset")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .collect();
        charsets.sort();
        Ok::<Vec<String>, AppError>(charsets)
    })
    .await
}

pub async fn get_mysql_collations_by_id(
    state: &AppState,
    id: i64,
    charset: String,
) -> Result<Vec<String>, AppError> {
    let sql = format!(
        "SHOW COLLATION WHERE Charset = '{}'",
        charset.replace('\'', "''")
    );
    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver| {
        let sql = sql.clone();
        async move {
            let result = driver.execute_query(sql).await?;
            let mut collations: Vec<String> = result
                .data
                .iter()
                .filter_map(|row| {
                    row.get("Collation")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                })
                .collect();
            collations.sort();
            Ok::<Vec<String>, AppError>(collations)
        }
    })
    .await
}

pub async fn test_connection_ephemeral(
    form: ConnectionForm,
) -> Result<TestConnectionResult, AppError> {
    let start = std::time::Instant::now();
    let form =
        crate::connection_input::normalize_connection_form(form).map_err(AppError::internal)?;

    match drivers::connect(&form).await {
        Ok(driver) => {
            let latency = start.elapsed().as_millis() as i64;
            driver.close().await;
            Ok(TestConnectionResult {
                success: true,
                message: "Connection successful".to_string(),
                latency_ms: Some(latency),
            })
        }
        Err(e) => Ok(TestConnectionResult {
            success: false,
            message: e.to_string(),
            latency_ms: None,
        }),
    }
}
