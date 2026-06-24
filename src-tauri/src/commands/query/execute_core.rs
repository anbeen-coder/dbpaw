use crate::error::AppError;
use crate::models::QueryResult;
use crate::sql::query_guard::apply_default_limit;
use crate::state::AppState;
use tauri::Emitter;

use super::helpers::append_sql_execution_log;
use super::running_queries::{
    make_query_id, register_running_query, resolve_driver, supports_query_cancellation,
    unregister_running_query,
};

pub(super) async fn execute_query_core(
    state: &AppState,
    id: i64,
    query: String,
    database: Option<String>,
    source: Option<String>,
    query_id: Option<String>,
    emitter: Option<&tauri::AppHandle>,
) -> Result<QueryResult, AppError> {
    let query_id = make_query_id(id, query_id);
    if let Some(handle) = emitter {
        let _ = handle.emit(
            "query.progress",
            serde_json::json!({"queryId": query_id.clone(), "phase": "prepare"}),
        );
    }
    let driver = resolve_driver(state, id).await;
    if driver
        .as_deref()
        .map(|d| d.eq_ignore_ascii_case("redis"))
        .unwrap_or(false)
    {
        return Err(AppError::unsupported(
            "Redis connections do not support SQL queries. Use the Redis key view to browse and edit keys.",
        ));
    }
    let cancellation_supported = driver
        .as_deref()
        .map(supports_query_cancellation)
        .unwrap_or(false);
    let guarded_query = apply_default_limit(&query, driver.as_deref());
    if cancellation_supported {
        register_running_query(id, &query_id).await;
    }

    let result =
        super::super::execute_with_retry_from_app_state(state, id, database.clone(), |driver| {
            let query_clone = guarded_query.clone();
            let query_id_clone = query_id.clone();
            async move {
                driver
                    .execute_query_with_id(
                        query_clone,
                        if cancellation_supported {
                            Some(query_id_clone.as_str())
                        } else {
                            None
                        },
                    )
                    .await
            }
        })
        .await;
    if cancellation_supported {
        unregister_running_query(id, &query_id).await;
    }

    if let Ok(res) = &result {
        if let Some(handle) = emitter {
            if !res.data.is_empty() {
                let _ = handle.emit(
                    "query.chunk",
                    serde_json::json!({
                        "queryId": query_id,
                        "rows": res.data.iter().take(50).collect::<Vec<_>>()
                    }),
                );
            }
        }

        append_sql_execution_log(
            state,
            guarded_query.clone(),
            source,
            Some(id),
            database,
            true,
            None,
        )
        .await;
    } else if let Err(err) = &result {
        append_sql_execution_log(
            state,
            guarded_query.clone(),
            source,
            Some(id),
            database,
            false,
            Some(err.to_string()),
        )
        .await;
    }

    result
}

pub(super) async fn execute_by_conn_core(
    state: &AppState,
    form: crate::models::ConnectionForm,
    sql: String,
    emitter: Option<&tauri::AppHandle>,
) -> Result<QueryResult, AppError> {
    let query_id = make_query_id(-1, None);
    if let Some(handle) = emitter {
        let _ = handle.emit(
            "query.progress",
            serde_json::json!({"queryId": query_id.clone(), "phase": "prepare"}),
        );
    }
    let guarded_sql = apply_default_limit(&sql, Some(&form.driver));

    let database = form.database.clone();
    let driver = crate::db::drivers::connect(&form).await?;
    let result = driver
        .execute_query_with_id(
            guarded_sql.clone(),
            if supports_query_cancellation(&form.driver) {
                Some(query_id.as_str())
            } else {
                None
            },
        )
        .await;

    if let Ok(res) = &result {
        if let Some(handle) = emitter {
            if !res.data.is_empty() {
                let _ = handle.emit(
                    "query.chunk",
                    serde_json::json!({
                        "queryId": query_id,
                        "rows": res.data.iter().take(50).collect::<Vec<_>>()
                    }),
                );
            }
        }

        append_sql_execution_log(
            state,
            guarded_sql.clone(),
            Some("execute_by_conn".to_string()),
            None,
            database,
            true,
            None,
        )
        .await;
    } else if let Err(err) = &result {
        append_sql_execution_log(
            state,
            guarded_sql.clone(),
            Some("execute_by_conn".to_string()),
            None,
            database,
            false,
            Some(err.to_string()),
        )
        .await;
    }

    result
}
