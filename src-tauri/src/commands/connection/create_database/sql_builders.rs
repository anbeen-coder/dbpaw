use crate::error::AppError;

use super::{
    normalize_option_token, quote_clickhouse_ident, quote_literal, quote_mssql_ident,
    quote_mysql_ident, quote_nliteral, quote_pg_ident, CreateDatabasePayload,
};

pub(super) fn build_mysql_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    let charset = normalize_option_token(&payload.charset, "charset")?;
    let collation = normalize_option_token(&payload.collation, "collation")?;
    let mut sql = String::from("CREATE DATABASE ");
    if payload.if_not_exists.unwrap_or(true) {
        sql.push_str("IF NOT EXISTS ");
    }
    sql.push_str(&quote_mysql_ident(db_name));
    if let Some(charset) = charset {
        sql.push_str(" CHARACTER SET ");
        sql.push_str(&charset);
    }
    if let Some(collation) = collation {
        sql.push_str(" COLLATE ");
        sql.push_str(&collation);
    }
    Ok(sql)
}

pub(super) fn build_postgres_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    let encoding = normalize_option_token(&payload.encoding, "encoding")?;
    let lc_collate = normalize_option_token(&payload.lc_collate, "lc_collate")?;
    let lc_ctype = normalize_option_token(&payload.lc_ctype, "lc_ctype")?;

    let mut options = Vec::new();
    if let Some(v) = encoding {
        options.push(format!("ENCODING = {}", quote_literal(&v)));
    }
    if let Some(v) = lc_collate {
        options.push(format!("LC_COLLATE = {}", quote_literal(&v)));
    }
    if let Some(v) = lc_ctype {
        options.push(format!("LC_CTYPE = {}", quote_literal(&v)));
    }

    let mut sql = format!("CREATE DATABASE {}", quote_pg_ident(db_name));
    if !options.is_empty() {
        sql.push_str(" WITH ");
        sql.push_str(&options.join(" "));
    }
    Ok(sql)
}

pub(super) fn build_mssql_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    let collation = normalize_option_token(&payload.collation, "collation")?;
    let mut create_sql = format!("CREATE DATABASE {}", quote_mssql_ident(db_name));
    if let Some(collation) = collation {
        create_sql.push_str(" COLLATE ");
        create_sql.push_str(&collation);
    }

    if payload.if_not_exists.unwrap_or(true) {
        return Ok(format!(
            "IF DB_ID({}) IS NULL {}",
            quote_nliteral(db_name),
            create_sql
        ));
    }
    Ok(create_sql)
}

pub(super) fn build_clickhouse_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    if let Some(v) = normalize_option_token(&payload.charset, "charset")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support charset option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.collation, "collation")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support collation option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.encoding, "encoding")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support encoding option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_collate, "lc_collate")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support lc_collate option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_ctype, "lc_ctype")? {
        return Err(AppError::unsupported(format!(
            "ClickHouse create database does not support lc_ctype option: {}",
            v
        )));
    }

    let mut sql = String::from("CREATE DATABASE ");
    if payload.if_not_exists.unwrap_or(true) {
        sql.push_str("IF NOT EXISTS ");
    }
    sql.push_str(&quote_clickhouse_ident(db_name));
    Ok(sql)
}

fn quote_cql_ident(ident: &str) -> String {
    format!("\"{}\"", ident.replace('"', "\"\""))
}

pub(super) fn build_cassandra_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    if let Some(v) = normalize_option_token(&payload.charset, "charset")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support charset option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.collation, "collation")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support collation option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.encoding, "encoding")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support encoding option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_collate, "lc_collate")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support lc_collate option: {}",
            v
        )));
    }
    if let Some(v) = normalize_option_token(&payload.lc_ctype, "lc_ctype")? {
        return Err(AppError::unsupported(format!(
            "Cassandra create keyspace does not support lc_ctype option: {}",
            v
        )));
    }

    let mut sql = String::from("CREATE KEYSPACE ");
    if payload.if_not_exists.unwrap_or(true) {
        sql.push_str("IF NOT EXISTS ");
    }
    sql.push_str(&quote_cql_ident(db_name));
    sql.push_str(" WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}");
    Ok(sql)
}
