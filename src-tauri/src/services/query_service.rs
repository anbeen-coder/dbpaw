use crate::error::AppError;
use crate::models::{SqlExecutionLog, TableDataResponse};
use crate::state::AppState;

pub async fn execute_query(
    state: &AppState,
    id: i64,
    sql: String,
    database: Option<String>,
) -> Result<crate::models::QueryResult, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let sql = sql.clone();
        async move { driver.execute_query(sql).await }
    })
    .await
}

pub async fn get_table_data(
    state: &AppState,
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
) -> Result<TableDataResponse, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        let table = table.clone();
        let sort_column = sort_column.clone();
        let sort_direction = sort_direction.clone();
        let filter = filter.clone();
        let order_by = order_by.clone();
        async move {
            driver
                .get_table_data(
                    schema,
                    table,
                    page,
                    limit,
                    sort_column,
                    sort_direction,
                    filter,
                    order_by,
                )
                .await
        }
    })
    .await
}

pub async fn cancel_query(state: &AppState, id: i64, query_id: String) -> Result<(), AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))?;
    let form = db.get_connection_form_by_id(id).await?;

    if form.driver.eq_ignore_ascii_case("clickhouse") {
        let driver = crate::db::drivers::clickhouse::ClickHouseDriver::connect(&form).await?;
        driver.kill_query(&query_id).await?;
    } else if crate::db::drivers::is_mysql_family_driver(&form.driver) {
        let Some(thread_id) =
            crate::db::drivers::mysql::MysqlDriver::lookup_query_thread(&query_id).await
        else {
            return Ok(());
        };
        let driver = crate::db::drivers::mysql::MysqlDriver::connect(&form).await?;
        driver.kill_query(thread_id).await?;
        crate::db::drivers::mysql::MysqlDriver::unregister_query_thread(&query_id).await;
    } else {
        return Err(AppError::unsupported(format!(
            "Driver '{}' does not support query cancellation",
            form.driver
        )));
    }

    Ok(())
}

pub async fn get_table_data_by_conn(
    state: &AppState,
    id: i64,
    schema: String,
    table: String,
    page: i64,
    limit: i64,
    sort_column: Option<String>,
    sort_direction: Option<String>,
    filter: Option<String>,
    order_by: Option<String>,
) -> Result<TableDataResponse, AppError> {
    get_table_data(
        state,
        id,
        schema,
        table,
        page,
        limit,
        sort_column,
        sort_direction,
        filter,
        order_by,
        None,
    )
    .await
}

pub async fn execute_by_conn(
    state: &AppState,
    id: i64,
    sql: String,
) -> Result<crate::models::QueryResult, AppError> {
    execute_query(state, id, sql, None).await
}

pub async fn list_sql_execution_logs(
    state: &AppState,
    limit: Option<i64>,
) -> Result<Vec<SqlExecutionLog>, AppError> {
    let safe_limit = limit.unwrap_or(100).clamp(1, 100);
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))?;
    db.list_sql_execution_logs(safe_limit).await
}
