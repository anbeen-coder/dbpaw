use super::super::DriverResult;
use super::helpers::trim_trailing_semicolon;
use super::ClickHouseDriver;
use crate::error::AppError;
use crate::models::{QueryColumn, QueryResult, SingleResultSet};
use serde_json::Value;

pub fn has_format_clause(sql: &str) -> bool {
    trim_trailing_semicolon(sql)
        .to_ascii_lowercase()
        .contains(" format ")
}

pub fn is_json_format(sql: &str) -> bool {
    let lower = trim_trailing_semicolon(sql).to_ascii_lowercase();
    // Split by "format" and check if the part after it starts with whitespace + "json"
    if let Some(pos) = lower.find("format") {
        let before = &lower[..pos];
        // Ensure "format" is a separate word (preceded by whitespace or at start)
        if !before.is_empty() && !before.ends_with(|c: char| c.is_ascii_whitespace()) {
            return false;
        }
        let after = &lower[pos + 6..];
        // Must have whitespace after "format", then "json" as a separate word
        let after_trimmed = after.trim_start();
        after_trimmed.starts_with("json") && {
            let after_json = &after_trimmed[4..];
            after_json.is_empty() || after_json.starts_with(|c: char| c.is_ascii_whitespace())
        }
    } else {
        false
    }
}

pub fn ensure_json_format(sql: &str) -> String {
    if has_format_clause(sql) {
        trim_trailing_semicolon(sql).to_string()
    } else {
        format!("{} FORMAT JSON", trim_trailing_semicolon(sql))
    }
}

pub fn infer_insert_values_row_count(sql: &str) -> Option<i64> {
    let trimmed = trim_trailing_semicolon(sql);
    if !matches!(
        super::super::first_sql_keyword(trimmed).as_deref(),
        Some("INSERT")
    ) {
        return None;
    }

    let bytes = trimmed.as_bytes();
    let len = bytes.len();
    let mut i = 0;
    let mut values_pos = None;

    while i < len {
        if i + 1 < len && bytes[i] == b'-' && bytes[i + 1] == b'-' {
            i += 2;
            while i < len && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }

        if i + 1 < len && bytes[i] == b'/' && bytes[i + 1] == b'*' {
            i += 2;
            while i + 1 < len && !(bytes[i] == b'*' && bytes[i + 1] == b'/') {
                i += 1;
            }
            i = (i + 2).min(len);
            continue;
        }

        if bytes[i] == b'\'' {
            i += 1;
            while i < len {
                if bytes[i] == b'\\' {
                    i += 2;
                    continue;
                }
                if bytes[i] == b'\'' {
                    if i + 1 < len && bytes[i + 1] == b'\'' {
                        i += 2;
                        continue;
                    }
                    i += 1;
                    break;
                }
                i += 1;
            }
            continue;
        }

        if bytes[i].is_ascii_alphabetic() {
            let start = i;
            i += 1;
            while i < len && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
                i += 1;
            }
            if trimmed[start..i].eq_ignore_ascii_case("values") {
                values_pos = Some(i);
                break;
            }
            continue;
        }

        i += 1;
    }

    let mut i = values_pos?;
    let mut tuple_count = 0_i64;
    let mut paren_depth = 0_i32;
    let mut in_single_quote = false;

    while i < len {
        let b = bytes[i];

        if in_single_quote {
            if b == b'\\' {
                i += 2;
                continue;
            }
            if b == b'\'' {
                if i + 1 < len && bytes[i + 1] == b'\'' {
                    i += 2;
                    continue;
                }
                in_single_quote = false;
            }
            i += 1;
            continue;
        }

        if b == b'\'' {
            in_single_quote = true;
            i += 1;
            continue;
        }

        if b == b'(' {
            paren_depth += 1;
            if paren_depth == 1 {
                tuple_count += 1;
            }
            i += 1;
            continue;
        }

        if b == b')' {
            paren_depth -= 1;
            if paren_depth < 0 {
                return None;
            }
            i += 1;
            continue;
        }

        i += 1;
    }

    if tuple_count > 0 && paren_depth == 0 {
        Some(tuple_count)
    } else {
        None
    }
}

pub fn raw_text_to_query_result(body: String, time_taken_ms: i64) -> QueryResult {
    let trimmed = body.trim_end().to_string();
    if trimmed.is_empty() {
        return QueryResult {
            data: vec![],
            row_count: 0,
            columns: vec![],
            time_taken_ms,
            success: true,
            error: None,
            result_sets: None,
        };
    }

    let mut rows = Vec::new();
    for (idx, line) in trimmed.lines().enumerate() {
        let mut row = serde_json::Map::new();
        row.insert("line_no".to_string(), Value::from((idx + 1) as i64));
        row.insert("raw_line".to_string(), Value::String(line.to_string()));
        rows.push(Value::Object(row));
    }
    QueryResult {
        row_count: rows.len() as i64,
        data: rows,
        columns: vec![
            QueryColumn {
                name: "line_no".to_string(),
                r#type: "Int64".to_string(),
            },
            QueryColumn {
                name: "raw_line".to_string(),
                r#type: "String".to_string(),
            },
        ],
        time_taken_ms,
        success: true,
        error: None,
        result_sets: None,
    }
}

impl ClickHouseDriver {
    pub async fn execute_query(&self, sql: String) -> DriverResult<QueryResult> {
        self.execute_query_inner(sql, None).await
    }

    pub async fn execute_query_with_id(
        &self,
        sql: String,
        query_id: Option<&str>,
    ) -> DriverResult<QueryResult> {
        self.execute_query_inner(sql, query_id).await
    }

    async fn execute_query_inner(
        &self,
        sql: String,
        query_id: Option<&str>,
    ) -> DriverResult<QueryResult> {
        let start = std::time::Instant::now();
        let statements = super::super::split_sql_statements(&sql);

        if statements.is_empty() {
            return Err(AppError::query_failed("Empty SQL statement"));
        }

        if statements.len() == 1 {
            let stmt = statements.into_iter().next().unwrap();
            let result = self.execute_single_statement(&stmt, query_id).await?;
            let duration = start.elapsed();
            return Ok(QueryResult {
                data: result.data,
                row_count: result.row_count,
                columns: result.columns,
                time_taken_ms: duration.as_millis() as i64,
                success: true,
                error: None,
                result_sets: None,
            });
        }

        let mut result_sets = Vec::new();
        let mut last_error: Option<String> = None;

        for (idx, statement) in statements.iter().enumerate() {
            match self.execute_single_statement(statement, query_id).await {
                Ok(result) => {
                    result_sets.push(SingleResultSet {
                        data: result.data,
                        row_count: result.row_count,
                        columns: result.columns,
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

    async fn execute_single_statement(
        &self,
        sql: &str,
        query_id: Option<&str>,
    ) -> DriverResult<QueryResult> {
        let trimmed = sql.trim();
        if trimmed.is_empty() {
            return Err(AppError::query_failed("Empty SQL statement"));
        }

        if has_format_clause(trimmed) {
            if is_json_format(trimmed) {
                let resp = self.execute_json(trimmed, query_id).await?;
                return Ok(json_response_to_query_result(resp));
            }
            let raw = self.execute_raw(trimmed, query_id).await?;
            let mut result = raw_text_to_query_result(raw.body, 0);
            apply_affected_row_count(&mut result, raw.summary.as_ref(), trimmed);
            return Ok(result);
        }

        if is_select_like_query(trimmed) {
            let with_format = ensure_json_format(trimmed);
            let resp = self.execute_json(&with_format, query_id).await?;
            return Ok(json_response_to_query_result(resp));
        }

        let raw = self.execute_raw(trimmed, query_id).await?;
        let mut result = raw_text_to_query_result(raw.body, 0);
        apply_affected_row_count(&mut result, raw.summary.as_ref(), trimmed);
        Ok(result)
    }
}

fn apply_affected_row_count(
    result: &mut QueryResult,
    summary: Option<&super::connection::ClickHouseSummary>,
    sql: &str,
) {
    if let Some(written) = summary.and_then(|s| s.written_rows) {
        result.row_count = written;
    } else if let Some(inferred) = infer_insert_values_row_count(sql) {
        result.row_count = inferred;
    }
}

fn is_select_like_query(sql: &str) -> bool {
    match super::super::first_sql_keyword(sql).as_deref() {
        Some("SELECT") | Some("SHOW") | Some("DESCRIBE") | Some("DESC") | Some("EXPLAIN")
        | Some("WITH") => true,
        _ => false,
    }
}

fn json_response_to_query_result(resp: super::connection::ClickHouseJsonResponse) -> QueryResult {
    let columns: Vec<QueryColumn> = resp
        .meta
        .iter()
        .map(|m| QueryColumn {
            name: m.name.clone(),
            r#type: m.type_name.clone(),
        })
        .collect();
    let row_count = resp.data.len() as i64;
    QueryResult {
        data: resp.data,
        row_count,
        columns,
        time_taken_ms: 0,
        success: true,
        error: None,
        result_sets: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn has_format_clause_detects_format() {
        assert_eq!(has_format_clause("SELECT * FROM t FORMAT JSON"), true);
        assert_eq!(has_format_clause("SELECT * FROM t"), false);
    }

    #[test]
    fn is_json_format_detects_json() {
        assert_eq!(is_json_format("SELECT * FROM t FORMAT JSON"), true);
        assert_eq!(is_json_format("SELECT * FROM t FORMAT CSV"), false);
        assert_eq!(is_json_format("SELECT * FROM t"), false);
    }

    #[test]
    fn ensure_json_format_appends_only_when_missing() {
        assert_eq!(
            ensure_json_format("SELECT * FROM t"),
            "SELECT * FROM t FORMAT JSON"
        );
        assert_eq!(
            ensure_json_format("SELECT * FROM t FORMAT JSON"),
            "SELECT * FROM t FORMAT JSON"
        );
    }

    #[test]
    fn infer_insert_values_row_count_counts_top_level_tuples() {
        let sql = "INSERT INTO `default`.`events` (id, name) VALUES (1, 'alpha'), (2, 'beta')";
        assert_eq!(infer_insert_values_row_count(sql), Some(2));
    }

    #[test]
    fn infer_insert_values_row_count_ignores_parentheses_inside_values() {
        let sql = "INSERT INTO logs (id, payload) VALUES (1, 'fn(a, b)'), (2, '(nested) text')";
        assert_eq!(infer_insert_values_row_count(sql), Some(2));
    }

    #[test]
    fn infer_insert_values_row_count_returns_none_for_non_values_insert() {
        let sql = "INSERT INTO dst SELECT id, name FROM src";
        assert_eq!(infer_insert_values_row_count(sql), None);
    }

    #[test]
    fn raw_text_to_query_result_splits_lines() {
        let result = raw_text_to_query_result("a\nb\n".to_string(), 12);
        assert_eq!(result.row_count, 2);
        assert_eq!(result.columns.len(), 2);
        assert_eq!(result.data[0]["line_no"], Value::from(1));
        assert_eq!(result.data[0]["raw_line"], Value::String("a".to_string()));
        assert_eq!(result.data[1]["line_no"], Value::from(2));
        assert_eq!(result.data[1]["raw_line"], Value::String("b".to_string()));
    }

    #[test]
    fn apply_affected_row_count_prefers_summary_written_rows() {
        let mut result = raw_text_to_query_result(String::new(), 0);
        let summary = super::super::connection::ClickHouseSummary {
            written_rows: Some(3),
            ..Default::default()
        };

        apply_affected_row_count(
            &mut result,
            Some(&summary),
            "INSERT INTO events VALUES (1), (2)",
        );

        assert_eq!(result.row_count, 3);
    }

    #[test]
    fn apply_affected_row_count_falls_back_to_insert_values_count() {
        let mut result = raw_text_to_query_result(String::new(), 0);

        apply_affected_row_count(
            &mut result,
            None,
            "INSERT INTO events VALUES (1, 'alpha'), (2, 'beta')",
        );

        assert_eq!(result.row_count, 2);
    }
}
