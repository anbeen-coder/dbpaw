use crate::models::*;
use crate::services::metadata_service;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_tables(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<TableInfo>, String> {
    metadata_service::list_tables(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_routines(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<RoutineInfo>, String> {
    metadata_service::list_routines(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_events(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<EventInfo>, String> {
    metadata_service::list_events(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_sequences(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<SequenceInfo>, String> {
    metadata_service::list_sequences(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_types(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<TypeInfo>, String> {
    metadata_service::list_types(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_synonyms(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<SynonymInfo>, String> {
    metadata_service::list_synonyms(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_packages(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<PackageInfo>, String> {
    metadata_service::list_packages(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_table_structure(
    state: State<'_, AppState>,
    id: i64,
    schema: String,
    table: String,
    database: Option<String>,
) -> Result<TableStructure, String> {
    metadata_service::get_table_structure(&state, id, schema, table, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_table_ddl(
    state: State<'_, AppState>,
    id: i64,
    schema: String,
    table: String,
    database: Option<String>,
) -> Result<String, String> {
    metadata_service::get_table_ddl(&state, id, schema, table, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_routine_ddl(
    state: State<'_, AppState>,
    id: i64,
    schema: String,
    routine_name: String,
    routine_type: String,
    database: Option<String>,
) -> Result<String, String> {
    metadata_service::get_routine_ddl(&state, id, schema, routine_name, routine_type, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_table_metadata(
    state: State<'_, AppState>,
    id: i64,
    schema: String,
    table: String,
    database: Option<String>,
) -> Result<TableMetadata, String> {
    metadata_service::get_table_metadata(&state, id, schema, table, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_schema_overview(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<SchemaOverview, String> {
    metadata_service::get_schema_overview(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_schema_foreign_keys(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<SchemaForeignKey>, String> {
    metadata_service::get_schema_foreign_keys(&state, id, schema, database)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_driver_capabilities(
    state: State<'_, AppState>,
    id: i64,
) -> Result<u32, String> {
    metadata_service::get_driver_capabilities(&state, id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn list_tables_by_conn(
    state: State<'_, AppState>,
    id: i64,
    schema: Option<String>,
) -> Result<Vec<TableInfo>, String> {
    metadata_service::list_tables_by_conn(&state, id, schema)
        .await
        .map_err(String::from)
}
