use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_connections(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<crate::import::ImportResult, AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        crate::import::import_from_file(&file_path, &db)
            .await
            .map_err(AppError::internal)
    } else {
        Err(AppError::internal("Local DB not initialized"))
    }
}
