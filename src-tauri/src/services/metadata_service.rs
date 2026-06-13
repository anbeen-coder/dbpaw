use crate::error::AppError;
use crate::models::*;
use crate::state::AppState;

pub async fn list_tables(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<TableInfo>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move { driver.list_tables(schema).await }
    })
    .await
}

pub async fn list_routines(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<RoutineInfo>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move {
            match driver.list_routines(schema).await {
                Ok(routines) => Ok(routines),
                Err(e) => Err(e),
            }
        }
    })
    .await
}

pub async fn list_events(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<EventInfo>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move {
            match driver.list_events(schema).await {
                Ok(events) => Ok(events),
                Err(e) => Err(e),
            }
        }
    })
    .await
}

pub async fn list_sequences(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<SequenceInfo>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move {
            match driver.list_sequences(schema).await {
                Ok(sequences) => Ok(sequences),
                Err(e) => Err(e),
            }
        }
    })
    .await
}

pub async fn list_types(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<TypeInfo>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move {
            match driver.list_types(schema).await {
                Ok(types) => Ok(types),
                Err(e) => Err(e),
            }
        }
    })
    .await
}

pub async fn list_synonyms(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<SynonymInfo>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move {
            match driver.list_synonyms(schema).await {
                Ok(synonyms) => Ok(synonyms),
                Err(e) => Err(e),
            }
        }
    })
    .await
}

pub async fn list_packages(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<PackageInfo>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move {
            match driver.list_packages(schema).await {
                Ok(packages) => Ok(packages),
                Err(e) => Err(e),
            }
        }
    })
    .await
}

pub async fn get_table_structure(
    state: &AppState,
    id: i64,
    schema: String,
    table: String,
    database: Option<String>,
) -> Result<TableStructure, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        let table = table.clone();
        async move { driver.get_table_structure(schema, table).await }
    })
    .await
}

pub async fn get_table_ddl(
    state: &AppState,
    id: i64,
    schema: String,
    table: String,
    database: Option<String>,
) -> Result<String, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        let table = table.clone();
        async move { driver.get_table_ddl(schema, table).await }
    })
    .await
}

pub async fn get_routine_ddl(
    state: &AppState,
    id: i64,
    schema: String,
    routine_name: String,
    routine_type: String,
    database: Option<String>,
) -> Result<String, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        let routine_name = routine_name.clone();
        let routine_type = routine_type.clone();
        async move {
            driver
                .get_routine_ddl(schema, routine_name, routine_type)
                .await
        }
    })
    .await
}

pub async fn get_table_metadata(
    state: &AppState,
    id: i64,
    schema: String,
    table: String,
    database: Option<String>,
) -> Result<TableMetadata, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        let table = table.clone();
        async move { driver.get_table_metadata(schema, table).await }
    })
    .await
}

pub async fn get_schema_overview(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<SchemaOverview, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move { driver.get_schema_overview(schema).await }
    })
    .await
}

pub async fn get_schema_foreign_keys(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<Vec<SchemaForeignKey>, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move { driver.get_schema_foreign_keys(schema.as_deref()).await }
    })
    .await
}

pub async fn get_driver_capabilities(state: &AppState, id: i64) -> Result<u32, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, None, |driver| async move {
        Ok::<u32, AppError>(driver.capabilities().bits())
    })
    .await
}

pub async fn list_tables_by_conn(
    state: &AppState,
    id: i64,
    schema: Option<String>,
) -> Result<Vec<TableInfo>, AppError> {
    list_tables(state, id, schema, None).await
}
