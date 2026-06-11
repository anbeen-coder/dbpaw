use crate::services::transfer_service;
use crate::services::transfer_service::ImportResult;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn export_table_data(
    state: State<'_, AppState>,
    id: i64,
    schema: String,
    table: String,
    format: String,
    database: Option<String>,
) -> Result<String, String> {
    transfer_service::export_table_data(&state, id, schema, table, format, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn export_database_sql(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<String, String> {
    transfer_service::export_database_sql(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn export_query_result(
    state: State<'_, AppState>,
    id: i64,
    sql: String,
    format: String,
    database: Option<String>,
) -> Result<String, String> {
    transfer_service::export_query_result(&state, id, sql, format, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn import_sql_file(
    state: State<'_, AppState>,
    id: i64,
    file_path: String,
    database: Option<String>,
) -> Result<ImportResult, String> {
    transfer_service::import_sql_file(&state, id, file_path, database)
        .await
        .map_err(String::from)
}
