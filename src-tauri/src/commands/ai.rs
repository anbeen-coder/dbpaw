use crate::ai::types::{AiChatRequest, AiStartResponse};
use crate::models::*;
use crate::services::ai_service;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn ai_list_providers(
    state: State<'_, AppState>,
) -> Result<Vec<AiProviderPublic>, String> {
    ai_service::ai_list_providers(&state)
        .await
        .map_err(String::from)
}

pub async fn ai_list_providers_direct(state: &AppState) -> Result<Vec<AiProviderPublic>, String> {
    ai_service::ai_list_providers_direct(state)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_create_provider(
    state: State<'_, AppState>,
    config: AiProviderForm,
) -> Result<AiProviderPublic, String> {
    ai_service::ai_create_provider(&state, config)
        .await
        .map_err(String::from)
}

pub async fn ai_create_provider_direct(
    state: &AppState,
    config: AiProviderForm,
) -> Result<AiProviderPublic, String> {
    ai_service::ai_create_provider_direct(state, config)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_update_provider(
    state: State<'_, AppState>,
    id: i64,
    config: AiProviderForm,
) -> Result<AiProviderPublic, String> {
    ai_service::ai_update_provider(&state, id, config)
        .await
        .map_err(String::from)
}

pub async fn ai_update_provider_direct(
    state: &AppState,
    id: i64,
    config: AiProviderForm,
) -> Result<AiProviderPublic, String> {
    ai_service::ai_update_provider_direct(state, id, config)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_delete_provider(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    ai_service::ai_delete_provider(&state, id)
        .await
        .map_err(String::from)
}

pub async fn ai_delete_provider_direct(state: &AppState, id: i64) -> Result<(), String> {
    ai_service::ai_delete_provider_direct(state, id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_set_default_provider(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    ai_service::ai_set_default_provider(&state, id)
        .await
        .map_err(String::from)
}

pub async fn ai_set_default_provider_direct(state: &AppState, id: i64) -> Result<(), String> {
    ai_service::ai_set_default_provider_direct(state, id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_clear_provider_api_key(
    state: State<'_, AppState>,
    provider_type: String,
) -> Result<(), String> {
    ai_service::ai_clear_provider_api_key(&state, provider_type)
        .await
        .map_err(String::from)
}

pub async fn ai_clear_provider_api_key_direct(
    state: &AppState,
    provider_type: String,
) -> Result<(), String> {
    ai_service::ai_clear_provider_api_key_direct(state, provider_type)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_chat_start(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: AiChatRequest,
) -> Result<AiStartResponse, String> {
    ai_service::ai_chat_start(&app, &state, request)
        .await
        .map_err(String::from)
}

pub async fn ai_chat_start_direct(
    state: &AppState,
    request: AiChatRequest,
) -> Result<AiStartResponse, String> {
    ai_service::ai_chat_start_direct(state, request)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_chat_continue(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: AiChatRequest,
) -> Result<AiStartResponse, String> {
    ai_service::ai_chat_continue(&app, &state, request)
        .await
        .map_err(String::from)
}

pub async fn ai_chat_continue_direct(
    state: &AppState,
    request: AiChatRequest,
) -> Result<AiStartResponse, String> {
    ai_service::ai_chat_continue_direct(state, request)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_list_conversations(
    state: State<'_, AppState>,
    connection_id: Option<i64>,
    database: Option<String>,
) -> Result<Vec<AiConversation>, String> {
    ai_service::ai_list_conversations(&state, connection_id, database)
        .await
        .map_err(String::from)
}

pub async fn ai_list_conversations_direct(
    state: &AppState,
    connection_id: Option<i64>,
    database: Option<String>,
) -> Result<Vec<AiConversation>, String> {
    ai_service::ai_list_conversations_direct(state, connection_id, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_get_conversation(
    state: State<'_, AppState>,
    conversation_id: i64,
) -> Result<AiConversationDetail, String> {
    ai_service::ai_get_conversation(&state, conversation_id)
        .await
        .map_err(String::from)
}

pub async fn ai_get_conversation_direct(
    state: &AppState,
    conversation_id: i64,
) -> Result<AiConversationDetail, String> {
    ai_service::ai_get_conversation_direct(state, conversation_id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn ai_delete_conversation(
    state: State<'_, AppState>,
    conversation_id: i64,
) -> Result<(), String> {
    ai_service::ai_delete_conversation(&state, conversation_id)
        .await
        .map_err(String::from)
}

pub async fn ai_delete_conversation_direct(
    state: &AppState,
    conversation_id: i64,
) -> Result<(), String> {
    ai_service::ai_delete_conversation_direct(state, conversation_id)
        .await
        .map_err(String::from)
}

#[macro_export]
macro_rules! ai_commands {
    () => {
        $crate::commands::ai::ai_list_providers,
        $crate::commands::ai::ai_create_provider,
        $crate::commands::ai::ai_update_provider,
        $crate::commands::ai::ai_delete_provider,
        $crate::commands::ai::ai_set_default_provider,
        $crate::commands::ai::ai_clear_provider_api_key,
        $crate::commands::ai::ai_chat_start,
        $crate::commands::ai::ai_chat_continue,
        $crate::commands::ai::ai_list_conversations,
        $crate::commands::ai::ai_get_conversation,
        $crate::commands::ai::ai_delete_conversation,
    };
}
