use crate::error::AppError;
use crate::state::AppState;
use std::path::PathBuf;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImportResult {
    pub success_count: i64,
    pub error_count: i64,
    pub errors: Vec<String>,
}

pub async fn export_table_data(
    state: &AppState,
    id: i64,
    schema: String,
    table: String,
    format: String,
    database: Option<String>,
) -> Result<String, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        let table = table.clone();
        let format = format.clone();
        async move {
            let data = driver
                .get_table_data(
                    schema.clone(),
                    table.clone(),
                    0,
                    10000,
                    None,
                    None,
                    None,
                    None,
                    true,
                )
                .await?;

            match format.as_str() {
                "csv" => {
                    let mut csv = String::new();
                    if let Some(first_row) = data.data.first() {
                        if let Some(obj) = first_row.as_object() {
                            let headers: Vec<String> = obj.keys().cloned().collect();
                            csv.push_str(&headers.join(","));
                            csv.push('\n');
                        }
                    }
                    for row in &data.data {
                        if let Some(obj) = row.as_object() {
                            let values: Vec<String> =
                                obj.values().map(|v| format!("{:?}", v)).collect();
                            csv.push_str(&values.join(","));
                            csv.push('\n');
                        }
                    }
                    Ok::<String, AppError>(csv)
                }
                "json" => serde_json::to_string_pretty(&data.data)
                    .map_err(|e| AppError::internal_with("JSON序列化失败", e)),
                _ => Err(AppError::unsupported(format!(
                    "不支持的导出格式: {}",
                    format
                ))),
            }
        }
    })
    .await
}

pub async fn export_database_sql(
    state: &AppState,
    id: i64,
    schema: Option<String>,
    database: Option<String>,
) -> Result<String, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let schema = schema.clone();
        async move {
            let tables = driver.list_tables(schema.clone()).await?;
            let mut sql = String::new();

            for table in &tables {
                let ddl = driver
                    .get_table_ddl(table.schema.clone(), table.name.clone())
                    .await?;
                sql.push_str(&ddl);
                sql.push_str(";\n\n");
            }

            Ok::<String, AppError>(sql)
        }
    })
    .await
}

pub async fn export_query_result(
    state: &AppState,
    id: i64,
    sql: String,
    format: String,
    database: Option<String>,
) -> Result<String, AppError> {
    crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
        let sql = sql.clone();
        let format = format.clone();
        async move {
            let result = driver.execute_query(sql).await?;

            match format.as_str() {
                "csv" => {
                    let mut csv = String::new();
                    if let Some(first_row) = result.data.first() {
                        if let Some(obj) = first_row.as_object() {
                            let headers: Vec<String> = obj.keys().cloned().collect();
                            csv.push_str(&headers.join(","));
                            csv.push('\n');
                        }
                    }
                    for row in &result.data {
                        if let Some(obj) = row.as_object() {
                            let values: Vec<String> =
                                obj.values().map(|v| format!("{:?}", v)).collect();
                            csv.push_str(&values.join(","));
                            csv.push('\n');
                        }
                    }
                    Ok::<String, AppError>(csv)
                }
                "json" => serde_json::to_string_pretty(&result.data)
                    .map_err(|e| AppError::internal_with("JSON序列化失败", e)),
                _ => Err(AppError::unsupported(format!(
                    "不支持的导出格式: {}",
                    format
                ))),
            }
        }
    })
    .await
}

pub async fn import_sql_file(
    state: &AppState,
    id: i64,
    file_path: String,
    database: Option<String>,
) -> Result<ImportResult, AppError> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(AppError::not_found(format!("文件不存在: {}", file_path)));
    }

    let content =
        std::fs::read_to_string(&path).map_err(|e| AppError::internal_with("读取文件失败", e))?;

    let statements: Vec<String> = content
        .split(';')
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.trim().to_string())
        .collect();

    let (success_count, error_count, errors) =
        crate::commands::execute_with_retry_from_app_state(state, id, database, |driver| {
            let statements = statements.clone();
            async move {
                let mut success = 0i64;
                let mut fail = 0i64;
                let mut errs = Vec::new();
                for (i, statement) in statements.iter().enumerate() {
                    match driver.execute_query(statement.clone()).await {
                        Ok(_) => success += 1,
                        Err(e) => {
                            fail += 1;
                            errs.push(format!("Statement {}: {}", i + 1, e));
                        }
                    }
                }
                Ok::<(i64, i64, Vec<String>), AppError>((success, fail, errs))
            }
        })
        .await?;

    Ok(ImportResult {
        success_count,
        error_count,
        errors,
    })
}
