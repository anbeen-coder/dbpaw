use crate::error::AppError;
use crate::models::AiConversation;
use crate::state::AppState;
use tauri::State;

use super::{get_db, AiConversationDetail};

#[tauri::command]
pub async fn ai_list_conversations(
    state: State<'_, AppState>,
    connection_id: Option<i64>,
    database: Option<String>,
) -> Result<Vec<AiConversation>, AppError> {
    let db = get_db(&state).await?;
    db.list_ai_conversations(connection_id, database).await
}

#[tauri::command]
pub async fn ai_get_conversation(
    state: State<'_, AppState>,
    conversation_id: i64,
) -> Result<AiConversationDetail, AppError> {
    let db = get_db(&state).await?;
    let conversation = db.get_ai_conversation(conversation_id).await?;
    let messages = db.list_ai_messages(conversation_id).await?;
    Ok(AiConversationDetail {
        conversation,
        messages,
    })
}

#[tauri::command]
pub async fn ai_delete_conversation(
    state: State<'_, AppState>,
    conversation_id: i64,
) -> Result<(), AppError> {
    let db = get_db(&state).await?;
    db.delete_ai_conversation(conversation_id).await
}