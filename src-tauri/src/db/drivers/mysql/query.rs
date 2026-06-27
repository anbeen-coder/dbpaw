use crate::error::AppError;
use crate::models::{QueryColumn, QueryResult, SingleResultSet};
use rust_decimal::Decimal;
use sqlx::{Column, Executor, Row, TypeInfo};
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
use tokio::sync::Mutex;

fn query_error(message: impl Into<String>) -> AppError {
    AppError::query_failed(message)
}

type MysqlQueryThreadRegistry = HashMap<String, u64>;

fn mysql_query_threads() -> &'static Mutex<MysqlQueryThreadRegistry> {
    static REGISTRY: OnceLock<Mutex<MysqlQueryThreadRegistry>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

async fn register_mysql_query_thread(query_id: &str, thread_id: u64) {
    let mut guard = mysql_query_threads().lock().await;
    guard.insert(query_id.to_string(), thread_id);
}

async fn unregister_mysql_query_thread(query_id: &str) {
    let mut guard = mysql_query_threads().lock().await;
    guard.remove(query_id);
}

async fn lookup_mysql_query_thread(query_id: &str) -> Option<u64> {
    let guard = mysql_query_threads().lock().await;
    guard.get(query_id).copied()
}

fn decode_mysql_text_cell(row: &sqlx::mysql::MySqlRow, idx: usize) -> Result<String, AppError> {
    if let Ok(v) = row.try_get::<String, _>(idx) {
        return Ok(v);
    }
    if let Ok(v) = row.try_get::<Vec<u8>, _>(idx) {
        return Ok(String::from_utf8_lossy(&v).to_string());
    }
    Err(query_error(format!(
        "Failed to decode MySQL text column at index {idx}"
    )))
}

fn decode_mysql_optional_text_cell(
    row: &sqlx::mysql::MySqlRow,
    idx: usize,
) -> Result<Option<String>, AppError> {
    if let Ok(v) = row.try_get::<Option<String>, _>(idx) {
        return Ok(v);
    }
    if let Ok(v) = row.try_get::<Option<Vec<u8>>, _>(idx) {
        return Ok(v.map(|b| String::from_utf8_lossy(&b).to_string()));
    }
    if let Ok(v) = row.try_get::<String, _>(idx) {
        return Ok(Some(v));
    }
    if let Ok(v) = row.try_get::<Vec<u8>, _>(idx) {
        return Ok(Some(String::from_utf8_lossy(&v).to_string()));
    }
    Err(query_error(format!(
        "Failed to decode MySQL optional text column at index {idx}"
    )))
}

fn quote_mysql_ident(ident: &str) -> String {
    format!("`{}`", ident.replace('`', "``"))
}

fn quote_mysql_json_key(key: &str) -> String {
    format!("'{}'", key.replace('\'', "''"))
}

fn quote_mysql_string_literal(value: &str) -> String {
    format!("'{}'", value.replace('\\', "\\\\").replace('\'', "''"))
}

fn render_mysql_query_with_str_params(sql: &str, params: &[&str]) -> Result<String, AppError> {
    let mut rendered = String::with_capacity(sql.len() + params.len() * 16);
    let mut parts = sql.split('?');
    if let Some(first) = parts.next() {
        rendered.push_str(first);
    }

    let mut used = 0usize;
    for part in parts {
        let Some(param) = params.get(used) else {
            return Err(query_error(format!(
                "Placeholder count does not match parameter count for SQL: {}",
                sql
            )));
        };
        rendered.push_str(&quote_mysql_string_literal(param));
        rendered.push_str(part);
        used += 1;
    }

    if used != params.len() {
        return Err(query_error(format!(
            "Placeholder count does not match parameter count for SQL: {}",
            sql
        )));
    }

    Ok(rendered)
}

fn sanitize_mysql_subquery_sql(sql: &str) -> &str {
    super::super::strip_trailing_statement_terminator(sql)
}

fn build_mysql_json_projection_query(base_query: &str, json_expr: &str) -> String {
    let sanitized_base_query = sanitize_mysql_subquery_sql(base_query);
    format!(
        "SELECT {} AS __row_json FROM ({}) AS {}",
        json_expr,
        sanitized_base_query,
        quote_mysql_ident("__dbpaw_row")
    )
}

fn decode_mysql_json_cell(
    row: &sqlx::mysql::MySqlRow,
    column_name: &str,
) -> Result<serde_json::Value, AppError> {
    if let Ok(v) = row.try_get::<sqlx::types::Json<serde_json::Value>, _>(column_name) {
        return Ok(v.0);
    }
    if let Ok(v) = row.try_get::<String, _>(column_name) {
        return serde_json::from_str(&v)
            .map_err(|e| query_error(format!("Failed to parse JSON cell: {e}")));
    }
    if let Ok(v) = row.try_get::<Vec<u8>, _>(column_name) {
        return serde_json::from_slice(&v)
            .map_err(|e| query_error(format!("Failed to parse JSON bytes cell: {e}")));
    }
    Err(query_error("Failed to decode MySQL JSON cell"))
}

fn is_high_precision_mysql_column(
    column_name: &str,
    high_precision_cols: &HashSet<String>,
) -> bool {
    high_precision_cols
        .iter()
        .any(|col| col.eq_ignore_ascii_case(column_name))
}

fn decimal_to_json_number_or_string(value: Decimal) -> serde_json::Value {
    let normalized = value.normalize().to_string();
    serde_json::Number::from_f64(normalized.parse::<f64>().unwrap_or(f64::NAN))
        .map(serde_json::Value::Number)
        .unwrap_or_else(|| serde_json::Value::String(normalized))
}

fn is_mysql_booleanish_column(row: &sqlx::mysql::MySqlRow, column_name: &str) -> bool {
    use sqlx::Column;
    row.columns()
        .iter()
        .find(|c| c.name() == column_name)
        .map(|c| {
            let type_name = c.type_info().name().to_ascii_uppercase();
            // TINYINT is the only integer type that should decode as bool.
            // sqlx's bool::compatible() wrongly accepts INT/LONG/etc too,
            // so we guard here to avoid INT values like 1 becoming Bool(true).
            // TINYINT(1) maps to "BOOLEAN", other TINYINT widths to "TINYINT" or
            // "TINYINT UNSIGNED".
            type_name.starts_with("TINYINT") || type_name == "BOOLEAN"
        })
        .unwrap_or(false)
}

fn decode_mysql_cell_to_json(
    row: &sqlx::mysql::MySqlRow,
    column_name: &str,
    high_precision_cols: &HashSet<String>,
) -> serde_json::Value {
    if let Ok(v) = row.try_get::<Option<sqlx::types::Json<serde_json::Value>>, _>(column_name) {
        return v.map(|json| json.0).unwrap_or(serde_json::Value::Null);
    }
    if is_mysql_booleanish_column(row, column_name) {
        if let Ok(v) = row.try_get::<Option<bool>, _>(column_name) {
            return v
                .map(serde_json::Value::Bool)
                .unwrap_or(serde_json::Value::Null);
        }
    }
    if let Ok(v) = row.try_get::<Option<i64>, _>(column_name) {
        return match v {
            Some(value) if is_high_precision_mysql_column(column_name, high_precision_cols) => {
                serde_json::Value::String(value.to_string())
            }
            Some(value) => serde_json::Value::Number(value.into()),
            None => serde_json::Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<Option<u64>, _>(column_name) {
        return match v {
            Some(value) if is_high_precision_mysql_column(column_name, high_precision_cols) => {
                serde_json::Value::String(value.to_string())
            }
            Some(value) => serde_json::Value::Number(serde_json::Number::from(value)),
            None => serde_json::Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<Option<Decimal>, _>(column_name) {
        return match v {
            Some(value) if is_high_precision_mysql_column(column_name, high_precision_cols) => {
                serde_json::Value::String(value.normalize().to_string())
            }
            Some(value) => decimal_to_json_number_or_string(value),
            None => serde_json::Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<Option<f64>, _>(column_name) {
        return match v {
            Some(value) => serde_json::Number::from_f64(value)
                .map(serde_json::Value::Number)
                .unwrap_or(serde_json::Value::Null),
            None => serde_json::Value::Null,
        };
    }
    if let Ok(v) = row.try_get::<Option<chrono::NaiveDateTime>, _>(column_name) {
        return v
            .map(|value| serde_json::Value::String(super::super::format_naive_datetime(&value)))
            .unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<chrono::NaiveDate>, _>(column_name) {
        return v
            .map(|value| serde_json::Value::String(super::super::format_naive_date(&value)))
            .unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<chrono::NaiveTime>, _>(column_name) {
        return v
            .map(|value| serde_json::Value::String(super::super::format_naive_time(&value)))
            .unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<String>, _>(column_name) {
        return v
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<Vec<u8>>, _>(column_name) {
        return v
            .map(|bytes| serde_json::Value::String(String::from_utf8_lossy(&bytes).to_string()))
            .unwrap_or(serde_json::Value::Null);
    }

    serde_json::Value::Null
}

fn decode_mysql_rows_without_projection(
    rows: &[sqlx::mysql::MySqlRow],
    high_precision_cols: &HashSet<String>,
) -> Vec<serde_json::Value> {
    let mut data = Vec::with_capacity(rows.len());
    for row in rows {
        let mut obj = serde_json::Map::new();
        for col in row.columns() {
            let name = col.name();
            obj.insert(
                name.to_string(),
                decode_mysql_cell_to_json(row, name, high_precision_cols),
            );
        }
        data.push(serde_json::Value::Object(obj));
    }
    data
}

fn query_columns_from_rows(rows: &[sqlx::mysql::MySqlRow]) -> Vec<QueryColumn> {
    rows.first()
        .map(|row| {
            row.columns()
                .iter()
                .map(|col| QueryColumn {
                    name: col.name().to_string(),
                    r#type: col.type_info().name().to_string(),
                })
                .collect()
        })
        .unwrap_or_default()
}

fn normalize_mysql_row_json(
    row_json: &mut serde_json::Value,
    high_precision_cols: &HashSet<String>,
) -> Result<(), AppError> {
    let obj = row_json
        .as_object_mut()
        .ok_or_else(|| query_error("Expected JSON object row from JSON_OBJECT"))?;

    let mut lookup: HashMap<String, String> = HashMap::new();
    for key in obj.keys() {
        lookup.insert(key.to_ascii_lowercase(), key.clone());
    }

    for col in high_precision_cols {
        let Some(actual_key) = lookup.get(&col.to_ascii_lowercase()) else {
            continue;
        };
        let Some(value) = obj.get_mut(actual_key) else {
            continue;
        };
        if value.is_number() {
            *value = serde_json::Value::String(value.to_string());
        }
    }

    Ok(())
}

fn is_prepared_protocol_unsupported_error(err: &str) -> bool {
    let lower = err.to_ascii_lowercase();
    lower.contains("1295")
        || lower.contains("prepared statement protocol")
        || lower.contains("preparedoes not support") // PolarDB-X
        || lower.contains("only support prepare selectstmt or insertstmt now") // Doris
        || lower.contains("prepareok expected 12 bytes but got 10 bytes") // Doris/sqlx protocol mismatch
}

fn is_missing_mysql_json_object_function(err: &str) -> bool {
    let lower = err.to_ascii_lowercase();
    (lower.contains("1305")
        || lower.contains("does not exist")
        || lower.contains("unknown function"))
        && (lower.contains("json_object") || lower.contains("json object"))
}

fn should_use_mysql_json_projection(driver_name: &str) -> bool {
    !driver_name.eq_ignore_ascii_case("mariadb")
}

fn is_json_projectable_statement(sql: &str) -> bool {
    matches!(
        super::super::first_sql_keyword(sql).as_deref(),
        Some("SELECT" | "WITH")
    )
}

fn is_affected_rows_statement(sql: &str) -> bool {
    matches!(
        super::super::first_sql_keyword(sql).as_deref(),
        Some("INSERT" | "UPDATE" | "DELETE" | "REPLACE")
    )
}

pub struct MysqlQuery {
    pub pool: sqlx::MySqlPool,
    pub driver_name: String,
    pub compatibility_mode: bool,
}

impl MysqlQuery {
    fn is_compatibility_mode(&self) -> bool {
        self.compatibility_mode
    }

    async fn fetch_all_sql(&self, sql: &str) -> Result<Vec<sqlx::mysql::MySqlRow>, AppError> {
        if self.is_compatibility_mode() {
            sqlx::raw_sql(sql)
                .fetch_all(&self.pool)
                .await
                .map_err(|e| query_error(format!("SQL: {} | {}", sql, e)))
        } else {
            sqlx::query(sql)
                .fetch_all(&self.pool)
                .await
                .map_err(|e| query_error(format!("SQL: {} | {}", sql, e)))
        }
    }

    async fn execute_sql(&self, sql: &str) -> Result<sqlx::mysql::MySqlQueryResult, AppError> {
        if self.is_compatibility_mode() {
            return sqlx::raw_sql(sql)
                .execute(&self.pool)
                .await
                .map_err(|e| query_error(format!("SQL: {} | {}", sql, e)));
        }

        match sqlx::query(sql).execute(&self.pool).await {
            Ok(result) => Ok(result),
            Err(e) => {
                let error_text = e.to_string();
                if is_prepared_protocol_unsupported_error(&error_text) {
                    sqlx::raw_sql(sql)
                        .execute(&self.pool)
                        .await
                        .map_err(|raw_err| query_error(format!("SQL: {} | {}", sql, raw_err)))
                } else {
                    Err(query_error(format!("SQL: {} | {}", sql, e)))
                }
            }
        }
    }

    pub async fn describe_query_columns(&self, sql: &str) -> Result<Vec<QueryColumn>, AppError> {
        if self.is_compatibility_mode() {
            let limited_sql = format!(
                "SELECT * FROM ({}) AS {} LIMIT 0",
                sanitize_mysql_subquery_sql(sql),
                quote_mysql_ident("__dbpaw_describe")
            );
            let rows = self.fetch_all_sql(&limited_sql).await?;
            return Ok(query_columns_from_rows(&rows));
        }

        let describe = self
            .pool
            .describe(sql)
            .await
            .map_err(|e| query_error(e.to_string()))?;

        Ok(describe
            .columns()
            .iter()
            .map(|col| QueryColumn {
                name: col.name().to_string(),
                r#type: col.type_info().name().to_string(),
            })
            .collect())
    }

    async fn fetch_rows_as_json(
        &self,
        base_query: &str,
        binds: &[i64],
        json_expr: &str,
        high_precision_cols: &HashSet<String>,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let query = build_mysql_json_projection_query(base_query, json_expr);

        let mut q = sqlx::query(&query);
        for bind in binds {
            q = q.bind(*bind);
        }
        let rows = match q.fetch_all(&self.pool).await {
            Ok(rows) => rows,
            Err(e) => {
                let error_text = e.to_string();
                if is_missing_mysql_json_object_function(&error_text) {
                    return self
                        .fetch_rows_as_json_without_projection(
                            base_query,
                            binds,
                            high_precision_cols,
                        )
                        .await;
                }
                return Err(query_error(format!("SQL: {} | {}", query, e)));
            }
        };

        let mut data = Vec::with_capacity(rows.len());
        for row in rows {
            let mut row_json = decode_mysql_json_cell(&row, "__row_json")?;
            normalize_mysql_row_json(&mut row_json, high_precision_cols)?;
            data.push(row_json);
        }
        Ok(data)
    }

    async fn fetch_rows_as_json_without_projection(
        &self,
        base_query: &str,
        binds: &[i64],
        high_precision_cols: &HashSet<String>,
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let mut q = sqlx::query(base_query);
        for bind in binds {
            q = q.bind(*bind);
        }

        let rows = q
            .fetch_all(&self.pool)
            .await
            .map_err(|e| query_error(format!("SQL: {} | {}", base_query, e)))?;

        Ok(decode_mysql_rows_without_projection(
            &rows,
            high_precision_cols,
        ))
    }

    async fn execute_single_statement(
        &self,
        sql: &str,
    ) -> Result<(Vec<QueryColumn>, Vec<serde_json::Value>, i64), AppError> {
        if self.is_compatibility_mode() && is_json_projectable_statement(sql) {
            let rows = self.fetch_all_sql(sql).await?;
            let columns = query_columns_from_rows(&rows);
            let data = decode_mysql_rows_without_projection(&rows, &HashSet::new());
            let row_count = data.len() as i64;
            Ok((columns, data, row_count))
        } else if is_json_projectable_statement(sql) {
            let columns = self.describe_query_columns(sql).await?;
            let high_precision_cols: HashSet<String> = columns
                .iter()
                .filter(|col| is_high_precision_mysql_query_type(&col.r#type))
                .map(|col| col.name.clone())
                .collect();
            if !should_use_mysql_json_projection(&self.driver_name) {
                let data = self
                    .fetch_rows_as_json_without_projection(sql, &[], &high_precision_cols)
                    .await?;
                let row_count = data.len() as i64;
                return Ok((columns, data, row_count));
            }
            let query_columns: Vec<(String, String)> = columns
                .iter()
                .map(|col| (col.name.clone(), col.r#type.clone()))
                .collect();
            let json_expr = build_mysql_json_object_expr(&query_columns, Some("__dbpaw_row"));
            let data = self
                .fetch_rows_as_json(sql, &[], &json_expr, &high_precision_cols)
                .await?;
            let row_count = data.len() as i64;
            Ok((columns, data, row_count))
        } else if is_affected_rows_statement(sql) {
            let result = self.execute_sql(sql).await?;
            Ok((Vec::new(), Vec::new(), result.rows_affected() as i64))
        } else {
            let mut executed_with_raw_sql = false;
            let rows = match sqlx::query(sql).fetch_all(&self.pool).await {
                Ok(rows) => rows,
                Err(e) => {
                    let error_text = e.to_string();
                    if is_prepared_protocol_unsupported_error(&error_text) {
                        sqlx::raw_sql(sql)
                            .execute(&self.pool)
                            .await
                            .map_err(|raw_err| query_error(raw_err.to_string()))?;
                        executed_with_raw_sql = true;
                        Vec::new()
                    } else {
                        return Err(query_error(e.to_string()));
                    }
                }
            };
            let columns = if let Some(first_row) = rows.first() {
                first_row
                    .columns()
                    .iter()
                    .map(|col| QueryColumn {
                        name: col.name().to_string(),
                        r#type: col.type_info().to_string(),
                    })
                    .collect()
            } else if executed_with_raw_sql {
                Vec::new()
            } else {
                self.describe_query_columns(sql).await?
            };
            let mut data = Vec::new();
            for row in &rows {
                let mut obj = serde_json::Map::new();
                for col in row.columns() {
                    let name = col.name();
                    if let Ok(v) = row.try_get::<String, _>(name) {
                        obj.insert(name.to_string(), serde_json::Value::String(v));
                    } else if let Ok(v) = row.try_get::<Vec<u8>, _>(name) {
                        obj.insert(
                            name.to_string(),
                            serde_json::Value::String(String::from_utf8_lossy(&v).to_string()),
                        );
                    } else {
                        obj.insert(name.to_string(), serde_json::Value::Null);
                    }
                }
                data.push(serde_json::Value::Object(obj));
            }
            let row_count = rows.len() as i64;
            Ok((columns, data, row_count))
        }
    }

    pub async fn execute_query(&self, sql: String) -> Result<QueryResult, AppError> {
        let start = std::time::Instant::now();
        let statements = super::super::split_sql_statements(&sql);
        if statements.is_empty() {
            return Err(query_error("Empty SQL statement"));
        }

        // Single statement: keep original behavior
        if statements.len() == 1 {
            let last_sql = statements.last().unwrap();
            let (columns, data, row_count) = self.execute_single_statement(last_sql).await?;
            let duration = start.elapsed();
            return Ok(QueryResult {
                data,
                row_count,
                columns,
                time_taken_ms: duration.as_millis() as i64,
                success: true,
                error: None,
                result_sets: None,
            });
        }

        // Multiple statements: execute each and collect results
        let mut result_sets = Vec::new();
        let mut last_error: Option<String> = None;

        for (idx, statement) in statements.iter().enumerate() {
            match self.execute_single_statement(statement).await {
                Ok((columns, data, row_count)) => {
                    result_sets.push(SingleResultSet {
                        data,
                        row_count,
                        columns,
                        index: idx as u32,
                        statement: statement.clone(),
                    });
                }
                Err(e) => {
                    last_error = Some(e.to_string());
                    break;
                }
            }
        }

        let duration = start.elapsed();

        if let Some(err) = last_error {
            // Partial success: return collected results + error
            return Ok(QueryResult {
                data: vec![],
                row_count: 0,
                columns: vec![],
                time_taken_ms: duration.as_millis() as i64,
                success: false,
                error: Some(err),
                result_sets: Some(result_sets),
            });
        }

        // All succeeded
        Ok(QueryResult {
            data: vec![],
            row_count: 0,
            columns: vec![],
            time_taken_ms: duration.as_millis() as i64,
            success: true,
            error: None,
            result_sets: Some(result_sets),
        })
    }

    pub async fn execute_query_with_id(
        &self,
        sql: String,
        query_id: Option<&str>,
    ) -> Result<QueryResult, AppError> {
        if query_id.is_none() {
            return self.execute_query(sql).await;
        }

        let query_id = query_id.unwrap();
        let thread_id: u64 = sqlx::query_scalar("SELECT CONNECTION_ID()")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| query_error(format!("Failed to get connection id: {e}")))?;

        register_mysql_query_thread(query_id, thread_id).await;

        let result = self.execute_query(sql).await;

        unregister_mysql_query_thread(query_id).await;
        result
    }

    pub async fn kill_query(&self, thread_id: u64) -> Result<(), AppError> {
        let sql = format!("KILL QUERY {}", thread_id);
        self.execute_sql(&sql).await.map(|_| ())
    }

    pub async fn lookup_query_thread(query_id: &str) -> Option<u64> {
        lookup_mysql_query_thread(query_id).await
    }

    pub async fn unregister_query_thread(query_id: &str) {
        unregister_mysql_query_thread(query_id).await;
    }
}

fn is_high_precision_mysql_query_type(type_name: &str) -> bool {
    let type_name = type_name.trim().to_ascii_uppercase();
    type_name == "BIGINT" || type_name == "BIGINT UNSIGNED" || type_name.starts_with("DECIMAL")
}

fn is_high_precision_mysql_data_type(data_type: &str) -> bool {
    matches!(
        data_type.trim().to_ascii_lowercase().as_str(),
        "bigint" | "decimal" | "numeric"
    )
}

fn is_mysql_temporal_type(data_type: &str) -> bool {
    matches!(
        data_type.trim().to_ascii_lowercase().as_str(),
        "timestamp" | "datetime" | "date" | "time"
    )
}

fn build_mysql_json_object_expr(columns: &[(String, String)], table_alias: Option<&str>) -> String {
    if columns.is_empty() {
        return "JSON_OBJECT()".to_string();
    }

    let alias = table_alias.map(quote_mysql_ident);
    let mut args = Vec::with_capacity(columns.len() * 2);
    for (name, data_type) in columns {
        args.push(quote_mysql_json_key(name));
        let base_ref = if let Some(alias) = &alias {
            format!("{}.{}", alias, quote_mysql_ident(name))
        } else {
            quote_mysql_ident(name)
        };
        if is_high_precision_mysql_data_type(data_type) {
            args.push(format!("CAST({base_ref} AS CHAR)"));
        } else if is_mysql_temporal_type(data_type) {
            // MySQL's JSON_OBJECT formats timestamps with trailing .000000;
            // use DATE_FORMAT + TRIM to emit a clean representation without
            // fractional zeros.  If the column actually stores sub-second
            // precision the non-zero digits are preserved.
            args.push(format!(
                "TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM DATE_FORMAT({base_ref}, '%Y-%m-%d %H:%i:%s.%f')))"
            ));
        } else {
            args.push(base_ref);
        }
    }
    format!("JSON_OBJECT({})", args.join(", "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_json_projectable_statement() {
        assert!(is_json_projectable_statement("SELECT 1"));
        assert!(is_json_projectable_statement(
            "  WITH t AS (SELECT 1) SELECT * FROM t"
        ));
        assert!(!is_json_projectable_statement("SHOW TABLES"));
        assert!(!is_json_projectable_statement("UPDATE t SET a = 1"));
    }

    #[test]
    fn test_is_high_precision_mysql_query_type() {
        assert!(is_high_precision_mysql_query_type("BIGINT"));
        assert!(is_high_precision_mysql_query_type("BIGINT UNSIGNED"));
        assert!(is_high_precision_mysql_query_type("DECIMAL(18,2)"));
        assert!(!is_high_precision_mysql_query_type("INT"));
    }

    #[test]
    fn test_is_high_precision_mysql_data_type() {
        assert!(is_high_precision_mysql_data_type("bigint"));
        assert!(is_high_precision_mysql_data_type("DECIMAL"));
        assert!(is_high_precision_mysql_data_type("numeric"));
        assert!(!is_high_precision_mysql_data_type("int"));
        assert!(!is_high_precision_mysql_data_type("varchar"));
    }

    #[test]
    fn test_mariadb_skips_mysql_json_projection() {
        assert!(!should_use_mysql_json_projection("mariadb"));
        assert!(should_use_mysql_json_projection("mysql"));
    }

    #[test]
    fn test_normalize_mysql_row_json_stringifies_high_precision_numbers() {
        let mut row = serde_json::json!({
            "id": 9223372036854775807_i64,
            "amount": 1234.56,
            "name": "demo",
            "nullable": null
        });
        let high_precision_cols = HashSet::from(["ID".to_string(), "amount".to_string()]);

        normalize_mysql_row_json(&mut row, &high_precision_cols).unwrap();

        assert_eq!(
            row.get("id").and_then(|v| v.as_str()),
            Some("9223372036854775807")
        );
        assert_eq!(row.get("amount").and_then(|v| v.as_str()), Some("1234.56"));
        assert_eq!(row.get("name").and_then(|v| v.as_str()), Some("demo"));
        assert!(row.get("nullable").unwrap().is_null());
    }

    #[test]
    fn test_build_mysql_json_projection_query_strips_trailing_semicolon() {
        let sql = build_mysql_json_projection_query("SELECT * FROM t LIMIT 1000;", "JSON_OBJECT()");
        assert!(sql.contains("FROM (SELECT * FROM t LIMIT 1000) AS `__dbpaw_row`"));
        assert!(!sql.contains(";) AS `__dbpaw_row`"));
    }

    #[test]
    fn test_build_mysql_json_projection_query_strips_multiple_trailing_semicolons() {
        let sql = build_mysql_json_projection_query("SELECT * FROM t;;;", "JSON_OBJECT()");
        assert!(sql.contains("FROM (SELECT * FROM t) AS `__dbpaw_row`"));
        assert!(!sql.contains(";) AS `__dbpaw_row`"));
    }

    #[test]
    fn test_is_prepared_protocol_unsupported_error() {
        assert!(is_prepared_protocol_unsupported_error(
            "error returned from database: 1295 (HY000): This command is not supported in the prepared statement protocol yet"
        ));
        assert!(is_prepared_protocol_unsupported_error(
            "prepared statement protocol is unsupported"
        ));
        assert!(is_prepared_protocol_unsupported_error(
            "error returned from database: 0 (HYo00):[1b6d607a89402000][10.233.70.102:3306][polardbx]Preparedoes not support sql: SELECT 1"
        ));
        assert!(is_prepared_protocol_unsupported_error(
            "error returned from database: 1105 (HY000): errCode = 2, detailMessage = Only support prepare SelectStmt or InsertStmt now"
        ));
        assert!(!is_prepared_protocol_unsupported_error(
            "syntax error near ...",
        ));
    }

    #[test]
    fn test_is_missing_mysql_json_object_function() {
        assert!(is_missing_mysql_json_object_function(
            "error returned from database: 1305 (42000): FUNCTION JSON_OBJECT does not exist"
        ));
        assert!(is_missing_mysql_json_object_function(
            "unknown function json object"
        ));
        assert!(!is_missing_mysql_json_object_function(
            "error returned from database: 1146 (42S02): Table 'demo.missing' doesn't exist"
        ));
    }
}
