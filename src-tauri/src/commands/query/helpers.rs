use crate::error::AppError;
use crate::state::AppState;

pub(super) async fn append_sql_execution_log(
    state: &AppState,
    sql: String,
    source: Option<String>,
    connection_id: Option<i64>,
    database: Option<String>,
    success: bool,
    error: Option<String>,
) {
    let db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };

    if let Some(local_db) = db {
        if let Err(e) = local_db
            .insert_sql_execution_log(sql, source, connection_id, database, success, error)
            .await
        {
            tracing::error!(error = %e, "Failed to append SQL execution log");
        }
    }
}

pub(super) fn validate_page_limit(page: i64, limit: i64) -> Result<(), AppError> {
    if page <= 0 {
        return Err(AppError::validation("page must be greater than 0"));
    }
    if limit <= 0 {
        return Err(AppError::validation("limit must be greater than 0"));
    }
    Ok(())
}

pub(super) fn resolve_include_total(value: Option<bool>) -> bool {
    value.unwrap_or(false)
}

pub(super) fn clamp_sql_execution_logs_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(100).clamp(1, 100)
}
