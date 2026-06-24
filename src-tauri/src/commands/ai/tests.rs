use super::{
    assemble_final_messages, ensure_provider_enabled, map_history_load_error,
    normalize_provider_type, validate_conversation_requirement,
};
use crate::ai::types::AiChatMessage;
use crate::error::AppError;

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
        normalize_provider_type("bad type!")
            .unwrap_err()
            .to_string(),
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
    let err = AppError::internal("[ERR-5002] broken");
    assert_eq!(
        map_history_load_error(42, &err).to_string(),
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