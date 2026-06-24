use crate::error::AppError;
use crate::models::{AiProviderForm, AiProviderPublic};
use crate::state::AppState;
use tauri::State;

use super::{get_db, normalize_provider_form, normalize_provider_type};

#[tauri::command]
pub async fn ai_list_providers(
    state: State<'_, AppState>,
) -> Result<Vec<AiProviderPublic>, AppError> {
    let db = get_db(&state).await?;
    db.list_ai_providers_public().await
}

#[tauri::command]
pub async fn ai_create_provider(
    state: State<'_, AppState>,
    mut config: AiProviderForm,
) -> Result<AiProviderPublic, AppError> {
    normalize_provider_form(&mut config, Some("openai"))?;
    let db = get_db(&state).await?;
    let created = db.create_ai_provider(config).await?;
    db.get_ai_provider_public_by_id(created.id).await
}

#[tauri::command]
pub async fn ai_update_provider(
    state: State<'_, AppState>,
    id: i64,
    mut config: AiProviderForm,
) -> Result<AiProviderPublic, AppError> {
    normalize_provider_form(&mut config, None)?;
    let db = get_db(&state).await?;
    let updated = db.update_ai_provider(id, config).await?;
    db.get_ai_provider_public_by_id(updated.id).await
}

#[tauri::command]
pub async fn ai_delete_provider(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    let db = get_db(&state).await?;
    db.delete_ai_provider(id).await
}

#[tauri::command]
pub async fn ai_set_default_provider(state: State<'_, AppState>, id: i64) -> Result<(), AppError> {
    let db = get_db(&state).await?;
    db.set_default_ai_provider(id).await
}

#[tauri::command]
pub async fn ai_clear_provider_api_key(
    state: State<'_, AppState>,
    provider_type: String,
) -> Result<(), AppError> {
    let provider_type = normalize_provider_type(&provider_type)?;
    let db = get_db(&state).await?;
    db.clear_ai_provider_api_key(&provider_type).await
}