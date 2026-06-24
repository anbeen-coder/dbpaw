mod commands;
mod mysql_charset;
mod sql_builders;
#[cfg(test)]
mod tests;

pub use commands::*;
pub use mysql_charset::*;

use crate::error::AppError;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDatabasePayload {
    pub name: String,
    pub if_not_exists: Option<bool>,
    pub charset: Option<String>,
    pub collation: Option<String>,
    pub encoding: Option<String>,
    pub lc_collate: Option<String>,
    pub lc_ctype: Option<String>,
}

fn validate_database_name(raw: &str) -> Result<String, AppError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation("Database name cannot be empty"));
    }
    if trimmed.contains('\0') {
        return Err(AppError::validation("Database name contains null byte"));
    }
    if trimmed.len() > 128 {
        return Err(AppError::validation("Database name is too long (max 128)"));
    }
    Ok(trimmed.to_string())
}

fn is_safe_option_token(raw: &str) -> bool {
    !raw.is_empty()
        && raw
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.' | '@'))
}

fn normalize_option_token(opt: &Option<String>, field: &str) -> Result<Option<String>, AppError> {
    let Some(value) = opt else {
        return Ok(None);
    };
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if !is_safe_option_token(trimmed) {
        return Err(AppError::validation(format!(
            "Invalid characters in {}",
            field
        )));
    }
    Ok(Some(trimmed.to_string()))
}

fn quote_mysql_ident(ident: &str) -> String {
    format!("`{}`", ident.replace('`', "``"))
}

fn quote_clickhouse_ident(ident: &str) -> String {
    format!("`{}`", ident.replace('`', "``"))
}

fn quote_pg_ident(ident: &str) -> String {
    format!("\"{}\"", ident.replace('"', "\"\""))
}

fn quote_mssql_ident(ident: &str) -> String {
    format!("[{}]", ident.replace(']', "]]"))
}

fn quote_literal(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn quote_nliteral(value: &str) -> String {
    format!("N'{}'", value.replace('\'', "''"))
}

fn normalize_create_database_error(err: AppError, db_name: &str) -> AppError {
    let lower = err.to_string().to_lowercase();
    if lower.contains("already exists")
        || lower.contains("duplicate database")
        || lower.contains("database exists")
        || lower.contains("42p04")
        || lower.contains("2714")
    {
        return AppError::already_exists(format!("Database '{}' already exists. {}", db_name, err));
    }
    if lower.contains("permission denied")
        || lower.contains("access denied")
        || lower.contains("not authorized")
        || lower.contains("insufficient privilege")
    {
        return AppError::permission_denied(format!("{}", err));
    }
    err
}
