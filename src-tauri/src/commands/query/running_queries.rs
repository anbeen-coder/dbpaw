use crate::error::AppError;
use crate::state::AppState;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
use tokio::sync::Mutex;

pub(super) type RunningQueryRegistry = HashMap<i64, HashSet<String>>;

pub(super) fn running_queries() -> &'static Mutex<RunningQueryRegistry> {
    static RUNNING_QUERIES: OnceLock<Mutex<RunningQueryRegistry>> = OnceLock::new();
    RUNNING_QUERIES.get_or_init(|| Mutex::new(HashMap::new()))
}

pub(super) fn make_query_id(connection_id: i64, provided: Option<String>) -> String {
    if let Some(id) = provided {
        let trimmed = id.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("q-{}-{}", connection_id, ts)
}

pub(super) async fn resolve_driver(state: &AppState, id: i64) -> Option<String> {
    let db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    }?;
    db.get_connection_form_by_id(id)
        .await
        .ok()
        .map(|f| f.driver)
}

pub(super) fn supports_query_cancellation(driver: &str) -> bool {
    let d = driver.to_ascii_lowercase();
    d == "clickhouse" || crate::db::drivers::is_mysql_family_driver(&d)
}

pub(super) async fn execute_cancel_query(
    connection_id: i64,
    query_id: &str,
    form: &crate::models::ConnectionForm,
) -> Result<bool, AppError> {
    if form.driver.eq_ignore_ascii_case("clickhouse") {
        let driver = crate::db::drivers::clickhouse::ClickHouseDriver::connect(form).await?;
        driver.kill_query(query_id).await?;
        unregister_running_query(connection_id, query_id).await;
        Ok(true)
    } else if crate::db::drivers::is_mysql_family_driver(&form.driver) {
        let Some(thread_id) =
            crate::db::drivers::mysql::MysqlDriver::lookup_query_thread(query_id).await
        else {
            return Ok(false);
        };
        let driver = crate::db::drivers::mysql::MysqlDriver::connect(form).await?;
        driver.kill_query(thread_id).await?;
        crate::db::drivers::mysql::MysqlDriver::unregister_query_thread(query_id).await;
        unregister_running_query(connection_id, query_id).await;
        Ok(true)
    } else {
        Ok(false)
    }
}

pub(super) async fn register_running_query(connection_id: i64, query_id: &str) {
    let mut guard = running_queries().lock().await;
    guard
        .entry(connection_id)
        .or_default()
        .insert(query_id.to_string());
}

pub(super) async fn unregister_running_query(connection_id: i64, query_id: &str) {
    let mut guard = running_queries().lock().await;
    if let Some(ids) = guard.get_mut(&connection_id) {
        ids.remove(query_id);
        if ids.is_empty() {
            guard.remove(&connection_id);
        }
    }
}

pub(super) async fn is_running_query(connection_id: i64, query_id: &str) -> bool {
    let guard = running_queries().lock().await;
    guard
        .get(&connection_id)
        .map(|ids| ids.contains(query_id))
        .unwrap_or(false)
}
