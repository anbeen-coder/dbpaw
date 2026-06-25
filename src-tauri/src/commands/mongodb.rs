use crate::db::drivers::mongodb::{
    MongoDBDriver, MongodbCollectionInfo, MongodbConnectionInfo, MongodbDatabaseInfo,
};
use crate::error::AppError;
use crate::models::TestConnectionResult;
use crate::state::AppState;
use serde_json::Value;
use std::time::Instant;
use tauri::State;

async fn connection_form(
    state: &State<'_, AppState>,
    id: i64,
) -> Result<crate::models::ConnectionForm, AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    let db = local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))?;
    let form = db.get_connection_form_by_id(id).await?;
    if form.driver != "mongodb" {
        return Err(AppError::unsupported(format!(
            "Connection {} is not a MongoDB connection",
            id
        )));
    }
    Ok(form)
}

async fn driver_from_id(state: &State<'_, AppState>, id: i64) -> Result<MongoDBDriver, AppError> {
    MongoDBDriver::connect(&connection_form(state, id).await?).await
}

#[tauri::command]
pub async fn mongodb_test_connection(
    state: State<'_, AppState>,
    id: i64,
) -> Result<MongodbConnectionInfo, AppError> {
    driver_from_id(&state, id)
        .await?
        .test_connection_info()
        .await
}

#[tauri::command]
pub async fn mongodb_test_connection_ephemeral(
    form: crate::models::ConnectionForm,
) -> Result<TestConnectionResult, AppError> {
    let started = Instant::now();
    let driver = MongoDBDriver::connect(&form).await?;
    match driver.test_connection_info().await {
        Ok(info) => Ok(TestConnectionResult {
            success: true,
            message: format!(
                "Connected to MongoDB {}",
                info.version.unwrap_or_else(|| "server".to_string())
            ),
            latency_ms: Some(started.elapsed().as_millis() as i64),
        }),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn mongodb_list_databases(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Vec<MongodbDatabaseInfo>, AppError> {
    driver_from_id(&state, id)
        .await?
        .list_databases_info()
        .await
}

#[tauri::command]
pub async fn mongodb_list_collections(
    state: State<'_, AppState>,
    id: i64,
    database: String,
) -> Result<Vec<MongodbCollectionInfo>, AppError> {
    driver_from_id(&state, id)
        .await?
        .list_collections_info(&database)
        .await
}

#[tauri::command]
pub async fn mongodb_find_documents(
    state: State<'_, AppState>,
    id: i64,
    database: String,
    collection: String,
    filter: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<Value, AppError> {
    driver_from_id(&state, id)
        .await?
        .find_documents(&database, &collection, filter.as_deref(), page, page_size)
        .await
}

#[tauri::command]
pub async fn mongodb_get_document(
    state: State<'_, AppState>,
    id: i64,
    database: String,
    collection: String,
    document_id: String,
) -> Result<Value, AppError> {
    driver_from_id(&state, id)
        .await?
        .get_document(&database, &collection, &document_id)
        .await
}

#[tauri::command]
pub async fn mongodb_insert_document(
    state: State<'_, AppState>,
    id: i64,
    database: String,
    collection: String,
    document: Value,
) -> Result<Value, AppError> {
    driver_from_id(&state, id)
        .await?
        .insert_document(&database, &collection, &document)
        .await
}

#[tauri::command]
pub async fn mongodb_update_document(
    state: State<'_, AppState>,
    id: i64,
    database: String,
    collection: String,
    document_id: String,
    update: Value,
) -> Result<Value, AppError> {
    driver_from_id(&state, id)
        .await?
        .update_document(&database, &collection, &document_id, &update)
        .await
}

#[tauri::command]
pub async fn mongodb_delete_document(
    state: State<'_, AppState>,
    id: i64,
    database: String,
    collection: String,
    document_id: String,
) -> Result<Value, AppError> {
    driver_from_id(&state, id)
        .await?
        .delete_document(&database, &collection, &document_id)
        .await
}

#[macro_export]
macro_rules! mongodb_commands {
    () => {
        $crate::commands::mongodb::mongodb_test_connection,
        $crate::commands::mongodb::mongodb_test_connection_ephemeral,
        $crate::commands::mongodb::mongodb_list_databases,
        $crate::commands::mongodb::mongodb_list_collections,
        $crate::commands::mongodb::mongodb_find_documents,
        $crate::commands::mongodb::mongodb_get_document,
        $crate::commands::mongodb::mongodb_insert_document,
        $crate::commands::mongodb::mongodb_update_document,
        $crate::commands::mongodb::mongodb_delete_document,
    };
}
