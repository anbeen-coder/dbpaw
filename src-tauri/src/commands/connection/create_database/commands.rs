use std::sync::Arc;

use tauri::State;

use crate::db::drivers::DatabaseDriver;
use crate::error::AppError;
use crate::state::AppState;

use super::{
    normalize_create_database_error, quote_literal, validate_database_name, CreateDatabasePayload,
};
use super::sql_builders::{
    build_cassandra_create_database_sql, build_clickhouse_create_database_sql,
    build_mssql_create_database_sql, build_mysql_create_database_sql,
    build_postgres_create_database_sql,
};

async fn create_database_core(
    state: &AppState,
    id: i64,
    payload: CreateDatabasePayload,
) -> Result<(), AppError> {
    let db_name = validate_database_name(&payload.name)?;
    let if_not_exists = payload.if_not_exists.unwrap_or(true);
    let driver = {
        let local_db = {
            let lock = state.local_db.lock().await;
            lock.clone()
        };
        let db = local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))?;
        db.get_connection_form_by_id(id)
            .await?
            .driver
            .to_lowercase()
    };

    if matches!(driver.as_str(), "sqlite" | "duckdb") {
        return Err(AppError::unsupported(format!(
            "Driver {} does not support creating databases in this flow",
            driver
        )));
    }

    let exec_res = match driver.as_str() {
        driver if crate::db::drivers::is_mysql_family_driver(driver) => {
            let sql = build_mysql_create_database_sql(&payload, &db_name)?;
            crate::commands::execute_with_retry_from_app_state(state, id, None, |driver: Arc<dyn DatabaseDriver>| {
                let sql_clone = sql.clone();
                async move { driver.execute_query(sql_clone).await.map(|_| ()) }
            })
            .await
        }
        "postgres" => {
            let create_sql = build_postgres_create_database_sql(&payload, &db_name)?;
            let exists_check_sql = format!(
                "SELECT 1 FROM pg_database WHERE datname = {} LIMIT 1",
                quote_literal(&db_name)
            );
            crate::commands::execute_with_retry_from_app_state(state, id, None, |driver: Arc<dyn DatabaseDriver>| {
                let exists_sql = exists_check_sql.clone();
                let create_sql = create_sql.clone();
                async move {
                    if if_not_exists {
                        let exists_result = driver.execute_query(exists_sql).await?;
                        if exists_result.row_count > 0 || !exists_result.data.is_empty() {
                            return Ok(());
                        }
                    }
                    driver.execute_query(create_sql).await.map(|_| ())
                }
            })
            .await
        }
        "mssql" => {
            let sql = build_mssql_create_database_sql(&payload, &db_name)?;
            crate::commands::execute_with_retry_from_app_state(state, id, None, |driver: Arc<dyn DatabaseDriver>| {
                let sql_clone = sql.clone();
                async move { driver.execute_query(sql_clone).await.map(|_| ()) }
            })
            .await
        }
        "clickhouse" => {
            let sql = build_clickhouse_create_database_sql(&payload, &db_name)?;
            crate::commands::execute_with_retry_from_app_state(state, id, None, |driver: Arc<dyn DatabaseDriver>| {
                let sql_clone = sql.clone();
                async move { driver.execute_query(sql_clone).await.map(|_| ()) }
            })
            .await
        }
        "cassandra" => {
            let sql = build_cassandra_create_database_sql(&payload, &db_name)?;
            crate::commands::execute_with_retry_from_app_state(state, id, None, |driver: Arc<dyn DatabaseDriver>| {
                let sql_clone = sql.clone();
                async move { driver.execute_query(sql_clone).await.map(|_| ()) }
            })
            .await
        }
        _ => Err(AppError::unsupported(format!(
            "Driver {} not supported for create database",
            driver
        ))),
    };

    exec_res.map_err(|e| normalize_create_database_error(e, &db_name))
}

#[tauri::command]
pub async fn create_database_by_id(
    state: State<'_, AppState>,
    id: i64,
    payload: CreateDatabasePayload,
) -> Result<(), AppError> {
    create_database_core(state.inner(), id, payload).await
}

pub async fn create_database_by_id_direct(
    state: &AppState,
    id: i64,
    payload: CreateDatabasePayload,
) -> Result<(), AppError> {
    create_database_core(state, id, payload).await
}
