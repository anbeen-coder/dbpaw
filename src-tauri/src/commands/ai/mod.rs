pub mod chat;
pub mod conversations;
pub mod providers;
#[cfg(test)]
mod tests;

use crate::ai::openai_compat::OpenAICompatProvider;
use crate::ai::types::AiChatMessage;
use crate::error::AppError;
use crate::models::{AiConversation, AiMessage, AiProviderForm};
use crate::state::AppState;
use std::sync::Arc;
use tauri::{Emitter, State};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConversationDetail {
    pub conversation: AiConversation,
    pub messages: Vec<AiMessage>,
}

pub fn normalize_provider_type(value: &str) -> Result<String, AppError> {
    let normalized = value.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return Err(AppError::validation("providerType is required"));
    }
    if normalized == "openai_compat" {
        return Ok("openai".to_string());
    }
    if normalized
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' || ch == '.')
    {
        Ok(normalized)
    } else {
        Err(AppError::validation("providerType has invalid format"))
    }
}

pub fn normalize_provider_form(
    form: &mut AiProviderForm,
    fallback_type: Option<&str>,
) -> Result<(), AppError> {
    let raw = match form.provider_type.as_deref() {
        Some(v) => v,
        None => match fallback_type {
            Some(v) => v,
            None => return Ok(()),
        },
    };
    let normalized = normalize_provider_type(raw)?;
    form.provider_type = Some(normalized);
    Ok(())
}

pub fn ensure_provider_enabled(enabled: bool) -> Result<(), AppError> {
    if enabled {
        Ok(())
    } else {
        Err(AppError::validation("Selected AI provider is disabled"))
    }
}

pub fn validate_conversation_requirement(
    conversation_id: Option<i64>,
    create_if_missing: bool,
) -> Result<(), AppError> {
    if conversation_id.is_none() && !create_if_missing {
        Err(AppError::validation("conversationId is required"))
    } else {
        Ok(())
    }
}

pub fn map_history_load_error(conversation_id: i64, e: &AppError) -> AppError {
    tracing::error!(
        conversation_id = conversation_id,
        error = %e,
        "Failed to load conversation messages"
    );
    AppError::internal("Failed to load conversation history")
}

pub fn assemble_final_messages(
    bundle: &[AiChatMessage],
    history: &[AiChatMessage],
) -> Vec<AiChatMessage> {
    let mut final_messages = Vec::with_capacity(bundle.len() + history.len());
    final_messages.extend(bundle.iter().cloned());
    final_messages.extend(history.iter().cloned());
    final_messages
}

pub async fn get_db(state: &State<'_, AppState>) -> Result<Arc<crate::db::local::LocalDb>, AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))
}

pub fn provider_from_model(p: crate::models::AiProvider, api_key: String) -> OpenAICompatProvider {
    OpenAICompatProvider {
        name: p.name,
        base_url: p.base_url,
        api_key,
        model: p.model,
        temperature: 0.1,
        max_tokens: 2048,
        extra_json: p.extra_json,
    }
}

pub fn emit_ai_error(
    app: &tauri::AppHandle,
    request_id: String,
    conversation_id: Option<i64>,
    error: String,
) {
    let _ = app.emit(
        "ai/error",
        crate::ai::types::AiErrorPayload {
            request_id,
            conversation_id,
            error,
        },
    );
}

#[macro_export]
macro_rules! ai_commands {
    () => {
        $crate::commands::ai::providers::ai_list_providers,
        $crate::commands::ai::providers::ai_create_provider,
        $crate::commands::ai::providers::ai_update_provider,
        $crate::commands::ai::providers::ai_delete_provider,
        $crate::commands::ai::providers::ai_set_default_provider,
        $crate::commands::ai::providers::ai_clear_provider_api_key,
        $crate::commands::ai::chat::ai_chat_start,
        $crate::commands::ai::chat::ai_chat_continue,
        $crate::commands::ai::conversations::ai_list_conversations,
        $crate::commands::ai::conversations::ai_get_conversation,
        $crate::commands::ai::conversations::ai_delete_conversation,
    };
}