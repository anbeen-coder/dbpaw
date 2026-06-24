use crate::error::AppError;
use std::fs;
use std::path::Path;

pub(super) const MAX_IMPORT_FILE_SIZE_BYTES: u64 = 20 * 1024 * 1024;
pub(super) const MAX_IMPORT_STATEMENTS: usize = 50_000;

#[derive(Debug, Clone)]
pub(super) struct ImportExecutionUnit {
    pub(super) sql: String,
    pub(super) batch_index: usize,
    pub(super) preview: String,
}

#[derive(Debug, Clone)]
pub(super) struct PreparedImportPlan {
    pub(super) units: Vec<ImportExecutionUnit>,
    pub(super) script_managed_transaction: bool,
}

pub(super) fn should_use_outer_import_transaction(
    normalized_driver: &str,
    import_plan: &PreparedImportPlan,
) -> bool {
    if import_plan.script_managed_transaction {
        return false;
    }

    // MSSQL imports are executed batch-by-batch through pooled connections.
    // Wrapping those batches in a separate outer transaction is not reliable in
    // the current driver model because transaction state does not persist across
    // independent execute_query calls.
    normalized_driver != "mssql"
}

pub(super) fn import_transaction_sql<'a>(
    normalized_driver: &'a str,
    original_driver: &str,
) -> Result<(&'a str, &'a str, &'a str), AppError> {
    match normalized_driver {
        "mysql" | "mariadb" | "tidb" => Ok(("START TRANSACTION", "COMMIT", "ROLLBACK")),
        "starrocks" | "doris" => Err(AppError::unsupported(format!(
            "Driver {} does not support transactional SQL import in this flow",
            original_driver
        ))),
        "postgres" | "sqlite" | "duckdb" => Ok(("BEGIN", "COMMIT", "ROLLBACK")),
        "mssql" => Ok((
            "BEGIN TRANSACTION",
            "COMMIT TRANSACTION",
            "ROLLBACK TRANSACTION",
        )),
        "oracle" => Ok(("SELECT 1 FROM DUAL", "COMMIT", "ROLLBACK")),
        "db2" => Ok(("BEGIN", "COMMIT", "ROLLBACK")),
        "clickhouse" => Err(AppError::unsupported(
            "Driver clickhouse is read-only in this import flow",
        )),
        _ => Err(AppError::unsupported(format!(
            "Driver {} is not supported for SQL import",
            original_driver
        ))),
    }
}

pub(super) fn normalize_driver_name(driver: &str) -> String {
    let normalized = driver.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "postgresql" | "pgsql" => "postgres".to_string(),
        _ => normalized,
    }
}

pub(super) fn validate_import_path(path: &Path) -> Result<(), AppError> {
    if path.as_os_str().is_empty() {
        return Err(AppError::validation("Invalid import path"));
    }
    if path.is_dir() {
        return Err(AppError::validation("Import path points to a directory"));
    }
    if !path.exists() {
        return Err(AppError::validation("Import file does not exist"));
    }
    let Some(ext) = path.extension().and_then(|v| v.to_str()) else {
        return Err(AppError::validation("Import file must use .sql extension"));
    };
    if !ext.eq_ignore_ascii_case("sql") {
        return Err(AppError::validation("Import file must use .sql extension"));
    }
    Ok(())
}

pub(super) fn validate_import_file_size(path: &Path) -> Result<(), AppError> {
    let metadata = fs::metadata(path)
        .map_err(|e| AppError::internal(format!("failed to read file metadata: {e}")))?;
    if metadata.len() > MAX_IMPORT_FILE_SIZE_BYTES {
        return Err(AppError::validation(format!(
            "file is too large (max {} bytes)",
            MAX_IMPORT_FILE_SIZE_BYTES
        )));
    }
    Ok(())
}
