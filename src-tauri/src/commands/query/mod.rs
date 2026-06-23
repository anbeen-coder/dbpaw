mod execute_core;
mod helpers;
mod running_queries;

use crate::error::AppError;
use crate::models::{ConnectionForm, QueryResult, SqlExecutionLog, TableDataResponse};
use crate::sql::query_guard::apply_default_limit;
use crate::state::AppState;
use tauri::State;

use execute_core::{execute_by_conn_core, execute_query_core};
use helpers::{clamp_sql_execution_logs_limit, resolve_include_total, validate_page_limit};
use running_queries::{execute_cancel_query, is_running_query};

#[tauri::command]
pub async fn get_table_data_by_conn(
    form: ConnectionForm,
    schema: String,
    table: String,
    page: i64,
    limit: i64,
    include_total: Option<bool>,
) -> Result<TableDataResponse, AppError> {
    validate_page_limit(page, limit)?;
    let driver = crate::db::drivers::connect(&form).await?;
    driver
        .get_table_data(
            schema,
            table,
            page,
            limit,
            None,
            None,
            None,
            None,
            resolve_include_total(include_total),
        )
        .await
}

#[tauri::command]
pub async fn execute_query(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    id: i64,
    query: String,
    database: Option<String>,
    source: Option<String>,
    query_id: Option<String>,
) -> Result<QueryResult, AppError> {
    execute_query_core(
        state.inner(),
        id,
        query,
        database,
        source,
        query_id,
        Some(&app_handle),
    )
    .await
}

pub async fn execute_query_by_id_direct(
    state: &AppState,
    id: i64,
    query: String,
    database: Option<String>,
    source: Option<String>,
    query_id: Option<String>,
) -> Result<QueryResult, AppError> {
    execute_query_core(state, id, query, database, source, query_id, None).await
}

pub async fn execute_by_conn_direct(
    form: ConnectionForm,
    sql: String,
) -> Result<QueryResult, AppError> {
    let guarded_sql = apply_default_limit(&sql, Some(&form.driver));
    let driver = crate::db::drivers::connect(&form).await?;
    driver.execute_query_with_id(guarded_sql, None).await
}

#[tauri::command]
pub async fn get_table_data(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: String,
    table: String,
    page: i64,
    limit: i64,
    filter: Option<String>,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    order_by: Option<String>,
    include_total: Option<bool>,
) -> Result<TableDataResponse, AppError> {
    validate_page_limit(page, limit)?;
    let include_total = resolve_include_total(include_total);
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        let table_clone = table.clone();
        let filter_clone = filter.clone();
        let sort_col_clone = sort_column.clone();
        let sort_dir_clone = sort_direction.clone();
        let order_by_clone = order_by.clone();
        async move {
            driver
                .get_table_data(
                    schema_clone,
                    table_clone,
                    page,
                    limit,
                    sort_col_clone,
                    sort_dir_clone,
                    filter_clone,
                    order_by_clone,
                    include_total,
                )
                .await
        }
    })
    .await
}

async fn cancel_query_core(
    state: &AppState,
    uuid: String,
    query_id: String,
) -> Result<bool, AppError> {
    let connection_id = uuid
        .trim()
        .parse::<i64>()
        .map_err(|_| AppError::validation("Invalid connection id for cancellation"))?;
    let query_id = query_id.trim().to_string();
    if query_id.is_empty() {
        return Err(AppError::validation("query_id cannot be empty"));
    }
    if !is_running_query(connection_id, &query_id).await {
        return Ok(false);
    }

    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))?;
    let form = db.get_connection_form_by_id(connection_id).await?;

    execute_cancel_query(connection_id, &query_id, &form)
        .await
        .map_err(AppError::internal)
}

#[tauri::command]
pub async fn cancel_query(
    state: State<'_, AppState>,
    uuid: String,
    query_id: String,
) -> Result<bool, AppError> {
    cancel_query_core(state.inner(), uuid, query_id).await
}

#[tauri::command]
pub async fn execute_by_conn(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    form: ConnectionForm,
    sql: String,
) -> Result<QueryResult, AppError> {
    execute_by_conn_core(state.inner(), form, sql, Some(&app_handle)).await
}

async fn list_sql_execution_logs_core(
    state: &AppState,
    limit: Option<i64>,
) -> Result<Vec<SqlExecutionLog>, AppError> {
    let safe_limit = clamp_sql_execution_logs_limit(limit);
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };

    let db = local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))?;
    db.list_sql_execution_logs(safe_limit).await
}

#[tauri::command]
pub async fn list_sql_execution_logs(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<SqlExecutionLog>, AppError> {
    list_sql_execution_logs_core(state.inner(), limit).await
}

pub async fn list_sql_execution_logs_direct(
    state: &AppState,
    limit: Option<i64>,
) -> Result<Vec<SqlExecutionLog>, AppError> {
    list_sql_execution_logs_core(state, limit).await
}

pub async fn cancel_query_direct(
    state: &AppState,
    uuid: String,
    query_id: String,
) -> Result<bool, AppError> {
    cancel_query_core(state, uuid, query_id).await
}

#[cfg(test)]
mod tests {
    use super::helpers::{clamp_sql_execution_logs_limit, resolve_include_total};
    use super::running_queries::make_query_id;

    #[test]
    fn sql_logs_limit_defaults_to_100() {
        assert_eq!(clamp_sql_execution_logs_limit(None), 100);
    }

    #[test]
    fn sql_logs_limit_clamps_lower_bound() {
        assert_eq!(clamp_sql_execution_logs_limit(Some(0)), 1);
        assert_eq!(clamp_sql_execution_logs_limit(Some(-5)), 1);
    }

    #[test]
    fn sql_logs_limit_clamps_upper_bound() {
        assert_eq!(clamp_sql_execution_logs_limit(Some(101)), 100);
        assert_eq!(clamp_sql_execution_logs_limit(Some(9999)), 100);
    }

    #[test]
    fn make_query_id_uses_provided_and_falls_back() {
        assert_eq!(
            make_query_id(42, Some(" custom-id ".to_string())),
            "custom-id"
        );

        let generated = make_query_id(7, Some("   ".to_string()));
        assert!(generated.starts_with("q-7-"));
    }

    #[test]
    fn resolve_include_total_defaults_to_false() {
        assert!(!resolve_include_total(None));
        assert!(!resolve_include_total(Some(false)));
        assert!(resolve_include_total(Some(true)));
    }
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
