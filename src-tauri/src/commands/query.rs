use crate::models::{QueryResult, SqlExecutionLog, TableDataResponse};
use crate::services::query_service;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn execute_query(
    state: State<'_, AppState>,
    id: i64,
    sql: String,
    database: Option<String>,
) -> Result<QueryResult, String> {
    query_service::execute_query(&state, id, sql, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_table_data(
    state: State<'_, AppState>,
    id: i64,
    schema: String,
    table: String,
    page: i64,
    limit: i64,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    filter: Option<String>,
    order_by: Option<String>,
    database: Option<String>,
) -> Result<TableDataResponse, String> {
    query_service::get_table_data(
        &state, id, schema, table, page, limit,
        sort_column, sort_direction, filter, order_by, database,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn cancel_query(
    state: State<'_, AppState>,
    id: i64,
    query_id: String,
) -> Result<(), String> {
    query_service::cancel_query(&state, id, query_id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_table_data_by_conn(
    state: State<'_, AppState>,
    id: i64,
    schema: String,
    table: String,
    page: i64,
    limit: i64,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    filter: Option<String>,
    order_by: Option<String>,
) -> Result<TableDataResponse, String> {
    query_service::get_table_data_by_conn(
        &state, id, schema, table, page, limit,
        sort_column, sort_direction, filter, order_by,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn execute_by_conn(
    state: State<'_, AppState>,
    id: i64,
    sql: String,
) -> Result<QueryResult, String> {
    query_service::execute_by_conn(&state, id, sql)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_sql_execution_logs(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<SqlExecutionLog>, String> {
    query_service::list_sql_execution_logs(&state, limit)
        .await
        .map_err(String::from)
}

#[macro_export]
macro_rules! query_commands {
    () => {
        $crate::commands::query::execute_query,
        $crate::commands::query::get_table_data,
        $crate::commands::query::cancel_query,
        $crate::commands::query::get_table_data_by_conn,
        $crate::commands::query::execute_by_conn,
        $crate::commands::query::list_sql_execution_logs,
    };
}
