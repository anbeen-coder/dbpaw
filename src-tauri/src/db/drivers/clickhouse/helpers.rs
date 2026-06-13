use super::super::DriverResult;
use crate::error::AppError;
use serde_json::Value;

pub fn quote_ident(ident: &str) -> String {
    format!("`{}`", ident.replace('`', "``"))
}

pub fn quote_literal(value: &str) -> String {
    format!("'{}'", value.replace('\\', "\\\\").replace('\'', "\\'"))
}

pub fn table_ref(schema: &str, table: &str) -> String {
    let schema = schema.trim();
    if schema.is_empty() {
        quote_ident(table)
    } else {
        format!("{}.{}", quote_ident(schema), quote_ident(table))
    }
}

pub fn trim_trailing_semicolon(sql: &str) -> &str {
    let trimmed = sql.trim();
    trimmed.trim_end_matches(';').trim_end()
}

pub fn value_to_bool(v: &Value) -> bool {
    match v {
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
        Value::String(s) => {
            let s = s.trim().to_ascii_lowercase();
            s == "1" || s == "true" || s == "yes"
        }
        _ => false,
    }
}

pub fn value_to_i64(v: &Value) -> Option<i64> {
    match v {
        Value::Number(n) => n.as_i64(),
        Value::String(s) => s.parse::<i64>().ok(),
        _ => None,
    }
}

pub fn value_to_string(v: &Value) -> Option<String> {
    match v {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        Value::Bool(b) => Some(if *b {
            "true".to_string()
        } else {
            "false".to_string()
        }),
        _ => None,
    }
}

pub fn required_i64_from_json_row(
    row: Option<&Value>,
    key: &str,
    context_sql: &str,
) -> DriverResult<i64> {
    let value = row.and_then(|v| v.get(key)).ok_or_else(|| {
        AppError::query_failed(format!(
            "Missing '{}' in response for SQL: {}",
            key, context_sql
        ))
    })?;
    value_to_i64(value).ok_or_else(|| {
        AppError::query_failed(format!(
            "Invalid '{}' value {:?} for SQL: {}",
            key, value, context_sql
        ))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quote_ident_escapes_backticks() {
        assert_eq!(quote_ident("table`name"), "`table``name`");
    }

    #[test]
    fn quote_literal_escapes_quotes() {
        assert_eq!(quote_literal("it's"), "'it\\'s'");
    }

    #[test]
    fn table_ref_quotes_schema_and_table() {
        assert_eq!(table_ref("analytics", "events"), "`analytics`.`events`");
        assert_eq!(table_ref("", "events"), "`events`");
    }

    #[test]
    fn value_to_bool_converts_correctly() {
        assert_eq!(value_to_bool(&Value::Bool(true)), true);
        assert_eq!(value_to_bool(&Value::Number(1.into())), true);
        assert_eq!(value_to_bool(&Value::String("true".to_string())), true);
        assert_eq!(value_to_bool(&Value::String("false".to_string())), false);
    }

    #[test]
    fn value_to_i64_converts_correctly() {
        assert_eq!(value_to_i64(&Value::Number(42.into())), Some(42));
        assert_eq!(value_to_i64(&Value::String("42".to_string())), Some(42));
        assert_eq!(value_to_i64(&Value::String("abc".to_string())), None);
    }

    #[test]
    fn required_i64_from_json_row_errors_on_missing() {
        let row = serde_json::json!({ "total": "abc" });
        let invalid = required_i64_from_json_row(Some(&row), "total", "SELECT count()");
        assert!(invalid.is_err());

        let missing = required_i64_from_json_row(None, "total", "SELECT count()");
        assert!(missing.is_err());
    }
}
