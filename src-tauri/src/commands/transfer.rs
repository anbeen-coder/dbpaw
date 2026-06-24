mod export_service;
mod import_dialects;
mod import_parser;
mod import_service;
mod import_types;
mod sql_writer;
mod writer;

use self::export_service::{
    DEFAULT_CHUNK_SIZE, do_database_export, do_query_export, do_table_export,
};
#[cfg(test)]
use self::import_parser::*;
#[cfg(test)]
use self::import_types::*;
use self::import_service::{execute_sql_import, prepare_sql_import};
#[cfg(test)]
use self::sql_writer::{quote_ident, quote_target, sql_value};
#[cfg(test)]
use self::writer::{ExportWriter, csv_escape, validate_output_path};
use self::writer::{extension_for_format, resolve_output_path};
#[cfg(test)]
use crate::db::drivers::{DatabaseDriver, DriverResult};
use crate::error::AppError;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
#[cfg(test)]
use serde_json::Value;
#[cfg(test)]
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExportFormat {
    Csv,
    Json,
    SqlDml,
    SqlDdl,
    SqlFull,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExportScope {
    CurrentPage,
    Filtered,
    FullTable,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub file_path: String,
    pub row_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSqlResult {
    pub file_path: String,
    pub total_statements: i64,
    pub success_statements: i64,
    pub failed_at: Option<i64>,
    pub failed_batch: Option<i64>,
    pub failed_statement_preview: Option<String>,
    pub error: Option<String>,
    pub time_taken_ms: i64,
    pub rolled_back: bool,
}

async fn export_table_data_core(
    state: &AppState,
    id: i64,
    database: Option<String>,
    schema: String,
    table: String,
    driver: String,
    format: ExportFormat,
    scope: ExportScope,
    filter: Option<String>,
    order_by: Option<String>,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    page: Option<i64>,
    limit: Option<i64>,
    file_path: Option<String>,
    chunk_size: Option<i64>,
) -> Result<ExportResult, AppError> {
    let output_path = resolve_output_path(file_path, &table, extension_for_format(&format))?;
    let chunk = chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE).max(1);
    super::execute_with_retry_from_app_state(state, id, database, |db_driver| {
        let output_path = output_path.clone();
        let schema = schema.clone();
        let table = table.clone();
        let driver = driver.clone();
        let filter = filter.clone();
        let order_by = order_by.clone();
        let sort_column = sort_column.clone();
        let sort_direction = sort_direction.clone();
        let scope = scope.clone();
        let format = format.clone();
        async move {
            do_table_export(
                db_driver,
                output_path,
                schema,
                table,
                driver,
                format,
                scope,
                filter,
                order_by,
                sort_column,
                sort_direction,
                page,
                limit,
                chunk,
            )
            .await
        }
    })
    .await
}

#[tauri::command]
pub async fn export_table_data(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: String,
    table: String,
    driver: String,
    format: ExportFormat,
    scope: ExportScope,
    filter: Option<String>,
    order_by: Option<String>,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    page: Option<i64>,
    limit: Option<i64>,
    file_path: Option<String>,
    chunk_size: Option<i64>,
) -> Result<ExportResult, AppError> {
    export_table_data_core(
        state.inner(), id, database, schema, table, driver, format, scope,
        filter, order_by, sort_column, sort_direction, page, limit, file_path, chunk_size,
    )
    .await
}

pub async fn export_table_data_direct(
    state: &AppState,
    id: i64,
    database: Option<String>,
    schema: String,
    table: String,
    driver: String,
    format: ExportFormat,
    scope: ExportScope,
    filter: Option<String>,
    order_by: Option<String>,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    page: Option<i64>,
    limit: Option<i64>,
    file_path: Option<String>,
    chunk_size: Option<i64>,
) -> Result<ExportResult, AppError> {
    export_table_data_core(
        state, id, database, schema, table, driver, format, scope,
        filter, order_by, sort_column, sort_direction, page, limit, file_path, chunk_size,
    )
    .await
}

async fn export_database_sql_core(
    state: &AppState,
    id: i64,
    database: String,
    driver: String,
    format: ExportFormat,
    file_path: Option<String>,
    chunk_size: Option<i64>,
) -> Result<ExportResult, AppError> {
    let output_path = resolve_output_path(file_path, &database, "sql")?;
    let chunk = chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE).max(1);
    super::execute_with_retry_from_app_state(state, id, Some(database), |db_driver| {
        let output_path = output_path.clone();
        let driver = driver.clone();
        let format = format.clone();
        async move { do_database_export(db_driver, output_path, driver, format, chunk).await }
    })
    .await
}

#[tauri::command]
pub async fn export_database_sql(
    state: State<'_, AppState>,
    id: i64,
    database: String,
    driver: String,
    format: ExportFormat,
    file_path: Option<String>,
    chunk_size: Option<i64>,
) -> Result<ExportResult, AppError> {
    export_database_sql_core(state.inner(), id, database, driver, format, file_path, chunk_size).await
}

pub async fn export_database_sql_direct(
    state: &AppState,
    id: i64,
    database: String,
    driver: String,
    format: ExportFormat,
    file_path: Option<String>,
    chunk_size: Option<i64>,
) -> Result<ExportResult, AppError> {
    export_database_sql_core(state, id, database, driver, format, file_path, chunk_size).await
}

async fn export_query_result_core(
    state: &AppState,
    id: i64,
    database: Option<String>,
    sql: String,
    driver: String,
    format: ExportFormat,
    file_path: Option<String>,
) -> Result<ExportResult, AppError> {
    if matches!(format, ExportFormat::SqlDdl) {
        return Err(
            AppError::unsupported("SqlDdl format is not supported for query exports")
                .to_string()
                .into(),
        );
    }
    let output_path =
        resolve_output_path(file_path, "query_result", extension_for_format(&format))?;

    super::execute_with_retry_from_app_state(state, id, database, |db_driver| {
        let output_path = output_path.clone();
        let driver = driver.clone();
        let sql = sql.clone();
        let format = format.clone();
        async move { do_query_export(db_driver, output_path, sql, driver, format).await }
    })
    .await
}

#[tauri::command]
pub async fn export_query_result(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    sql: String,
    driver: String,
    format: ExportFormat,
    file_path: Option<String>,
) -> Result<ExportResult, AppError> {
    export_query_result_core(state.inner(), id, database, sql, driver, format, file_path).await
}

pub async fn export_query_result_direct(
    state: &AppState,
    id: i64,
    database: Option<String>,
    sql: String,
    driver: String,
    format: ExportFormat,
    file_path: Option<String>,
) -> Result<ExportResult, AppError> {
    export_query_result_core(state, id, database, sql, driver, format, file_path).await
}

async fn import_sql_file_core(
    state: &AppState,
    id: i64,
    database: Option<String>,
    file_path: String,
    driver: String,
) -> Result<ImportSqlResult, AppError> {
    let prepared = prepare_sql_import(file_path, &driver)?;
    let started_at = std::time::Instant::now();
    super::execute_with_retry_from_app_state(state, id, database, |db_driver| {
        let prepared = prepared.clone();
        async move { execute_sql_import(db_driver, prepared, started_at).await }
    })
    .await
}

#[tauri::command]
pub async fn import_sql_file(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    file_path: String,
    driver: String,
) -> Result<ImportSqlResult, AppError> {
    import_sql_file_core(state.inner(), id, database, file_path, driver).await
}

pub async fn import_sql_file_direct(
    state: &AppState,
    id: i64,
    database: Option<String>,
    file_path: String,
    driver: String,
) -> Result<ImportSqlResult, AppError> {
    import_sql_file_core(state, id, database, file_path, driver).await
}

#[cfg(test)]
mod tests;

#[macro_export]
macro_rules! transfer_commands {
    () => {
        $crate::commands::transfer::export_table_data,
        $crate::commands::transfer::export_database_sql,
        $crate::commands::transfer::export_query_result,
        $crate::commands::transfer::import_sql_file,
    };
}
