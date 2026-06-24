use std::sync::Arc;

use tauri::State;

use crate::db::drivers::DatabaseDriver;
use crate::error::AppError;
use crate::state::AppState;

use super::is_safe_option_token;

async fn get_mysql_charsets_core(
    state: &AppState,
    id: i64,
) -> Result<Vec<String>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver: Arc<dyn DatabaseDriver>| async move {
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

async fn get_mysql_collations_core(
    state: &AppState,
    id: i64,
    charset: Option<String>,
) -> Result<Vec<String>, AppError> {
    let sql = match &charset {
        Some(cs) if is_safe_option_token(cs) => {
            format!("SHOW COLLATION WHERE Charset = '{}'", cs)
        }
        Some(cs) => {
            return Err(AppError::validation(format!("Invalid charset: {}", cs)));
        }
        None => "SHOW COLLATION".to_string(),
    };
    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver: Arc<dyn DatabaseDriver>| {
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

#[tauri::command]
pub async fn get_mysql_charsets_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Vec<String>, AppError> {
    get_mysql_charsets_core(state.inner(), id).await
}

#[tauri::command]
pub async fn get_mysql_collations_by_id(
    state: State<'_, AppState>,
    id: i64,
    charset: Option<String>,
) -> Result<Vec<String>, AppError> {
    get_mysql_collations_core(state.inner(), id, charset).await
}

pub async fn get_mysql_charsets_by_id_direct(
    state: &AppState,
    id: i64,
) -> Result<Vec<String>, AppError> {
    get_mysql_charsets_core(state, id).await
}

pub async fn get_mysql_collations_by_id_direct(
    state: &AppState,
    id: i64,
    charset: Option<String>,
) -> Result<Vec<String>, AppError> {
    get_mysql_collations_core(state, id, charset).await
}
