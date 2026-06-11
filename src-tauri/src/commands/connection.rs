use crate::models::{Connection, ConnectionForm, TestConnectionResult};
use crate::services::connection_service::{self, CreateDatabasePayload};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_connections(
    state: State<'_, AppState>,
) -> Result<Vec<Connection>, String> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| "Local DB not initialized".to_string())?;
    db.list_connections().await.map_err(String::from)
}

#[tauri::command]
pub async fn create_connection(
    state: State<'_, AppState>,
    form: ConnectionForm,
) -> Result<Connection, String> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| "Local DB not initialized".to_string())?;
    db.create_connection(form).await.map_err(String::from)
}

#[tauri::command]
pub async fn update_connection(
    state: State<'_, AppState>,
    id: i64,
    form: ConnectionForm,
) -> Result<Connection, String> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| "Local DB not initialized".to_string())?;
    state.pool_manager.remove_by_prefix(&id.to_string()).await;
    db.update_connection(id, form).await.map_err(String::from)
}

#[tauri::command]
pub async fn delete_connection(
    state: State<'_, AppState>,
    id: i64,
) -> Result<(), String> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| "Local DB not initialized".to_string())?;
    state.pool_manager.remove_by_prefix(&id.to_string()).await;
    state.redis_cache.lock().await.remove_by_connection_id(id);
    db.delete_connection(id).await.map_err(String::from)
}

#[tauri::command]
pub async fn import_connections(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<crate::import::ImportResult, String> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| "Local DB not initialized".to_string())?;
    crate::import::import_from_file(&file_path, &db).await
}

#[tauri::command]
pub async fn test_connection_ephemeral(
    form: ConnectionForm,
) -> Result<TestConnectionResult, String> {
    connection_service::test_connection_ephemeral(form)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_databases(
    form: ConnectionForm,
) -> Result<Vec<String>, String> {
    connection_service::list_databases(form)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_databases_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Vec<String>, String> {
    connection_service::list_databases_by_id(&state, id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn create_database_by_id(
    state: State<'_, AppState>,
    id: i64,
    payload: CreateDatabasePayload,
) -> Result<(), String> {
    connection_service::create_database_by_id(&state, id, payload)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_mysql_charsets_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Vec<String>, String> {
    connection_service::get_mysql_charsets_by_id(&state, id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_mysql_collations_by_id(
    state: State<'_, AppState>,
    id: i64,
    charset: String,
) -> Result<Vec<String>, String> {
    connection_service::get_mysql_collations_by_id(&state, id, charset)
        .await
        .map_err(String::from)
}

pub async fn get_connections_direct(state: &AppState) -> Result<Vec<Connection>, String> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| "Local DB not initialized".to_string())?;
    db.list_connections().await.map_err(String::from)
}

pub async fn list_databases_by_id_direct(state: &AppState, id: i64) -> Result<Vec<String>, String> {
    connection_service::list_databases_by_id(state, id)
        .await
        .map_err(String::from)
}
