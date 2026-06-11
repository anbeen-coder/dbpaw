use crate::ai::openai_compat::OpenAICompatProvider;
use crate::ai::prompt::build_prompt_bundle;
use crate::ai::provider::AIProvider;
use crate::ai::types::{
    AiChatMessage, AiChatRequest, AiChunkPayload, AiColumnSummary, AiDonePayload, AiErrorPayload,
    AiSchemaOverview, AiStartResponse, AiStartedPayload, AiTableSummary,
};
use crate::commands::ensure_connection_with_db_from_app_state;
use crate::error::AppError;
use crate::models::*;
use crate::state::AppState;
use tauri::Emitter;

fn normalize_provider_type(value: &str) -> Result<String, AppError> {
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

fn normalize_provider_form(
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

fn ensure_provider_enabled(enabled: bool) -> Result<(), AppError> {
    if enabled {
        Ok(())
    } else {
        Err(AppError::validation("Selected AI provider is disabled"))
    }
}

fn validate_conversation_requirement(
    conversation_id: Option<i64>,
    create_if_missing: bool,
) -> Result<(), AppError> {
    if conversation_id.is_none() && !create_if_missing {
        Err(AppError::validation("conversationId is required"))
    } else {
        Ok(())
    }
}

fn map_history_load_error(conversation_id: i64, e: &str) -> AppError {
    tracing::error!(
        conversation_id = conversation_id,
        error = e,
        "Failed to load conversation messages"
    );
    AppError::internal("Failed to load conversation history")
}

fn assemble_final_messages(
    bundle: &[AiChatMessage],
    history: &[AiChatMessage],
) -> Vec<AiChatMessage> {
    let mut final_messages = Vec::with_capacity(bundle.len() + history.len());
    final_messages.extend(bundle.iter().cloned());
    final_messages.extend(history.iter().cloned());
    final_messages
}

fn provider_from_model(p: AiProvider, api_key: String) -> OpenAICompatProvider {
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

async fn get_db(state: &AppState) -> Result<Arc<crate::db::local::LocalDb>, AppError> {
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };
    local_db.ok_or_else(|| AppError::internal("Local DB not initialized"))
}

use std::sync::Arc;

pub async fn ai_list_providers(
    state: &AppState,
) -> Result<Vec<AiProviderPublic>, AppError> {
    let db = get_db(state).await?;
    db.list_ai_providers_public().await
}

pub async fn ai_create_provider(
    state: &AppState,
    mut config: AiProviderForm,
) -> Result<AiProviderPublic, AppError> {
    normalize_provider_form(&mut config, Some("openai"))?;
    let db = get_db(state).await?;
    let created = db.create_ai_provider(config).await?;
    db.get_ai_provider_public_by_id(created.id).await
}

pub async fn ai_update_provider(
    state: &AppState,
    id: i64,
    mut config: AiProviderForm,
) -> Result<AiProviderPublic, AppError> {
    normalize_provider_form(&mut config, None)?;
    let db = get_db(state).await?;
    let updated = db.update_ai_provider(id, config).await?;
    db.get_ai_provider_public_by_id(updated.id).await
}

pub async fn ai_delete_provider(
    state: &AppState,
    id: i64,
) -> Result<(), AppError> {
    let db = get_db(state).await?;
    db.delete_ai_provider(id).await
}

pub async fn ai_set_default_provider(
    state: &AppState,
    id: i64,
) -> Result<(), AppError> {
    let db = get_db(state).await?;
    db.set_default_ai_provider(id).await
}

pub async fn ai_clear_provider_api_key(
    state: &AppState,
    provider_type: String,
) -> Result<(), AppError> {
    let provider_type = normalize_provider_type(&provider_type)?;
    let db = get_db(state).await?;
    db.clear_ai_provider_api_key(&provider_type).await
}

pub async fn ai_chat_start(
    app: &tauri::AppHandle,
    state: &AppState,
    request: AiChatRequest,
) -> Result<AiStartResponse, AppError> {
    run_chat(app, state, request, true).await
}

pub async fn ai_chat_continue(
    app: &tauri::AppHandle,
    state: &AppState,
    request: AiChatRequest,
) -> Result<AiStartResponse, AppError> {
    run_chat(app, state, request, false).await
}

async fn run_chat(
    app: &tauri::AppHandle,
    state: &AppState,
    request: AiChatRequest,
    create_if_missing: bool,
) -> Result<AiStartResponse, AppError> {
    let db = get_db(state).await?;

    let provider_record = if let Some(provider_id) = request.provider_id {
        match db.get_ai_provider_by_id(provider_id).await {
            Ok(provider) => provider,
            Err(_e) => {
                let msg = AppError::not_found("Selected AI provider does not exist");
                let _ = app.emit(
                    "ai/error",
                    AiErrorPayload {
                        request_id: request.request_id,
                        conversation_id: request.conversation_id,
                        error: msg.to_string(),
                    },
                );
                return Err(msg);
            }
        }
    } else {
        match db.get_default_ai_provider().await {
            Ok(provider) => provider,
            Err(_e) => {
                let msg = AppError::validation(
                    "No enabled AI provider is configured. Please enable one in AI Provider settings.",
                );
                let _ = app.emit(
                    "ai/error",
                    AiErrorPayload {
                        request_id: request.request_id,
                        conversation_id: request.conversation_id,
                        error: msg.to_string(),
                    },
                );
                return Err(msg);
            }
        }
    };

    ensure_provider_enabled(provider_record.enabled)?;

    validate_conversation_requirement(request.conversation_id, create_if_missing)?;

    let api_key = db
        .decrypt_ai_api_key(&provider_record.api_key)
        .map_err(|_| {
            AppError::ai_key(
                "AI provider apiKey is missing or invalid. Please re-save it in AI Provider settings.",
            )
        })?;
    let provider = provider_from_model(provider_record.clone(), api_key);
    if let Err(e) = provider.validate_config() {
        let _ = app.emit(
            "ai/error",
            AiErrorPayload {
                request_id: request.request_id,
                conversation_id: request.conversation_id,
                error: e.clone(),
            },
        );
        return Err(AppError::ai_key(e));
    }

    let conversation = match request.conversation_id {
        Some(id) => db.get_ai_conversation(id).await?,
        None if create_if_missing => {
            let title = request
                .title
                .clone()
                .unwrap_or_else(|| request.input.chars().take(36).collect());
            db.create_ai_conversation(
                title,
                request.scenario.clone(),
                request.connection_id,
                request.database.clone(),
            )
            .await?
        }
        None => unreachable!("conversation requirement should be validated before this branch"),
    };

    let user_message = db
        .create_ai_message(
            conversation.id,
            "user".to_string(),
            request.input.clone(),
            None,
            None,
            None,
            None,
            None,
        )
        .await?;

    let mut schema_override: Option<AiSchemaOverview> = None;
    let mut selection_hint = String::new();
    if let (Some(conn_id), Some(selected)) =
        (request.connection_id, request.selected_tables.as_ref())
    {
        if !selected.is_empty() {
            let driver =
                ensure_connection_with_db_from_app_state(state, conn_id, request.database.clone())
                    .await?;
            let mut tables: Vec<AiTableSummary> = Vec::new();
            for t in selected {
                let structure = driver
                    .get_table_structure(t.schema.clone(), t.name.clone())
                    .await?;
                let columns = structure
                    .columns
                    .into_iter()
                    .map(|c| AiColumnSummary {
                        name: c.name,
                        column_type: c.r#type,
                        nullable: Some(c.nullable),
                    })
                    .collect();
                tables.push(AiTableSummary {
                    schema: t.schema.clone(),
                    name: t.name.clone(),
                    columns,
                });
            }
            selection_hint = selected
                .iter()
                .map(|t| t.name.as_str())
                .collect::<Vec<_>>()
                .join(" ");
            schema_override = Some(AiSchemaOverview { tables });
        }
    }

    let input_for_prompt = if selection_hint.is_empty() {
        request.input.clone()
    } else {
        format!("{} {}", request.input, selection_hint)
    };

    let bundle = build_prompt_bundle(
        &request.scenario,
        &input_for_prompt,
        schema_override
            .as_ref()
            .or_else(|| request.schema_overview.as_ref()),
    );

    let mut history: Vec<AiChatMessage> = Vec::new();
    let mut existing = db.list_ai_messages(conversation.id).await.map_err(|e| {
        map_history_load_error(conversation.id, &e.to_string())
    })?;
    if existing.len() > 16 {
        existing = existing.split_off(existing.len() - 16);
    }
    for item in existing {
        if item.role == "user" || item.role == "assistant" {
            history.push(AiChatMessage {
                role: item.role,
                content: item.content,
            });
        }
    }

    let final_messages = assemble_final_messages(&bundle.messages, &history);

    let _ = app.emit(
        "ai/started",
        AiStartedPayload {
            request_id: request.request_id.clone(),
            conversation_id: conversation.id,
            model: provider.model.clone(),
        },
    );

    let start = std::time::Instant::now();
    let response = provider
        .chat_stream(final_messages, |piece| {
            let _ = app.emit(
                "ai/chunk",
                AiChunkPayload {
                    request_id: request.request_id.clone(),
                    conversation_id: conversation.id,
                    chunk: piece.to_string(),
                },
            );
        })
        .await?;
    let latency_ms = start.elapsed().as_millis() as i64;

    let assistant_message = db
        .create_ai_message(
            conversation.id,
            "assistant".to_string(),
            response.content.clone(),
            Some(bundle.prompt_version),
            Some(response.model.clone()),
            response.usage.as_ref().and_then(|u| u.prompt_tokens),
            response.usage.as_ref().and_then(|u| u.completion_tokens),
            Some(latency_ms),
        )
        .await?;

    let _ = db.touch_ai_conversation(conversation.id).await;

    let _ = app.emit(
        "ai/done",
        AiDonePayload {
            request_id: request.request_id,
            conversation_id: conversation.id,
            message_id: assistant_message.id,
            full_response: response.content,
            model: response.model,
            usage: response.usage,
        },
    );

    Ok(AiStartResponse {
        conversation_id: conversation.id,
        user_message_id: user_message.id,
        assistant_message_id: assistant_message.id,
    })
}

pub async fn ai_chat_start_direct(
    state: &AppState,
    request: AiChatRequest,
) -> Result<AiStartResponse, AppError> {
    run_chat_direct(state, request, true).await
}

pub async fn ai_chat_continue_direct(
    state: &AppState,
    request: AiChatRequest,
) -> Result<AiStartResponse, AppError> {
    run_chat_direct(state, request, false).await
}

async fn run_chat_direct(
    state: &AppState,
    request: AiChatRequest,
    create_if_missing: bool,
) -> Result<AiStartResponse, AppError> {
    let db = get_db(state).await?;

    let provider_record = if let Some(provider_id) = request.provider_id {
        db.get_ai_provider_by_id(provider_id).await.map_err(|_| {
            AppError::not_found("Selected AI provider does not exist")
        })?
    } else {
        db.get_default_ai_provider().await.map_err(|_| {
            AppError::validation(
                "No enabled AI provider is configured. Please enable one in AI Provider settings.",
            )
        })?
    };

    ensure_provider_enabled(provider_record.enabled)?;
    validate_conversation_requirement(request.conversation_id, create_if_missing)?;

    let api_key = db
        .decrypt_ai_api_key(&provider_record.api_key)
        .map_err(|_| {
            AppError::ai_key(
                "AI provider apiKey is missing or invalid. Please re-save it in AI Provider settings.",
            )
        })?;
    let provider = provider_from_model(provider_record.clone(), api_key);
    provider.validate_config().map_err(AppError::ai_key)?;

    let conversation = match request.conversation_id {
        Some(id) => db.get_ai_conversation(id).await?,
        None if create_if_missing => {
            let title = request
                .title
                .clone()
                .unwrap_or_else(|| request.input.chars().take(36).collect());
            db.create_ai_conversation(
                title,
                request.scenario.clone(),
                request.connection_id,
                request.database.clone(),
            )
            .await?
        }
        None => unreachable!("conversation requirement should be validated before this branch"),
    };

    let user_message = db
        .create_ai_message(
            conversation.id,
            "user".to_string(),
            request.input.clone(),
            None,
            None,
            None,
            None,
            None,
        )
        .await?;

    let mut schema_override: Option<AiSchemaOverview> = None;
    let mut selection_hint = String::new();
    if let (Some(conn_id), Some(selected)) =
        (request.connection_id, request.selected_tables.as_ref())
    {
        if !selected.is_empty() {
            let driver = ensure_connection_with_db_from_app_state(
                state,
                conn_id,
                request.database.clone(),
            )
            .await?;
            let mut tables: Vec<AiTableSummary> = Vec::new();
            for t in selected {
                let structure = driver
                    .get_table_structure(t.schema.clone(), t.name.clone())
                    .await?;
                let columns = structure
                    .columns
                    .into_iter()
                    .map(|c| AiColumnSummary {
                        name: c.name,
                        column_type: c.r#type,
                        nullable: Some(c.nullable),
                    })
                    .collect();
                tables.push(AiTableSummary {
                    schema: t.schema.clone(),
                    name: t.name.clone(),
                    columns,
                });
            }
            selection_hint = selected
                .iter()
                .map(|t| t.name.as_str())
                .collect::<Vec<_>>()
                .join(" ");
            schema_override = Some(AiSchemaOverview { tables });
        }
    }

    let input_for_prompt = if selection_hint.is_empty() {
        request.input.clone()
    } else {
        format!("{} {}", request.input, selection_hint)
    };

    let bundle = build_prompt_bundle(
        &request.scenario,
        &input_for_prompt,
        schema_override
            .as_ref()
            .or_else(|| request.schema_overview.as_ref()),
    );

    let mut history: Vec<AiChatMessage> = Vec::new();
    let mut existing = db
        .list_ai_messages(conversation.id)
        .await
        .map_err(|e| map_history_load_error(conversation.id, &e.to_string()))?;
    if existing.len() > 16 {
        existing = existing.split_off(existing.len() - 16);
    }
    for item in existing {
        if item.role == "user" || item.role == "assistant" {
            history.push(AiChatMessage {
                role: item.role,
                content: item.content,
            });
        }
    }

    let final_messages = assemble_final_messages(&bundle.messages, &history);
    let start = std::time::Instant::now();
    let response = provider.chat_stream(final_messages, |_piece| {}).await?;
    let latency_ms = start.elapsed().as_millis() as i64;

    let assistant_message = db
        .create_ai_message(
            conversation.id,
            "assistant".to_string(),
            response.content.clone(),
            Some(bundle.prompt_version),
            Some(response.model.clone()),
            response.usage.as_ref().and_then(|u| u.prompt_tokens),
            response.usage.as_ref().and_then(|u| u.completion_tokens),
            Some(latency_ms),
        )
        .await?;
    let _ = db.touch_ai_conversation(conversation.id).await;

    Ok(AiStartResponse {
        conversation_id: conversation.id,
        user_message_id: user_message.id,
        assistant_message_id: assistant_message.id,
    })
}

pub async fn ai_list_conversations(
    state: &AppState,
    connection_id: Option<i64>,
    database: Option<String>,
) -> Result<Vec<AiConversation>, AppError> {
    let db = get_db(state).await?;
    db.list_ai_conversations(connection_id, database).await
}

pub async fn ai_get_conversation(
    state: &AppState,
    id: i64,
) -> Result<AiConversationDetail, AppError> {
    let db = get_db(state).await?;
    let conversation = db.get_ai_conversation(id).await?;
    let messages = db.list_ai_messages(id).await?;
    Ok(AiConversationDetail {
        conversation,
        messages,
    })
}

pub async fn ai_delete_conversation(
    state: &AppState,
    id: i64,
) -> Result<(), AppError> {
    let db = get_db(state).await?;
    db.delete_ai_conversation(id).await
}

pub async fn ai_list_providers_direct(
    state: &AppState,
) -> Result<Vec<AiProviderPublic>, AppError> {
    ai_list_providers(state).await
}

pub async fn ai_create_provider_direct(
    state: &AppState,
    config: AiProviderForm,
) -> Result<AiProviderPublic, AppError> {
    ai_create_provider(state, config).await
}

pub async fn ai_update_provider_direct(
    state: &AppState,
    id: i64,
    config: AiProviderForm,
) -> Result<AiProviderPublic, AppError> {
    ai_update_provider(state, id, config).await
}

pub async fn ai_delete_provider_direct(
    state: &AppState,
    id: i64,
) -> Result<(), AppError> {
    ai_delete_provider(state, id).await
}

pub async fn ai_set_default_provider_direct(
    state: &AppState,
    id: i64,
) -> Result<(), AppError> {
    ai_set_default_provider(state, id).await
}

pub async fn ai_clear_provider_api_key_direct(
    state: &AppState,
    provider_type: String,
) -> Result<(), AppError> {
    ai_clear_provider_api_key(state, provider_type).await
}

pub async fn ai_list_conversations_direct(
    state: &AppState,
    connection_id: Option<i64>,
    database: Option<String>,
) -> Result<Vec<AiConversation>, AppError> {
    ai_list_conversations(state, connection_id, database).await
}

pub async fn ai_get_conversation_direct(
    state: &AppState,
    id: i64,
) -> Result<AiConversationDetail, AppError> {
    ai_get_conversation(state, id).await
}

pub async fn ai_delete_conversation_direct(
    state: &AppState,
    id: i64,
) -> Result<(), AppError> {
    ai_delete_conversation(state, id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::types::AiChatMessage;

    #[test]
    fn normalize_provider_type_rejects_empty_value() {
        assert_eq!(
            normalize_provider_type("   ").unwrap_err().to_string(),
            "[ERR-3001] providerType is required"
        );
    }

    #[test]
    fn normalize_provider_type_maps_openai_compat_to_openai() {
        assert_eq!(
            normalize_provider_type("OpenAI_Compat").unwrap(),
            "openai".to_string()
        );
    }

    #[test]
    fn normalize_provider_type_rejects_invalid_chars() {
        assert_eq!(
            normalize_provider_type("bad type!").unwrap_err().to_string(),
            "[ERR-3001] providerType has invalid format"
        );
    }

    #[test]
    fn normalize_provider_type_accepts_supported_chars() {
        assert_eq!(
            normalize_provider_type("x.y-z_1").unwrap(),
            "x.y-z_1".to_string()
        );
    }

    #[test]
    fn ensure_provider_enabled_rejects_disabled_provider() {
        assert_eq!(
            ensure_provider_enabled(false).unwrap_err().to_string(),
            "[ERR-3001] Selected AI provider is disabled"
        );
    }

    #[test]
    fn continue_requires_conversation_id() {
        assert_eq!(
            validate_conversation_requirement(None, false)
                .unwrap_err()
                .to_string(),
            "[ERR-3001] conversationId is required"
        );
    }

    #[test]
    fn history_load_error_maps_to_client_message() {
        assert_eq!(
            map_history_load_error(42, "[ERR-5002] broken").to_string(),
            "[ERR-5002] Failed to load conversation history"
        );
    }

    #[test]
    fn assemble_final_messages_keeps_context_before_history() {
        let bundle = vec![AiChatMessage {
            role: "system".to_string(),
            content: "schema".to_string(),
        }];
        let history = vec![
            AiChatMessage {
                role: "user".to_string(),
                content: "older question".to_string(),
            },
            AiChatMessage {
                role: "assistant".to_string(),
                content: "older answer".to_string(),
            },
            AiChatMessage {
                role: "user".to_string(),
                content: "latest question".to_string(),
            },
        ];

        let final_messages = assemble_final_messages(&bundle, &history);

        assert_eq!(final_messages.len(), 4);
        assert_eq!(final_messages[0].role, "system");
        assert_eq!(final_messages[1].content, "older question");
        assert_eq!(final_messages[2].content, "older answer");
        assert_eq!(final_messages[3].content, "latest question");
    }
}
