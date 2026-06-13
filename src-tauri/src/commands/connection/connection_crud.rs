use crate::db::drivers::DatabaseDriver;
use crate::error::AppError;
use crate::models::{Connection, ConnectionForm, TestConnectionResult};
use crate::state::AppState;
use std::time::Instant;
use tauri::State;

#[tauri::command]
pub async fn list_databases(form: ConnectionForm) -> Result<Vec<String>, AppError> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let driver = crate::db::drivers::connect(&form)
        .await
        ?;
    driver.list_databases().await
}

#[tauri::command]
pub async fn list_databases_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Vec<String>, AppError> {
    crate::commands::execute_with_retry(&state, id, None, |driver| async move {
        driver.list_databases().await
    })
    .await
    
}

pub async fn list_databases_by_id_direct(state: &AppState, id: i64) -> Result<Vec<String>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver| async move {
        driver.list_databases().await
    })
    .await
    
}

#[tauri::command]
pub async fn test_connection_ephemeral(
    form: ConnectionForm,
) -> Result<TestConnectionResult, AppError> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let start = Instant::now();
    if form.driver == "redis" {
        let mut conn = crate::datasources::redis::connect(&form, None).await?;
        crate::datasources::redis::ping(&mut conn).await?;
    } else if form.driver == "elasticsearch" {
        let client = crate::datasources::elasticsearch::ElasticsearchClient::connect(&form)?;
        client.test_connection().await?;
    } else if form.driver == "mongodb" {
        let driver = crate::db::drivers::mongodb::MongoDBDriver::connect(&form).await?;
        driver.test_connection().await?;
    } else {
        let driver = crate::db::drivers::connect(&form).await?;
        driver.test_connection().await?;
    }

    let elapsed = start.elapsed().as_millis() as i64;
    Ok(TestConnectionResult {
        success: true,
        message: "Connection successful".to_string(),
        latency_ms: Some(elapsed),
    })
}

#[tauri::command]
pub async fn get_connections(state: State<'_, AppState>) -> Result<Vec<Connection>, AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        db.list_connections().await
    } else {
        Err(AppError::internal("Local DB not initialized").into())
    }
}

pub async fn get_connections_direct(state: &AppState) -> Result<Vec<Connection>, AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        db.list_connections().await
    } else {
        Err(AppError::internal("Local DB not initialized").into())
    }
}

#[tauri::command]
pub async fn create_connection(
    state: State<'_, AppState>,
    form: ConnectionForm,
) -> Result<Connection, AppError> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        db.create_connection(form).await
    } else {
        Err(AppError::internal("Local DB not initialized").into())
    }
}

pub async fn create_connection_direct(
    state: &AppState,
    form: ConnectionForm,
) -> Result<Connection, AppError> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        db.create_connection(form).await
    } else {
        Err(AppError::internal("Local DB not initialized").into())
    }
}

#[tauri::command]
pub async fn update_connection(
    state: State<'_, AppState>,
    id: i64,
    form: ConnectionForm,
) -> Result<Connection, AppError> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        // If connection is updated, we should remove it from pool so next usage reconnects with new config
        state.pool_manager.remove_by_prefix(&id.to_string()).await;

        db.update_connection(id, form).await
    } else {
        Err(AppError::internal("Local DB not initialized").into())
    }
}

pub async fn update_connection_direct(
    state: &AppState,
    id: i64,
    form: ConnectionForm,
) -> Result<Connection, AppError> {
    let form = crate::connection_input::normalize_connection_form(form)?;
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        state.pool_manager.remove_by_prefix(&id.to_string()).await;
        db.update_connection(id, form).await
    } else {
        Err(AppError::internal("Local DB not initialized").into())
    }
}

#[tauri::command]
pub async fn delete_connection(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    delete_connection_direct(&state, id).await
}

pub async fn delete_connection_direct(state: &AppState, id: i64) -> Result<(), AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    if let Some(db) = local_db {
        state.pool_manager.remove_by_prefix(&id.to_string()).await;
        state.redis_cache.lock().await.remove_by_connection_id(id);
        db.delete_connection(id).await
    } else {
        Err(AppError::internal("Local DB not initialized").into())
    }
}
