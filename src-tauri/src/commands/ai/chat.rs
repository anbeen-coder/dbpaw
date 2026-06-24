use crate::ai::prompt::build_prompt_bundle;
use crate::ai::provider::AIProvider;
use crate::ai::types::{
    AiChatMessage, AiChatRequest, AiChunkPayload, AiColumnSummary, AiDonePayload, AiSchemaOverview,
    AiStartResponse, AiStartedPayload, AiTableSummary,
};
use crate::error::AppError;
use crate::state::AppState;
use tauri::{Emitter, State};

use super::{
    assemble_final_messages, emit_ai_error, ensure_provider_enabled, get_db, map_history_load_error,
    provider_from_model, validate_conversation_requirement,
};

#[tauri::command]
pub async fn ai_chat_start(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: AiChatRequest,
) -> Result<AiStartResponse, AppError> {
    run_chat(app, state, request, true).await
}

#[tauri::command]
pub async fn ai_chat_continue(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: AiChatRequest,
) -> Result<AiStartResponse, AppError> {
    run_chat(app, state, request, false).await
}

async fn run_chat(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: AiChatRequest,
    create_if_missing: bool,
) -> Result<AiStartResponse, AppError> {
    let db = get_db(&state).await?;

    let provider_record = if let Some(provider_id) = request.provider_id {
        match db.get_ai_provider_by_id(provider_id).await {
            Ok(provider) => provider,
            Err(_e) => {
                let msg = AppError::not_found("Selected AI provider does not exist");
                emit_ai_error(
                    &app,
                    request.request_id,
                    request.conversation_id,
                    msg.to_string(),
                );
                return Err(msg.into());
            }
        }
    } else {
        match db.get_default_ai_provider().await {
            Ok(provider) => provider,
            Err(_e) => {
                let msg = AppError::validation(
                    "No enabled AI provider is configured. Please enable one in AI Provider settings.",
                );
                emit_ai_error(
                    &app,
                    request.request_id,
                    request.conversation_id,
                    msg.to_string(),
                );
                return Err(msg.into());
            }
        }
    };

    if let Err(msg) = ensure_provider_enabled(provider_record.enabled) {
        emit_ai_error(
            &app,
            request.request_id,
            request.conversation_id,
            msg.to_string(),
        );
        return Err(msg.into());
    }

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
        emit_ai_error(&app, request.request_id, request.conversation_id, e.clone());
        return Err(AppError::ai_provider(e));
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
                super::super::ensure_connection_with_db(&state, conn_id, request.database.clone()).await?;
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
    let mut existing = match db.list_ai_messages(conversation.id).await {
        Ok(messages) => messages,
        Err(e) => {
            let client_error = map_history_load_error(conversation.id, &e);
            emit_ai_error(
                &app,
                request.request_id.clone(),
                Some(conversation.id),
                client_error.to_string(),
            );
            return Err(client_error.into());
        }
    };
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
    let response = match provider
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
        .await
    {
        Ok(r) => r,
        Err(e) => {
            emit_ai_error(&app, request.request_id, Some(conversation.id), e.clone());
            return Err(AppError::ai_provider(e));
        }
    };
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